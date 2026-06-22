import pool from './db.js';
import { eventsData } from './data.js';

// 建表SQL（北京时间配置）
const createTableSQL = `
  -- 设置数据库时区为北京时间
  SET timezone = 'Asia/Shanghai';

  -- 删除旧表（如果存在）
  DROP TABLE IF EXISTS events CASCADE;

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

  -- 创建events表
  CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    type_id INTEGER NOT NULL REFERENCES event_types(id) ON DELETE RESTRICT,
    troupe_id INTEGER NOT NULL REFERENCES troupes(id) ON DELETE RESTRICT,
    city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    content VARCHAR(500) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai'),
    CONSTRAINT check_date_range CHECK (date >= '2025-01-01' AND date <= '2025-12-31'),
    CONSTRAINT check_content_not_empty CHECK (content <> ''),
    CONSTRAINT check_content_len CHECK (char_length(content) <= 500)
  );

  -- 创建索引以提高查询性能
  CREATE INDEX idx_events_date ON events(date);
  CREATE INDEX idx_events_troupe ON events(troupe_id);
  CREATE INDEX idx_events_city ON events(city_id);
  CREATE INDEX idx_events_type ON events(type_id);
`;

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('开始数据库迁移...\n');
    
    // 设置时区为北京时间
    console.log('⏰ 设置数据库时区为北京时间 (UTC+8)...');
    await client.query("SET timezone = 'Asia/Shanghai'");
    console.log('✅ 时区已设置\n');
    
    // 开始事务
    await client.query('BEGIN');
    
    // 创建表
    console.log('1. 创建表结构...');
    await client.query(createTableSQL);
    console.log('✓ 表结构创建成功\n');
    
    // 预处理：提取维度去重
    console.log('2. 导入演出数据...');
    const insertSQL = 'INSERT INTO events (date, type_id, troupe_id, city_id, location_id, content, details) VALUES ($1, $2, $3, $4, $5, $6, $7)';

    const allEvents = [];
    const typeSet = new Set();
    const troupeSet = new Set();
    const citySet = new Set();
    const locationSet = new Set();

    for (const [date, events] of Object.entries(eventsData)) {
      for (const event of events) {
        allEvents.push({
          date,
          type: event.type,
          troupe: event.troupe,
          city: event.city,
          location: event.location,
          content: event.content,
          details: event.details || null
        });
        typeSet.add(event.type || '演出');
        troupeSet.add(event.troupe);
        citySet.add(event.city);
        locationSet.add(`${event.city}||${event.location}`);
      }
    }

    // 插入维表并获取映射
    console.log('📥 插入维表数据...');
    await client.query(
      `INSERT INTO event_types(name)
       SELECT UNNEST($1::text[])
       ON CONFLICT (name) DO NOTHING`,
      [Array.from(typeSet)]
    );
    const typeRows = await client.query('SELECT id, name FROM event_types');
    const typeMap = new Map(typeRows.rows.map(r => [r.name, r.id]));

    await client.query(
      `INSERT INTO troupes(name)
       SELECT UNNEST($1::text[])
       ON CONFLICT (name) DO NOTHING`,
      [Array.from(troupeSet)]
    );
    const troupeRows = await client.query('SELECT id, name FROM troupes');
    const troupeMap = new Map(troupeRows.rows.map(r => [r.name, r.id]));

    await client.query(
      `INSERT INTO cities(name)
       SELECT UNNEST($1::text[])
       ON CONFLICT (name) DO NOTHING`,
      [Array.from(citySet)]
    );
    const cityRows = await client.query('SELECT id, name FROM cities');
    const cityMap = new Map(cityRows.rows.map(r => [r.name, r.id]));

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
          event.content,
          event.details
        ]).catch(error => {
          console.error(`❌ 导入失败 [${event.date} - ${event.troupe}]:`, error.message);
          throw error;
        });
      });
      const results = await Promise.allSettled(promises);
      let inserted = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') inserted++;
      }
      return inserted;
    }

    async function processInBatches(items, chunkSize, concurrency) {
      let successful = 0;
      for (let i = 0; i < items.length; i += chunkSize * concurrency) {
        const batch = [];
        for (let j = 0; j < concurrency && i + j * chunkSize < items.length; j++) {
          const chunk = items.slice(i + j * chunkSize, i + j * chunkSize + chunkSize);
          batch.push(insertChunk(chunk));
        }
        const results = await Promise.all(batch);
        for (const count of results) {
          successful += count;
          totalInserted = successful;
          if (totalInserted % 10 === 0) {
            console.log(`   ⏳ 已导入 ${totalInserted}/${allEvents.length} 条记录 (${Math.round(totalInserted / allEvents.length * 100)}%)...`);
          }
        }
      }
      return successful;
    }

    totalInserted = await processInBatches(allEvents, CHUNK_SIZE, MAX_CONCURRENT);
    
    console.log(`✓ 成功导入 ${totalInserted} 条演出记录\n`);
    
    // 提交事务
    await client.query('COMMIT');
    
    // 显示统计信息
    console.log('3. 数据库统计信息:');
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT date) as total_dates,
        COUNT(DISTINCT troupe) as total_troupes,
        COUNT(DISTINCT city) as total_cities
      FROM events
    `);
    
    const { total_events, total_dates, total_troupes, total_cities } = stats.rows[0];
    console.log(`   - 总演出场次: ${total_events}`);
    console.log(`   - 演出日期数: ${total_dates}`);
    console.log(`   - 剧团数量: ${total_troupes}`);
    console.log(`   - 城市数量: ${total_cities}`);
    
    console.log('\n✅ 数据库迁移完成!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ 迁移失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
