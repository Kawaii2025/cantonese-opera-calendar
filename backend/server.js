import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(url => url.trim())
  : [
      'http://localhost:5173',      // Vite dev server default
      'http://localhost:3000',      // Alternative frontend port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];

const corsOptions = {
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Debug middleware to log CORS origins and request details
/* 
app.use((req, res, next) => {
  console.log("ENV CORS Origins:", process.env.CORS_ORIGINS);
  console.log("CORS Origins:", corsOptions.origin);
  console.log({
    method: req.method,
    origin: req.headers.origin,
    path: req.path
  });

  next();
});
*/

app.use(cors(corsOptions));
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`\n📥 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (Object.keys(req.params).length > 0) {
    console.log(`   Params:`, req.params);
  }
  if (Object.keys(req.query).length > 0) {
    console.log(`   Query:`, req.query);
  }
  next();
});

// 自动检查并添加数据库中缺失的列（向后兼容）
async function autoMigrate() {
  // 旧的静态颜色映射（用于迁移时填充已有剧团）
  const defaultTroupeColors = {
    '广州团': '#2f54eb',
    '佛山团': '#f5222d',
    '红豆团': '#ff4d4f',
    '省一团': '#faad14',
    '省二团': '#a0d911',
    '深圳团': '#eb2f96',
    '珠海团': '#ffc53d',
    '省院': '#fa541c',
    '大湾区': '#7b189a',
  };

  try {
    // 1. 检查 troupes.color 列
    const colorCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'troupes' AND column_name = 'color'
    `);
    if (colorCheck.rows.length === 0) {
      console.log('🔧 [Auto-Migrate] troupes 表缺少 color 列，添加中...');
      await pool.query(`ALTER TABLE troupes ADD COLUMN color VARCHAR(20) DEFAULT '#2f54eb'`);
      console.log('✅ [Auto-Migrate] 已添加 color 列');
    }

    // 2. 为已有剧团填充默认颜色（只更新 color 为默认值或 null 的记录）
    try {
      const existingTroupes = await pool.query('SELECT id, name, color FROM troupes');
      let updatedCount = 0;
      for (const row of existingTroupes.rows) {
        const presetColor = defaultTroupeColors[row.name];
        // 如果该剧团有预设颜色，且当前 color 是默认值或空，则更新
        if (presetColor && (row.color === '#2f54eb' || !row.color)) {
          await pool.query('UPDATE troupes SET color = $1 WHERE id = $2', [presetColor, row.id]);
          updatedCount++;
        }
      }
      if (updatedCount > 0) {
        console.log(`✅ [Auto-Migrate] 已为 ${updatedCount} 个剧团填充预设颜色`);
      }
    } catch (e) {
      console.log('⚠️ [Auto-Migrate] 跳过颜色填充（可能已是自定义颜色）:', e.message);
    }

    // 3. 检查 events.details 列
    const detailsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'details'
    `);
    if (detailsCheck.rows.length === 0) {
      console.log('🔧 [Auto-Migrate] events 表缺少 details 列，添加中...');
      await pool.query(`ALTER TABLE events ADD COLUMN details TEXT`);
      console.log('✅ [Auto-Migrate] 已添加 details 列');
    }

    console.log('✅ [Auto-Migrate] 数据库迁移检查完成');
  } catch (error) {
    console.error('❌ [Auto-Migrate] 自动迁移失败:', error.message);
  }
}

// 公用选择列（ 3NF 联表，返回名字而非 id）
const eventSelect = `
  SELECT 
    e.id,
    e.date,
    EXTRACT(EPOCH FROM e.date)::INT AS date_timestamp,
    et.name AS type,
    t.name AS troupe,
    COALESCE(t.color, '#2f54eb') AS troupe_color,
    c.name AS city,
    l.name AS location,
    e.content,
    e.details,
    e.created_at AT TIME ZONE 'Asia/Shanghai' AS created_at,
    EXTRACT(EPOCH FROM e.created_at AT TIME ZONE 'Asia/Shanghai')::INT AS created_at_timestamp
  FROM events e
  JOIN event_types et ON e.type_id = et.id
  JOIN troupes t ON e.troupe_id = t.id
  JOIN cities c ON e.city_id = c.id
  JOIN locations l ON e.location_id = l.id
`;

async function resolveIds({ type, troupe, city, location }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const typeId = (await client.query(
      `INSERT INTO event_types(name) VALUES ($1)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      [type]
    )).rows[0]?.id || (await client.query('SELECT id FROM event_types WHERE name=$1', [type])).rows[0].id;

    const troupeId = (await client.query(
      `INSERT INTO troupes(name) VALUES ($1)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      [troupe]
    )).rows[0]?.id || (await client.query('SELECT id FROM troupes WHERE name=$1', [troupe])).rows[0].id;

    const cityId = (await client.query(
      `INSERT INTO cities(name) VALUES ($1)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      [city]
    )).rows[0]?.id || (await client.query('SELECT id FROM cities WHERE name=$1', [city])).rows[0].id;

    const locationId = (await client.query(
      `INSERT INTO locations(city_id, name) VALUES ($1, $2)
       ON CONFLICT (city_id, name) DO NOTHING
       RETURNING id`,
      [cityId, location]
    )).rows[0]?.id || (await client.query('SELECT id FROM locations WHERE city_id=$1 AND name=$2', [cityId, location])).rows[0].id;

    await client.query('COMMIT');
    return { typeId, troupeId, cityId, locationId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 中间件：为每个请求设置北京时区
app.use(async (req, res, next) => {
  try {
    const client = await pool.connect();
    await client.query("SET timezone = 'Asia/Shanghai'");
    client.release();
  } catch (error) {
    console.error('时区设置错误:', error);
  }
  next();
});

// 健康检查接口
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         to_char(NOW() AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI:SS') AS beijing_time_str,
         NOW() AT TIME ZONE 'UTC' AS utc_time
       `
    );
    res.json({ 
      status: 'ok', 
      message: 'Database connected',
      beijing_time: result.rows[0].beijing_time_str,
      utc_time: result.rows[0].utc_time
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 获取所有演出
app.get('/api/events', async (req, res) => {
  const endpoint = 'GET /api/events';
  try {
    const { startDate, endDate, troupe, city } = req.query;
    
    let query = `${eventSelect} WHERE 1=1`;
    const params = [];
    let paramIndex = 1;
    
    if (startDate) {
      query += ` AND e.date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND e.date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (troupe) {
      query += ` AND t.name = $${paramIndex}`;
      params.push(troupe);
      paramIndex++;
    }
    
    if (city) {
      query += ` AND c.name = $${paramIndex}`;
      params.push(city);
      paramIndex++;
    }
    
    query += ' ORDER BY e.date DESC, et.name';
    
    const result = await pool.query(query, params);
    console.log(`✅ ${endpoint} - Returned ${result.rows.length} events`);
    res.json(result.rows);
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: 'Failed to fetch events', endpoint });
  }
});

