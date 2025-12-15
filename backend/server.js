import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 公用选择列（3NF 联表，返回名字而非 id）
const eventSelect = `
  SELECT 
    e.id,
    e.date,
    et.name AS type,
    t.name AS troupe,
    c.name AS city,
    l.name AS location,
    e.content,
    e.created_at AT TIME ZONE 'Asia/Shanghai' AS created_at
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
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// 根据日期获取演出
app.get('/api/events/by-date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const result = await pool.query(
      `${eventSelect} WHERE e.date = $1 ORDER BY et.name`,
      [date]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events by date:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// 获取月份范围内的演出
app.get('/api/events/by-month/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    // Calculate the last day of the month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;
    
    const result = await pool.query(
      `${eventSelect} WHERE e.date >= $1 AND e.date <= $2 ORDER BY e.date, et.name`,
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events by month:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// 添加演出
app.post('/api/events', async (req, res) => {
  try {
    const { date, type, troupe, city, location, content } = req.body;
    
    if (!date || !type || !troupe || !city || !location || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { typeId, troupeId, cityId, locationId } = await resolveIds({ type, troupe, city, location });
    
    const result = await pool.query(
      'INSERT INTO events (date, type_id, troupe_id, city_id, location_id, content) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [date, typeId, troupeId, cityId, locationId, content]
    );
    
    res.json({ id: result.rows[0].id, message: 'Event created successfully' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// 更新演出
app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, troupe, city, location, content } = req.body;
    
    if (!date || !type || !troupe || !city || !location || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { typeId, troupeId, cityId, locationId } = await resolveIds({ type, troupe, city, location });
    
    const result = await pool.query(
      'UPDATE events SET date = $1, type_id = $2, troupe_id = $3, city_id = $4, location_id = $5, content = $6 WHERE id = $7',
      [date, typeId, troupeId, cityId, locationId, content, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// 删除演出
app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM events WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// 获取所有剧团列表
app.get('/api/troupes', async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM troupes ORDER BY name');
    const troupes = result.rows.map(row => row.name);
    res.json(troupes);
  } catch (error) {
    console.error('Error fetching troupes:', error);
    res.status(500).json({ error: 'Failed to fetch troupes' });
  }
});

// 获取所有城市列表
app.get('/api/cities', async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM cities ORDER BY name');
    const cities = result.rows.map(row => row.name);
    res.json(cities);
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
