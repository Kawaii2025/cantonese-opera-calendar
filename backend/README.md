# 🎭 粤剧日历 - 后端 API

完整的 Node.js/Express REST API，用于管理粤剧演出日程数据，基于 Neon PostgreSQL 数据库。

## 📁 项目结构

```
backend/
├── server.js              # Express API 服务器
├── db.js                  # PostgreSQL 连接池配置
├── data.js                # 演出数据（317行，101个日期）
├── migrate.js             # 数据库建表脚本
├── seed.js                # 数据导入脚本
├── test-connection.js     # 数据库连接测试
├── package.json           # 项目依赖
├── .env.example           # 环境变量示例
├── .gitignore             # Git 忽略文件
├── SETUP.md               # 详细设置指南
├── quickstart.sh          # 快速启动脚本（Linux/Mac）
├── quickstart.bat         # 快速启动脚本（Windows）
└── README.md              # 本文件
```

## 🚀 快速开始（3步）

### 1️⃣ 配置环境
```bash
# 复制示例配置
cp .env.example .env

# 编辑 .env，填入 Neon 数据库连接字符串
# DATABASE_URL=postgresql://user:password@region.neon.tech/database?sslmode=require
```

### 2️⃣ 安装依赖和建表
```bash
npm install
npm run migrate    # 自动建表并导入数据
```

### 3️⃣ 启动服务
```bash
npm run dev        # 开发模式（热重载）
npm run start      # 生产模式
```

## 📊 已包含的数据

✅ **101 个日期** 的演出数据  
✅ **320+ 场演出** 记录  
✅ **7 个剧团** 参演  
✅ **8 个城市** 覆盖  
✅ 时间跨度：2025-01-01 至 2025-03-31

## 🔌 API 端点

### 查询操作

| 方法 | 端点 | 说明 | 示例 |
|------|------|------|------|
| **GET** | `/api/health` | 健康检查 | `curl http://localhost:3001/api/health` |
| **GET** | `/api/events` | 获取所有演出 | `curl http://localhost:3001/api/events` |
| **GET** | `/api/events?startDate=2025-01-01&endDate=2025-01-31` | 日期范围查询 | - |
| **GET** | `/api/events?troupe=广州团` | 按剧团查询 | - |
| **GET** | `/api/events?city=广州` | 按城市查询 | - |
| **GET** | `/api/events/by-date/:date` | 按日期查询 | `curl http://localhost:3001/api/events/by-date/2025-01-01` |
| **GET** | `/api/events/by-month/:year/:month` | 按月份查询 | `curl http://localhost:3001/api/events/by-month/2025/01` |
| **GET** | `/api/troupes` | 获取所有剧团 | `curl http://localhost:3001/api/troupes` |
| **GET** | `/api/cities` | 获取所有城市 | `curl http://localhost:3001/api/cities` |

### 创建、更新、删除

| 方法 | 端点 | 说明 |
|------|------|------|
| **POST** | `/api/events` | 创建演出 |
| **PUT** | `/api/events/:id` | 更新演出 |
| **DELETE** | `/api/events/:id` | 删除演出 |

## 📝 请求示例

### 获取 2025年1月的所有演出
```bash
curl http://localhost:3001/api/events/by-month/2025/01
```

### 获取特定日期的演出
```bash
curl http://localhost:3001/api/events/by-date/2025-01-01
```

### 按剧团和城市过滤
```bash
curl "http://localhost:3001/api/events?troupe=广州团&city=广州"
```

### 创建新演出
```bash
curl -X POST http://localhost:3001/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-04-01",
    "type": "night",
    "troupe": "广州团",
    "city": "广州",
    "location": "文化中心大剧院",
    "content": "《新编粤剧》"
  }'
```

### 更新演出
```bash
curl -X PUT http://localhost:3001/api/events/123 \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-04-01",
    "type": "afternoon",
    "troupe": "广州团",
    "city": "广州",
    "location": "新场地",
    "content": "《更新内容》"
  }'
```

### 删除演出
```bash
curl -X DELETE http://localhost:3001/api/events/123
```

## 🛠️ NPM 脚本

```bash
npm run dev              # 开发服务器（热重载）
npm run start            # 生产服务器
npm run migrate          # 建表并导入所有数据
npm run seed             # 清空并重新导入数据
npm run test-connection  # 测试数据库连接
```

## 📋 数据库表结构

```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(20),                -- 'afternoon' 或 'night'
  troupe VARCHAR(50) NOT NULL,     -- 剧团名称
  city VARCHAR(50) NOT NULL,       -- 城市
  location VARCHAR(200) NOT NULL,  -- 演出地点
  content VARCHAR(200) NOT NULL,   -- 演出内容
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 优化查询的索引
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_troupe ON events(troupe);
CREATE INDEX idx_events_city ON events(city);
```

## 🎭 参与剧团

1. 佛山团
2. 广州团
3. 红豆团
4. 省一团
5. 省二团
6. 深圳团
7. 省院

## 🏙️ 演出城市

1. 广州
2. 茂名
3. 东莞
4. 深圳
5. 佛山
6. 湛江
7. 北海
8. 香港

## 🔧 配置说明

### 环境变量（.env）

```dotenv
# Neon PostgreSQL 连接字符串
DATABASE_URL=postgresql://user:password@region.neon.tech/database?sslmode=require

# 服务器端口（默认 3001）
PORT=3001

# 运行环境
NODE_ENV=development
```

### 获取 Neon 连接字符串

1. 登录 [Neon Console](https://console.neon.tech)
2. 选择项目
3. 点击 "Connection Details"
4. 复制 Connection String
5. 粘贴到 `.env` 的 `DATABASE_URL`

## 🚨 故障排除

### 连接失败：`connect ENOENT`
- ✅ 检查 `DATABASE_URL` 是否正确
- ✅ 确保 Neon 项目处于活跃状态
- ✅ 运行 `npm run test-connection` 诊断

### 表不存在：`relation "events" does not exist`
- ✅ 运行 `npm run migrate` 创建表

### 启动端口被占用：`EADDRINUSE`
- ✅ 修改 `.env` 中的 `PORT` 值
- ✅ 或关闭占用该端口的进程

## 📊 响应格式

### 成功响应 (200 OK)

```json
{
  "id": 1,
  "date": "2025-01-01",
  "type": "night",
  "troupe": "佛山团",
  "city": "佛山",
  "location": "祖庙万福台",
  "content": "《粤剧折子戏》",
  "created_at": "2025-12-15T10:30:00.000Z"
}
```

### 错误响应 (400/404/500)

```json
{
  "error": "描述性错误信息"
}
```

## 🔐 安全性

- ✅ 使用参数化查询防止 SQL 注入
- ✅ Neon SSL 连接（生产环境推荐）
- ✅ CORS 配置支持跨域请求
- ✅ 环境变量保护敏感信息

## 🎯 下一步

1. **连接前端**：配置 React 应用的 API 地址
2. **添加认证**：实现用户登录和权限控制
3. **缓存优化**：添加 Redis 缓存热门查询
4. **部署**：部署到 Heroku、Vercel 等平台

## 📚 相关资源

- [Neon 文档](https://neon.tech/docs)
- [Express.js 文档](https://expressjs.com)
- [PostgreSQL 文档](https://www.postgresql.org/docs)
- [Node.js pg 客户端](https://node-postgres.com)

## 📄 许可证

MIT

## 👨‍💻 作者

粤剧日历项目团队

---

**有任何问题？** 运行 `npm run test-connection` 检查数据库连接状态。