// 根据日期获取演出
app.get('/api/events/by-date/:date', async (req, res) => {
  const endpoint = 'GET /api/events/by-date/:date';
  try {
    const { date } = req.params;
    const result = await pool.query(
      `${eventSelect} WHERE e.date = $1 ORDER BY et.name`,
      [date]
    );
    console.log(`✅ ${endpoint} - Returned ${result.rows.length} events for date: ${date}`);
    res.json(result.rows);
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: 'Failed to fetch events', endpoint });
  }
});

// 获取月份范围内的演出
app.get('/api/events/by-month/:yearMonth', async (req, res) => {
  const endpoint = 'GET /api/events/by-month/:yearMonth';
  try {
    const { yearMonth } = req.params;
    const [year, month] = yearMonth.split('-');
    
    if (!year || !month) {
      console.log(`⚠️ ${endpoint} - Invalid year-month format: ${yearMonth}, use YYYY-MM`);
      return res.status(400).json({ error: 'Invalid year-month format, use YYYY-MM', endpoint });
    }
    
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    // Calculate the last day of the month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
    
    const result = await pool.query(
      `${eventSelect} WHERE e.date >= $1 AND e.date <= $2 ORDER BY e.date, et.name`,
      [startDate, endDate]
    );
    console.log(`✅ ${endpoint} - Returned ${result.rows.length} events for ${year}-${month}`);
    res.json(result.rows);
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: 'Failed to fetch events', endpoint });
  }
});

