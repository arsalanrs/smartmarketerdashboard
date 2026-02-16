#!/bin/bash

echo "🚀 Setting up local PostgreSQL database for Pixel Insights..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed."
    echo ""
    echo "📦 Install PostgreSQL:"
    echo "   macOS: brew install postgresql@14"
    echo "   Or download from: https://www.postgresql.org/download/"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo "⚠️  PostgreSQL server is not running."
    echo ""
    echo "🔧 Start PostgreSQL:"
    echo "   macOS: brew services start postgresql@14"
    echo "   Or: pg_ctl -D /usr/local/var/postgres start"
    exit 1
fi

echo "✅ PostgreSQL is installed and running"

# Create database
DB_NAME="pixel_insights"
echo ""
echo "📦 Creating database: $DB_NAME"

# Try to create database (ignore error if it already exists)
createdb $DB_NAME 2>/dev/null || echo "   Database already exists or using existing one"

# Get default user (usually 'postgres' or current user)
DB_USER=$(whoami)
echo "   Using user: $DB_USER"

# Create connection string
CONNECTION_STRING="postgresql://$DB_USER@localhost:5432/$DB_NAME?schema=public"

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📝 Update your .env file with:"
echo "   DATABASE_URL=\"$CONNECTION_STRING\""
echo ""
echo "🔧 Next steps:"
echo "   1. Update .env file with the connection string above"
echo "   2. Run: npx prisma db push"
echo "   3. Restart your dev server"

