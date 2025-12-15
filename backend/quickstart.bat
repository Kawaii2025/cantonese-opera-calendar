@echo off
chcp 65001 >nul
cls

echo 🎭 粤剧日历 - 后端快速启动
echo ================================
echo.

REM 检查 .env 文件
if not exist .env (
    echo ⚠️  .env 文件不存在
    echo.
    echo 请按以下步骤操作：
    echo   1. 复制 .env.example 为 .env
    echo   2. 编辑 .env 添加你的 Neon 数据库 URL
    echo.
    pause
    exit /b 1
)

echo ✅ .env 文件已找到
echo.

REM 检查 node_modules
if not exist node_modules (
    echo 📦 安装依赖...
    call npm install
    echo.
)

REM 测试连接
echo 🔌 测试数据库连接...
call npm run test-connection
if %errorlevel% neq 0 (
    echo.
    echo ❌ 数据库连接失败，请检查 .env 配置
    pause
    exit /b 1
)

echo.
echo ✨ 一切就绪！选择下一步操作:
echo.
echo   1. npm run migrate    - 创建表和导入数据（首次使用）
echo   2. npm run seed       - 清空并重新导入所有数据
echo   3. npm run dev        - 启动开发服务器 (热重载)
echo   4. npm run start      - 启动生产服务器
echo.
pause
