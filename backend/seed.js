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

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 开始插入演出数据...\n');
    
    // 设置时区为北京时间
    console.log('⏰ 设置数据库时区为北京时间 (UTC+8)...');
    await client.query("SET timezone = 'Asia/Shanghai'");
    console.log('✅ 时区已设置\n');
    
    // 开始事务
    await client.query('BEGIN');
    
    // 清空现有数据（可选）
    console.log('清空现有数据...');
    await client.query('DELETE FROM events');
    
    // 插入数据 - 异步分片插入
    console.log('📝 插入演出数据...');
    const insertSQL = 'INSERT INTO events (date, type, troupe, city, location, content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
    
    // 将数据转换为数组格式
    const allEvents = [];
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
      }
    }
    
    const CHUNK_SIZE = 50; // 每个批次插入50条
    const MAX_CONCURRENT = 3; // 最多并发3个批次
    let totalInserted = 0;
    const insertedIds = [];
    
    // 异步分片插入函数
    async function insertChunk(events) {
      const promises = events.map(event =>
        client.query(insertSQL, [
          event.date,
          event.type,
          event.troupe,
          event.city,
          event.location,
          event.content
        ]).then(result => result.rows[0].id)
      );
      
      return Promise.all(promises);
    }
    
    // 分片处理函数
    async function processInBatches(items, chunkSize, concurrency) {
      for (let i = 0; i < items.length; i += chunkSize * concurrency) {
        const batch = [];
        for (let j = 0; j < concurrency && i + j * chunkSize < items.length; j++) {
          const chunk = items.slice(i + j * chunkSize, i + j * chunkSize + chunkSize);
          batch.push(insertChunk(chunk));
        }
        
        const results = await Promise.all(batch);
        for (const ids of results) {
          insertedIds.push(...ids);
          totalInserted += ids.length;
          
          // 每10条记录显示一次进度
          if (totalInserted % 10 === 0) {
            console.log(`   ⏳ 已插入 ${totalInserted}/${allEvents.length} 条记录 (${Math.round(totalInserted / allEvents.length * 100)}%)...`);
          }
        }
      }
    }
    
    await processInBatches(allEvents, CHUNK_SIZE, MAX_CONCURRENT);
    
    console.log(`✅ 成功插入 ${totalInserted} 条演出记录\n`);
    
    // 提交事务
    await client.query('COMMIT');
    
    // 显示统计信息
    console.log('📊 数据库统计信息:');
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT date) as total_dates,
        COUNT(DISTINCT troupe) as total_troupes,
        COUNT(DISTINCT city) as total_cities,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM events
    `);
    
    const row = stats.rows[0];
    console.log(`   📅 总演出场次: ${row.total_events}`);
    console.log(`   🗓️  演出日期数: ${row.total_dates}`);
    console.log(`   🎭 剧团数量: ${row.total_troupes}`);
    console.log(`   🏙️  城市数量: ${row.total_cities}`);
    console.log(`   📍 时间跨度: ${row.earliest_date} 至 ${row.latest_date}`);
    
    // 显示各剧团的演出数
    console.log('\n🎭 各剧团演出统计:');
    const troupeStats = await client.query(`
      SELECT troupe, COUNT(*) as count
      FROM events
      GROUP BY troupe
      ORDER BY count DESC, troupe
    `);
    
    for (const row of troupeStats.rows) {
      console.log(`   ${row.troupe}: ${row.count} 场`);
    }
    
    // 显示各城市的演出数
    console.log('\n🏙️  各城市演出统计:');
    const cityStats = await client.query(`
      SELECT city, COUNT(*) as count
      FROM events
      GROUP BY city
      ORDER BY count DESC, city
    `);
    
    for (const row of cityStats.rows) {
      console.log(`   ${row.city}: ${row.count} 场`);
    }
    
    console.log('\n✨ 数据插入完成!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ 数据插入失败:', error.message);
    console.error('详细信息:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// 执行
seedDatabase().catch(error => {
  console.error('致命错误:', error);
  process.exit(1);
});