// 添加演出
app.post('/api/events', async (req, res) => {
  const endpoint = 'POST /api/events';
  try {
    const { date, type, troupe, city, location, content, details } = req.body;
    
    // Reject array values
    if (Array.isArray(troupe)) {
      console.log(`⚠️ ${endpoint} - troupe should be a string, not array`);
      return res.status(400).json({ error: 'troupe should be a single string value', endpoint });
    }
    if (Array.isArray(city)) {
      console.log(`⚠️ ${endpoint} - city should be a string, not array`);
      return res.status(400).json({ error: 'city should be a single string value', endpoint });
    }
    
    if (!date || !type || !troupe || !city || !location || !content) {
      console.log(`⚠️ ${endpoint} - Missing required fields`);
      return res.status(400).json({ error: 'Missing required fields', endpoint });
    }

    const { typeId, troupeId, cityId, locationId } = await resolveIds({ type, troupe, city, location });
    
    const result = await pool.query(
      'INSERT INTO events (date, type_id, troupe_id, city_id, location_id, content, details) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [date, typeId, troupeId, cityId, locationId, content, details || null]
    );
    
    console.log(`✅ ${endpoint} - Created event ID: ${result.rows[0].id}`);
    res.json({ id: result.rows[0].id, message: 'Event created successfully', endpoint });
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: 'Failed to create event', endpoint });
  }
});

// 更新演出
app.put('/api/events/:id', async (req, res) => {
  const endpoint = 'PUT /api/events/:id';
  try {
    const { id } = req.params;
    const { date, type, troupe, city, location, content, details } = req.body;
    
    // Reject array values
    if (Array.isArray(troupe)) {
      // console.log(`⚠️ ${endpoint} - troupe should be a string, not array`);
      return res.status(400).json({ error: 'troupe should be a single string value', endpoint });
    }
    if (Array.isArray(city)) {
      console.log(`⚠️ ${endpoint} - city should be a string, not array`);
      return res.status(400).json({ error: 'city should be a single string value', endpoint });
    }
    
    if (!date || !type || !troupe || !city || !location || !content) {
      console.log(`⚠️ ${endpoint} - Missing required fields`);
      return res.status(400).json({ error: 'Missing required fields', endpoint });
    }

    const { typeId, troupeId, cityId, locationId } = await resolveIds({ type, troupe, city, location });
    
    const result = await pool.query(
      'UPDATE events SET date = $1, type_id = $2, troupe_id = $3, city_id = $4, location_id = $5, content = $6, details = $7 WHERE id = $8',
      [date, typeId, troupeId, cityId, locationId, content, details || null, id]
    );
    
    if (result.rowCount === 0) {
      console.log(`⚠️ ${endpoint} - Event not found: ID ${id}`);
      return res.status(404).json({ error: 'Event not found', endpoint });
    }
    
    console.log(`✅ ${endpoint} - Updated event ID: ${id}`);
    res.json({ message: 'Event updated successfully', endpoint });
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: 'Failed to update event', endpoint });
  }
});

// 删除演出
app.delete('/api/events/:id', async (req, res) => {
  const endpoint = 'DELETE /api/events/:id';
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM events WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      console.log(`⚠️ ${endpoint} - Event not found: ID ${id}`);
      return res.status(404).json({ error: 'Event not found', endpoint });
    }
    
    console.log(`✅ ${endpoint} - Deleted event ID: ${id}`);
    res.json({ message: 'Event deleted successfully', endpoint });
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: 'Failed to delete event', endpoint });
  }
});

// 获取所有剧团列表
app.get('/api/troupes', async (req, res) => {
  const endpoint = 'GET /api/troupes';
  try {
    const result = await pool.query('SELECT name, color FROM troupes ORDER BY name');
    const troupes = result.rows.map(row => ({
      name: row.name,
      color: row.color || '#2f54eb'
    }));
    console.log(`✅ ${endpoint} - Returned ${troupes.length} troupes`);
    res.json(troupes);
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: 'Failed to fetch troupes', endpoint });
  }
});

// 获取所有城市列表
app.get('/api/cities', async (req, res) => {
  const endpoint = 'GET /api/cities';
  try {
    const result = await pool.query('SELECT name FROM cities ORDER BY name');
    const cities = result.rows.map(row => row.name);
    console.log(`✅ ${endpoint} - Returned ${cities.length} cities`);
    res.json(cities);
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: 'Failed to fetch cities', endpoint });
  }
});

