@echo off
echo 🚀 Order Processing System - Quick Start
echo ========================================
echo.

REM Check if npm is available
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install Node.js
    exit /b 1
)

echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo.
echo 🔨 Building the application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed. Please check the errors above.
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.
echo 📝 Next steps:
echo 1. Start PostgreSQL (Docker or local)
echo    Docker: docker run --name postgres-orders -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
echo.
echo 2. Create database and schema:
echo    docker exec -it postgres-orders psql -U postgres -c "CREATE DATABASE orders_db;"
echo    docker exec -i postgres-orders psql -U postgres -d orders_db ^< database/schema.sql
echo.
echo 3. Start Redis (Docker or local)
echo    Docker: docker run --name redis-orders -p 6379:6379 -d redis
echo.
echo 4. Start the application:
echo    npm run start:dev
echo.
pause
