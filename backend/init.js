import pkg from 'pg';
import dotenv from 'dotenv';
import { eventsData } from './data.js';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupAndSeed() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 开始数据库初始化和数据导入...\n');
    
    // 设置时区为北京时间
    console.log('⏰ 设置数据库时区为北京时间 (UTC+8)...');
    await client.query("SET timezone = 'Asia/Shanghai'");
    console.log('✅ 时区已设置\n');
    
    // 开始事务
    await client.query('BEGIN');
    
    // 1. 删除旧表（如果存在）
    console.log('🗑️  清理旧表（如果存在）...');
    await client.query(`
      DROP TABLE IF EXISTS events CASCADE;
      DROP TABLE IF EXISTS locations CASCADE;
      DROP TABLE IF EXISTS cities CASCADE;
      DROP TABLE IF EXISTS troupes CASCADE;
      DROP TABLE IF EXISTS event_types CASCADE;
    `);
    console.log('✅ 旧表已清理\n');
    
    // 2. 创建维表与事实表（3NF）
    console.log('🏗️  创建 3NF 表结构...');
    await client.query(`
      CREATE TABLE event_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE
      );

      CREATE TABLE troupes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      );

      CREATE TABLE cities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      );

      CREATE TABLE locations (
        id SERIAL PRIMARY KEY,
        city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
        name VARCHAR(200) NOT NULL,
        CONSTRAINT uq_location_city UNIQUE (city_id, name)
      );

      CREATE TABLE events (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE RESTRICT,
        troupe_id INTEGER NOT NULL REFERENCES troupes(id) ON DELETE RESTRICT,
        city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
        location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
        content VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai'),
        CONSTRAINT check_date_range CHECK (date >= '2025-01-01' AND date <= '2025-12-31'),
        CONSTRAINT check_content_not_empty CHECK (content <> ''),
        CONSTRAINT check_content_len CHECK (char_length(content) <= 500)
      );

      CREATE INDEX idx_events_date ON events(date);
      CREATE INDEX idx_events_troupe ON events(troupe_id);
      CREATE INDEX idx_events_city ON events(city_id);
      CREATE INDEX idx_events_type ON events(type_id);
    `);
    console.log('✅ 3NF 表结构已创建\n');
    
    // 4. 插入数据 - 异步分片插入
    console.log('📝 插入演出数据...');
    const insertSQL = 'INSERT INTO events (date, type_id, troupe_id, city_id, location_id, content) VALUES ($1, $2, $3, $4, $5, $6)';
    
    // 预处理：提取维度去重
    const allEvents = [];
    const typeSet = new Set();
    const troupeSet = new Set();
    const citySet = new Set();
    const locationSet = new Set(); // key: city|location

    for (const [date, events] of Object.entries(eventsData)) {
      for (const event of events) {
        allEvents.push({
          date,
          type: event.type,
          troupe: event.troupe,
          city: event.city,
          location: event.location,
          content: event.content
        });
        typeSet.add(event.type || '演出');
        troupeSet.add(event.troupe);
        citySet.add(event.city);
        locationSet.add(`${event.city}||${event.location}`);
      }
    }

    // 插入维表并获取映射
    console.log('📥 插入维表数据...');

    // event_types
    await client.query(
      `INSERT INTO event_types(name)
       SELECT UNNEST($1::text[])
       ON CONFLICT (name) DO NOTHING`,
      [Array.from(typeSet)]
    );
    const typeRows = await client.query('SELECT id, name FROM event_types');
    const typeMap = new Map(typeRows.rows.map(r => [r.name, r.id]));

    // troupes
    await client.query(
      `INSERT INTO troupes(name)
       SELECT UNNEST($1::text[])
       ON CONFLICT (name) DO NOTHING`,
      [Array.from(troupeSet)]
    );
    const troupeRows = await client.query('SELECT id, name FROM troupes');
    const troupeMap = new Map(troupeRows.rows.map(r => [r.name, r.id]));

    // cities
    await client.query(
      `INSERT INTO cities(name)
       SELECT UNNEST($1::text[])
       ON CONFLICT (name) DO NOTHING`,
      [Array.from(citySet)]
    );
    const cityRows = await client.query('SELECT id, name FROM cities');
    const cityMap = new Map(cityRows.rows.map(r => [r.name, r.id]));

    // locations (depends on city)
    const locationTuples = Array.from(locationSet).map(key => {
      const [city, loc] = key.split('||');
      return [cityMap.get(city), loc];
    });
    if (locationTuples.length) {
      const cityIds = locationTuples.map(t => t[0]);
      const locNames = locationTuples.map(t => t[1]);
      await client.query(
        `INSERT INTO locations(city_id, name)
         SELECT UNNEST($1::int[]), UNNEST($2::text[])
         ON CONFLICT (city_id, name) DO NOTHING`,
        [cityIds, locNames]
      );
    }
    const locationRows = await client.query('SELECT id, city_id, name FROM locations');
    const locationMap = new Map(locationRows.rows.map(r => [`${r.city_id}||${r.name}`, r.id]));

    console.log('✅ 维表处理完成\n');

    const CHUNK_SIZE = 50; // 每个批次插入50条
    const MAX_CONCURRENT = 3; // 最多并发3个批次
    let totalInserted = 0;
    let errorCount = 0;

    // 异步分片插入函数
    async function insertChunk(events) {
      const promises = events.map(event => {
        const typeId = typeMap.get(event.type || '演出');
        const troupeId = troupeMap.get(event.troupe);
        const cityId = cityMap.get(event.city);
        const locationId = locationMap.get(`${cityId}||${event.location}`);
        return client.query(insertSQL, [
          event.date,
          typeId,
          troupeId,
          cityId,
          locationId,
          event.content
        ]).catch(error => {
          console.error(`❌ 插入失败 [${event.date} - ${event.troupe}]:`, error.message);
          throw error;
        });
      });
      
      const results = await Promise.allSettled(promises);
      let inserted = 0;
      let failed = 0;
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          inserted++;
        } else {
          failed++;
        }
      }
      
      return { inserted, failed };
    }

    // 分片处理函数
    async function processInBatches(items, chunkSize, concurrency) {
      let successful = 0;
      let failed = 0;
      
      for (let i = 0; i < items.length; i += chunkSize * concurrency) {
        const batch = [];
        for (let j = 0; j < concurrency && i + j * chunkSize < items.length; j++) {
          const chunk = items.slice(i + j * chunkSize, i + j * chunkSize + chunkSize);
          batch.push(insertChunk(chunk));
        }
        
        const results = await Promise.all(batch);
        for (const result of results) {
          successful += result.inserted;
          failed += result.failed;
          totalInserted = successful;
          
          // 每10条记录显示一次进度
          if (totalInserted % 10 === 0) {
            console.log(`   ⏳ 已插入 ${totalInserted}/${allEvents.length} 条记录 (${Math.round(totalInserted / allEvents.length * 100)}%)...`);
          }
        }
      }
      
      return { successful, failed };
    }

    const insertResult = await processInBatches(allEvents, CHUNK_SIZE, MAX_CONCURRENT);
    totalInserted = insertResult.successful;
    errorCount = insertResult.failed;
    
    console.log(`✅ 成功插入 ${totalInserted} 条记录`);
    if (errorCount > 0) {
      console.log(`⚠️  失败 ${errorCount} 条记录\n`);
    } else {
      console.log('');
    }
    
    // 5. 提交事务
    await client.query('COMMIT');
    
    // 6. 显示统计信息
    console.log('📊 数据统计信息:\n');
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT date) as total_dates,
        COUNT(DISTINCT troupe_id) as total_troupes,
        COUNT(DISTINCT city_id) as total_cities,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM events
    `);
    
    const row = stats.rows[0];
    console.log(`   📅 总演出场次: ${row.total_events}`);
    console.log(`   🗓️  演出日期数: ${row.total_dates}`);
    console.log(`   🎭 剧团数量: ${row.total_troupes}`);
    console.log(`   🏙️  城市数量: ${row.total_cities}`);
    console.log(`   📍 时间跨度: ${row.earliest_date} 至 ${row.latest_date}\n`);
    
    // 7. 各剧团统计
    console.log('🎭 各剧团演出统计:\n');
    const troupeStats = await client.query(`
      SELECT t.name as troupe, COUNT(*) as count
      FROM events e
      JOIN troupes t ON e.troupe_id = t.id
      GROUP BY t.name
      ORDER BY count DESC, t.name
    `);
    for (const row of troupeStats.rows) {
      console.log(`   ${row.troupe}: ${row.count} 场`);
    }
    
    // 8. 各城市统计
    console.log('\n🏙️  各城市演出统计:\n');
    const cityStats = await client.query(`
      SELECT c.name as city, COUNT(*) as count
      FROM events e
      JOIN cities c ON e.city_id = c.id
      GROUP BY c.name
      ORDER BY count DESC, c.name
    `);
    for (const row of cityStats.rows) {
      console.log(`   ${row.city}: ${row.count} 场`);
    }
    
    console.log('\n✨ 数据库初始化和数据导入完成！');
    console.log('\n🚀 可以开始使用 API 了：');
    console.log('   npm run dev         # 启动开发服务器');
    console.log('   npm run start       # 启动生产服务器\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ 初始化失败:', error.message);
    console.error('\n💡 排查步骤:');
    console.error('   1. 检查 .env 文件中的 DATABASE_URL 是否正确');
    console.error('   2. 确保 Neon 项目处于活跃状态');
    console.error('   3. 运行 npm run test-connection 诊断连接\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupAndSeed().catch(error => {
  console.error('致命错误:', error);
  process.exit(1);
});
