#!/bin/bash

echo "🚀 Order Processing System - Quick Start"
echo "========================================"
echo ""

# Check if PostgreSQL is running
echo "📊 Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found in PATH"
    echo "   Please install PostgreSQL or use Docker:"
    echo "   docker run --name postgres-orders -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres"
else
    echo "✅ PostgreSQL found"
fi

# Check if Redis is running
echo ""
echo "📊 Checking Redis..."
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis not found in PATH"
    echo "   Please install Redis or use Docker:"
    echo "   docker run --name redis-orders -p 6379:6379 -d redis"
else
    echo "✅ Redis found"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build the application
echo ""
echo "🔨 Building the application..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Ensure PostgreSQL is running and create the database:"
    echo "   psql -U postgres -c 'CREATE DATABASE orders_db;'"
    echo "   psql -U postgres -d orders_db -f database/schema.sql"
    echo ""
    echo "2. Ensure Redis is running"
    echo ""
    echo "3. Start the application:"
    echo "   npm run start:dev"
    echo ""
else
    echo ""
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
