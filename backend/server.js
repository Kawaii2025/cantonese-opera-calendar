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

// 公用选择列（ 3NF 联表，返回名字而非 id）
const eventSelect = `
  SELECT 
    e.id,
    e.date,
    EXTRACT(EPOCH FROM e.date)::INT AS date_timestamp,
    et.name AS type,
    t.name AS troupe,
    c.name AS city,
    l.name AS location,
    e.content,
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
    
    query += ' ORDER BY e.date ASC, et.name';
    
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
    const { date, type, troupe, city, location, content } = req.body;
    
    if (!date || !type || !troupe || !city || !location || !content) {
      console.log(`⚠️ ${endpoint} - Missing required fields`);
      return res.status(400).json({ error: 'Missing required fields', endpoint });
    }

    const { typeId, troupeId, cityId, locationId } = await resolveIds({ type, troupe, city, location });
    
    const result = await pool.query(
      'INSERT INTO events (date, type_id, troupe_id, city_id, location_id, content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [date, typeId, troupeId, cityId, locationId, content]
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
    const { date, type, troupe, city, location, content } = req.body;
    
    if (!date || !type || !troupe || !city || !location || !content) {
      console.log(`⚠️ ${endpoint} - Missing required fields`);
      return res.status(400).json({ error: 'Missing required fields', endpoint });
    }

    const { typeId, troupeId, cityId, locationId } = await resolveIds({ type, troupe, city, location });
    
    const result = await pool.query(
      'UPDATE events SET date = $1, type_id = $2, troupe_id = $3, city_id = $4, location_id = $5, content = $6 WHERE id = $7',
      [date, typeId, troupeId, cityId, locationId, content, id]
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
    const result = await pool.query('SELECT name FROM troupes ORDER BY name');
    const troupes = result.rows.map(row => row.name);
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

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
