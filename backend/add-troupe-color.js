import pool from './db.js';

const defaultColors = {
  '广州团': '#2f54eb',
  '佛山团': '#f5222d',
  '红豆团': '#ff4d4f',
  '省一团': '#faad14',
  '省二团': '#a0d911',
  '深圳团': '#eb2f96',
  '珠海团': '#ffc53d',
  '省院': '#fa541c',
  '大湾区': '#7b189aff',
};

async function addTroupeColorColumn() {
  const client = await pool.connect();
  try {
    console.log('🚀 开始给 troupes 表添加 color 列...\n');

    // 检查列是否已存在
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'troupes' AND column_name = 'color'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ color 列已存在，跳过添加\n');
    } else {
      // 添加 color 列
      await client.query(`
        ALTER TABLE troupes ADD COLUMN color VARCHAR(20) DEFAULT '#2f54eb'
      `);
      console.log('✅ 成功添加 color 列到 troupes 表\n');
    }

    // 为现有剧团填充默认颜色
    console.log('🎨 为现有剧团填充默认颜色...');
    const troupeRows = await client.query('SELECT id, name FROM troupes');
    let updatedCount = 0;

    for (const row of troupeRows.rows) {
      const color = defaultColors[row.name] || '#2f54eb';
      await client.query('UPDATE troupes SET color = $1 WHERE id = $2', [color, row.id]);
      updatedCount++;
      console.log(`   - ${row.name}: ${color}`);
    }

    console.log(`\n✅ 已为 ${updatedCount} 个剧团设置颜色\n`);

    // 验证
    const verifyResult = await client.query('SELECT name, color FROM troupes ORDER BY name');
    console.log('📋 当前剧团颜色配置：');
    for (const row of verifyResult.rows) {
      console.log(`   ${row.name}: ${row.color}`);
    }

    console.log('\n✨ 迁移完成！');
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addTroupeColorColumn().catch(console.error);
