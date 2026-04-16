# Quick Database Setup Guide

## Option 1: Supabase (Easiest - Recommended) ⭐

1. **Go to https://supabase.com and sign up (free)**

2. **Create a new project:**
   - Click "New Project"
   - Choose a name and database password
   - Wait for project to be created (~2 minutes)

3. **Get your connection string:**
   - Go to Project Settings → Database
   - Find "Connection string" → "URI"
   - Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`)

4. **Update your `.env` file:**
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```
   Replace `[YOUR-PASSWORD]` and `[PROJECT-REF]` with your actual values.

5. **Create the database tables:**
   ```bash
   npx prisma db push
   ```

6. **Restart your dev server**

## Option 2: Local PostgreSQL

1. **Install PostgreSQL:**
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   
   # Or download from https://www.postgresql.org/download/
   ```

2. **Create a database:**
   ```bash
   createdb pixel_insights
   ```

3. **Update your `.env` file:**
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pixel_insights?schema=public"
   ```
   (Adjust username/password if different)

4. **Create the database tables:**
   ```bash
   npx prisma db push
   ```

5. **Restart your dev server**

## Option 3: Use Existing Database (If you have one)

If you already have a PostgreSQL database running:

1. **Update your `.env` file with your connection string:**
   ```env
   DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
   ```

2. **Create the database tables:**
   ```bash
   npx prisma db push
   ```

3. **Restart your dev server**

## Verify Setup

After setup, test it:
```bash
# This should work without errors
curl http://localhost:3000/api/tenants
```

You should get `[]` (empty array) if no tenants exist yet, or an error if the database isn't connected.

