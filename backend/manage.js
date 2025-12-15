import pool from './db.js';
import { eventsData } from './data.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function checkDataStatus() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT COUNT(*) as count FROM events');
    return result.rows[0].count;
  } finally {
    client.release();
  }
}

async function clearData() {
  const client = await pool.connect();
  try {
    console.log('🗑️  清空数据中...');
    await client.query('DELETE FROM events');
    console.log('✅ 数据已清空\n');
  } finally {
    client.release();
  }
}

async function insertData() {
  const client = await pool.connect();
  
  try {
    console.log('⏰ 设置数据库时区为北京时间 (UTC+8)...');
    await client.query("SET timezone = 'Asia/Shanghai'");
    
    await client.query('BEGIN');
    
    console.log('📝 插入演出数据...\n');
    const insertSQL = 'INSERT INTO events (date, type, troupe, city, location, content) VALUES ($1, $2, $3, $4, $5, $6)';
    
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
    
    const CHUNK_SIZE = 50;
    const MAX_CONCURRENT = 3;
    let totalInserted = 0;
    let errorCount = 0;
    
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
        ]).catch(error => {
          console.error(`❌ 插入失败 [${event.date} - ${event.troupe}]:`, error.message);
          throw error;
        })
      );
      
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
    
    console.log(`\n✅ 成功插入 ${totalInserted} 条记录`);
    if (errorCount > 0) {
      console.log(`⚠️  失败 ${errorCount} 条记录\n`);
    } else {
      console.log('');
    }
    
    await client.query('COMMIT');
    
    // 显示统计信息
    console.log('📊 数据统计信息:\n');
    
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
    console.log(`   📍 时间跨度: ${row.earliest_date} 至 ${row.latest_date}\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🎭 广东粤剧日历 - 数据管理工具\n');
    
    const currentCount = await checkDataStatus();
    console.log(`📊 当前表中有 ${currentCount} 条记录\n`);
    
    if (currentCount > 0) {
      const answer = await question('✓ 表中已有数据，要清空并重新插入吗? (yes/no): ');
      
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        await clearData();
        await insertData();
        console.log('✨ 完成！');
      } else {
        console.log('已取消操作');
      }
    } else {
      console.log('✓ 表为空，开始插入数据...\n');
      await insertData();
      console.log('✨ 完成！');
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    rl.close();
  }
}

main().catch(console.error);