// 新增剧团
app.post('/api/troupes', async (req, res) => {
  const endpoint = 'POST /api/troupes';
  try {
    const { name, color } = req.body;
    if (!name || !name.trim()) {
      console.log(`⚠️ ${endpoint} - Troupe name is required`);
      return res.status(400).json({ error: '剧团名称不能为空', endpoint });
    }

    const trimmedName = name.trim();
    const troupeColor = color || '#2f54eb';
    
    const result = await pool.query(
      'INSERT INTO troupes(name, color) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id, name, color',
      [trimmedName, troupeColor]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️ ${endpoint} - Troupe "${trimmedName}" already exists`);
      return res.status(409).json({ error: '该剧团已存在', endpoint });
    }

    console.log(`✅ ${endpoint} - Created troupe: ${trimmedName} (${troupeColor})`);
    res.json({ 
      id: result.rows[0].id, 
      name: result.rows[0].name, 
      color: result.rows[0].color,
      message: '剧团添加成功' 
    });
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: '添加剧团失败', endpoint });
  }
});

// 更新剧团（名称和/或颜色）
app.put('/api/troupes/:name', async (req, res) => {
  const endpoint = 'PUT /api/troupes/:name';
  try {
    const { name: oldName } = req.params;
    const { name: newName, color } = req.body;

    // 至少有一个字段要更新
    if ((!newName || !newName.trim()) && !color) {
      console.log(`⚠️ ${endpoint} - No fields to update`);
      return res.status(400).json({ error: '请提供要更新的内容（名称或颜色）', endpoint });
    }

    const trimmedNewName = newName ? newName.trim() : null;

    // 检查原剧团是否存在
    const existingResult = await pool.query('SELECT id FROM troupes WHERE name = $1', [oldName]);
    if (existingResult.rows.length === 0) {
      console.log(`⚠️ ${endpoint} - Troupe "${oldName}" not found`);
      return res.status(404).json({ error: '剧团不存在', endpoint });
    }

    // 如果改了名字，检查新名字是否冲突
    if (trimmedNewName && trimmedNewName !== oldName) {
      const conflictResult = await pool.query('SELECT id FROM troupes WHERE name = $1', [trimmedNewName]);
      if (conflictResult.rows.length > 0) {
        console.log(`⚠️ ${endpoint} - Troupe name "${trimmedNewName}" already exists`);
        return res.status(409).json({ error: '新的剧团名称已存在', endpoint });
      }
    }

    // 构建更新语句
    let updateQuery = 'UPDATE troupes SET ';
    const params = [];
    let paramIndex = 1;

    if (trimmedNewName) {
      updateQuery += `name = $${paramIndex}, `;
      params.push(trimmedNewName);
      paramIndex++;
    }
    if (color) {
      updateQuery += `color = $${paramIndex}, `;
      params.push(color);
      paramIndex++;
    }

    // 去掉末尾的逗号和空格
    updateQuery = updateQuery.slice(0, -2);
    updateQuery += ` WHERE name = $${paramIndex} RETURNING name, color`;
    params.push(oldName);

    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      console.log(`⚠️ ${endpoint} - Update failed for troupe "${oldName}"`);
      return res.status(500).json({ error: '更新失败', endpoint });
    }

    console.log(`✅ ${endpoint} - Updated troupe: ${oldName} -> ${result.rows[0].name} (${result.rows[0].color})`);
    res.json({ 
      name: result.rows[0].name, 
      color: result.rows[0].color,
      message: '剧团更新成功' 
    });
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: '更新剧团失败', endpoint });
  }
});

// 删除剧团
app.delete('/api/troupes/:name', async (req, res) => {
  const endpoint = 'DELETE /api/troupes/:name';
  try {
    const { name } = req.params;

    // 检查是否有演出使用这个剧团
    const usageResult = await pool.query(
      `SELECT COUNT(*) as count FROM events e
       JOIN troupes t ON e.troupe_id = t.id
       WHERE t.name = $1`,
      [name]
    );

    const usageCount = parseInt(usageResult.rows[0].count);
    if (usageCount > 0) {
      console.log(`⚠️ ${endpoint} - Troupe "${name}" is used by ${usageCount} events`);
      return res.status(400).json({ 
        error: `该剧团已被 ${usageCount} 场演出使用，无法删除`, 
        endpoint 
      });
    }

    const result = await pool.query('DELETE FROM troupes WHERE name = $1', [name]);
    
    if (result.rowCount === 0) {
      console.log(`⚠️ ${endpoint} - Troupe "${name}" not found`);
      return res.status(404).json({ error: '剧团不存在', endpoint });
    }

    console.log(`✅ ${endpoint} - Deleted troupe: ${name}`);
    res.json({ message: '剧团删除成功' });
  } catch (error) {
    console.error(`❌ ${endpoint} - Error:`, error);
    res.status(500).json({ error: '删除剧团失败', endpoint });
  }
});

// 启动服务器（先执行自动迁移，再启动）
autoMigrate().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
});
