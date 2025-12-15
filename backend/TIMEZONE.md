# 时区配置说明

## ✅ 已配置的北京时间（UTC+8）

所有脚本已更新，确保数据库中的所有时间戳都使用北京时间。

### 🔧 配置位置

#### 1. **init.js** - 初始化脚本
- ✅ 设置 `SET timezone = 'Asia/Shanghai'`
- ✅ 建表时使用 `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai'`

#### 2. **migrate.js** - 迁移脚本
- ✅ 设置 `SET timezone = 'Asia/Shanghai'`
- ✅ 建表时使用北京时间默认值

#### 3. **seed.js** - 数据导入脚本
- ✅ 设置 `SET timezone = 'Asia/Shanghai'`
- ✅ 每次导入前设置时区

#### 4. **server.js** - API服务器
- ✅ 中间件自动为每个请求设置时区
- ✅ `/api/health` 端点返回当前北京时间
- ✅ 所有查询自动转换为北京时间

#### 5. **test-connection.js** - 连接测试
- ✅ 显示当前北京时间
- ✅ 验证时区配置

### 📊 数据库表结构

```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  type VARCHAR(20),
  troupe VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  location VARCHAR(200) NOT NULL,
  content VARCHAR(200) NOT NULL,
  -- 北京时间时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Shanghai'
);
```

### 🚀 使用示例

```bash
# 1. 初始化数据库（推荐，一键完成）
npm run init

# 2. 测试连接并查看北京时间
npm run test-connection

# 3. 启动API服务
npm run dev

# 4. 检查健康状态（查看北京时间）
curl http://localhost:3001/api/health
```

### 📝 API 响应示例

```json
{
  "status": "ok",
  "message": "Database connected",
  "beijing_time": "2025-12-15 10:30:45.123456+08:00"
}
```

### ⚙️ 时区验证

所有以下操作都已确保使用北京时间：

1. ✅ 建表时的 `created_at` 默认值
2. ✅ 数据导入时的时间戳
3. ✅ API 查询结果中的时间显示
4. ✅ 健康检查返回的当前时间

### 🎯 北京时间特性

- **时区**: Asia/Shanghai (UTC+8)
- **自动转换**: 所有 TIMESTAMP 查询自动转换
- **一致性**: 整个系统使用统一的北京时间

---

**运行 `npm run init` 后，所有数据的时间戳都将使用北京时间！** ⏰
