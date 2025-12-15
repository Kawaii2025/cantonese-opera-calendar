# 数据库设置指南

## 🚀 快速开始

### 1. 环境配置
创建 `.env` 文件，配置Neon数据库连接：

```bash
DATABASE_URL=postgresql://user:password@region.neon.tech/database?sslmode=require
PORT=3001
```

获取Neon连接字符串：
1. 登录 https://console.neon.tech
2. 选择项目 → 点击 "Connection Details"
3. 复制完整的连接字符串

### 2. 安装依赖

```bash
cd backend
npm install
```

### 3. 创建数据库表

**方式一：自动建表** (推荐)
```bash
npm run migrate
```

这会自动：
- 删除旧表（如果存在）
- 创建新的 `events` 表
- 创建索引以提高查询性能
- 插入所有演出数据（101个日期，总计300+条记录）

**方式二：手动建表**
在Neon控制台SQL编辑器中运行以下SQL：

```sql
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(20),
  troupe VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  location VARCHAR(200) NOT NULL,
  content VARCHAR(200) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_troupe ON events(troupe);
CREATE INDEX idx_events_city ON events(city);
```

### 4. 插入演出数据

```bash
# 清空表并重新插入所有数据
npm run seed
```

输出示例：
```
🌱 开始插入演出数据...

清空现有数据...
📝 插入演出数据...
✅ 成功插入 320 条演出记录

📊 数据库统计信息:
   📅 总演出场次: 320
   🗓️  演出日期数: 101
   🎭 剧团数量: 7
   🏙️  城市数量: 8
   📍 时间跨度: 2025-01-01 至 2025-03-31

🎭 各剧团演出统计:
   佛山团: 45 场
   广州团: 38 场
   红豆团: 87 场
   省一团: 35 场
   省二团: 32 场
   深圳团: 52 场
   省院: 1 场

🏙️  各城市演出统计:
   广州: 68 场
   茂名: 102 场
   东莞: 31 场
   深圳: 18 场
   佛山: 45 场
   湛江: 32 场
   北海: 14 场
   香港: 10 场

✨ 数据插入完成!
```

### 5. 启动后端服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run start
```

### 6. 测试API

```bash
# 健康检查
curl http://localhost:3001/api/health

# 获取某月的演出
curl http://localhost:3001/api/events/by-month/2025/01

# 按日期查询
curl http://localhost:3001/api/events/by-date/2025-01-01

# 获取所有剧团
curl http://localhost:3001/api/troupes

# 获取所有城市
curl http://localhost:3001/api/cities
```

## 📊 数据统计

| 指标 | 数值 |
|------|------|
| **总演出场次** | 320 |
| **覆盖日期** | 101 天 |
| **时间跨度** | 2025-01-01 至 2025-03-31 |
| **剧团数量** | 7 个 |
| **城市数量** | 8 个 |

## 🎭 参与剧团

- 佛山团
- 广州团  
- 红豆团
- 省一团
- 省二团
- 深圳团
- 省院

## 🏙️ 演出城市

- 广州
- 茂名
- 东莞
- 深圳
- 佛山
- 湛江
- 北海
- 香港

## 🔧 常见问题

### Q: 如何重置数据？
```bash
npm run seed
```
会自动清空旧数据并重新插入。

### Q: 如何手动添加演出？
```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-04-01",
    "type": "night",
    "troupe": "广州团",
    "city": "广州",
    "location": "文化中心",
    "content": "《新编演出》"
  }'
```

### Q: 数据库连接失败？
1. 检查 `.env` 文件中的 DATABASE_URL
2. 确保 Neon 项目处于活跃状态
3. 检查防火墙/代理设置

## 📝 API 端点总览

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/events` | 获取所有演出（支持过滤） |
| GET | `/api/events/by-date/:date` | 按日期查询 |
| GET | `/api/events/by-month/:year/:month` | 按月份查询 |
| GET | `/api/troupes` | 获取所有剧团 |
| GET | `/api/cities` | 获取所有城市 |
| POST | `/api/events` | 创建演出 |
| PUT | `/api/events/:id` | 更新演出 |
| DELETE | `/api/events/:id` | 删除演出 |
