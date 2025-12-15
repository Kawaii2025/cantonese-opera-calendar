import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  console.log('🔌 测试 Neon 数据库连接...\n');
  
  try {
    const client = await pool.connect();
    console.log('✅ 连接成功！\n');
    
    // 设置时区为北京时间
    await client.query("SET timezone = 'Asia/Shanghai'");
    
    // 获取当前北京时间
    const timeResult = await client.query("SELECT NOW() AT TIME ZONE 'Asia/Shanghai' as beijing_time");
    console.log(`⏰ 当前北京时间: ${timeResult.rows[0].beijing_time}\n`);
    
    // 检查表是否存在
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'events'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ events 表存在\n');
      
      // 获取表结构
      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'events'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 表结构:');
      for (const col of columns.rows) {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      }
      
      // 获取数据统计
      const stats = await client.query('SELECT COUNT(*) as count FROM events');
      console.log(`\n📊 当前记录数: ${stats.rows[0].count}`);
      
      if (stats.rows[0].count > 0) {
        // 显示最近5条记录
        const recent = await client.query(`
          SELECT id, date, type, troupe, city FROM events 
          ORDER BY id DESC 
          LIMIT 5
        `);
        
        console.log('\n📝 最近5条记录:');
        for (const row of recent.rows) {
          console.log(`   [${row.id}] ${row.date} - ${row.troupe} (${row.type}) - ${row.city}`);
        }
      }
      
    } else {
      console.log('⚠️  events 表不存在');
      console.log('   请运行: npm run migrate');
    }
    
    client.release();
    console.log('\n✨ 测试完成！');
    
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    console.error('\n💡 排查步骤:');
    console.error('   1. 检查 .env 文件中的 DATABASE_URL');
    console.error('   2. 确保 Neon 项目处于活跃状态');
    console.error('   3. 验证网络连接');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
