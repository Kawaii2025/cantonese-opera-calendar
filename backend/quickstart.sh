#!/bin/bash
# 快速启动脚本 (bash/zsh)

echo "🎭 粤剧日历 - 后端快速启动"
echo "================================\n"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在"
    echo "请复制 .env.example 为 .env 并填入你的 Neon 数据库 URL:"
    echo "  cp .env.example .env"
    echo "  编辑 .env 文件添加 DATABASE_URL"
    exit 1
fi

echo "✅ .env 文件已找到\n"

# 检查 node_modules
if [ ! -d node_modules ]; then
    echo "📦 安装依赖..."
    npm install
    echo ""
fi

# 测试连接
echo "🔌 测试数据库连接..."
npm run test-connection
if [ $? -ne 0 ]; then
    echo "❌ 数据库连接失败，请检查 .env 配置"
    exit 1
fi

echo ""
echo "✨ 一切就绪！选择下一步操作:"
echo ""
echo "  1. npm run migrate   # 创建表和导入数据（首次使用）"
echo "  2. npm run seed      # 清空并重新导入所有数据"
echo "  3. npm run dev       # 启动开发服务器 (热重载)"
echo "  4. npm run start     # 启动生产服务器"
echo ""
