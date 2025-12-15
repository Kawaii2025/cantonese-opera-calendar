import pool from './db.js';

async function clearDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 检查数据库数据...\n');
    
    // 检查现有数据
    const stats = await client.query(`
      SELECT COUNT(*) as total_events
      FROM events
    `);
    
    const totalEvents = stats.rows[0].total_events;
    console.log(`📊 当前表中有 ${totalEvents} 条记录\n`);
    
    if (totalEvents === 0) {
      console.log('✅ 表已为空，无需清空\n');
      return;
    }
    
    // 清空数据
    console.log('🗑️  清空表中所有数据...');
    await client.query('DELETE FROM events');
    console.log('✅ 数据已清空\n');
    
    // 验证
    const verifyStats = await client.query(`
      SELECT COUNT(*) as total_events
      FROM events
    `);
    
    console.log(`✨ 清空完成！当前表中有 ${verifyStats.rows[0].total_events} 条记录`);
    
  } catch (error) {
    console.error('❌ 清空失败:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearDatabase().catch(console.error);
