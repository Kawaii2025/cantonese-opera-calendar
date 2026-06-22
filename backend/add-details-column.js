import pool from './db.js';

async function addDetailsColumn() {
  const client = await pool.connect();
  try {
    console.log('🚀 开始添加 details 列到 events 表...\n');

    // 检查列是否已存在
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'details'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ details 列已存在，无需添加\n');
    } else {
      // 添加 details 列
      await client.query(`
        ALTER TABLE events ADD COLUMN details TEXT
      `);
      console.log('✅ 成功添加 details 列到 events 表\n');
    }

    // 验证
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'events' AND column_name = 'details'
    `);
    if (verifyResult.rows.length > 0) {
      const col = verifyResult.rows[0];
      console.log(`📋 列信息: name=${col.column_name}, type=${col.data_type}, nullable=${col.is_nullable}\n`);
    }

    console.log('✨ 迁移完成！');
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addDetailsColumn().catch(console.error);
