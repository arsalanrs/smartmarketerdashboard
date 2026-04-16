# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up (free) or log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: `pixel-insights` (or any name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free (or Pro if needed)
5. Click **"Create new project"**
6. Wait ~2 minutes for project to be created

## Step 2: Get Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **"Connection string"**
3. Select **"URI"** tab
4. Copy the connection string
   - It looks like: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - Or use the **"Session mode"** connection string (recommended)

## Step 3: Update .env File

Replace your `DATABASE_URL` in `.env` with the Supabase connection string:

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
```

**Important**: Replace `[password]` with the database password you set when creating the project.

## Step 4: Push Schema to Supabase

Run this command to create all tables in Supabase:

```bash
npx prisma db push
```

## Step 5: Verify

Test the connection:

```bash
# Should return empty array []
curl http://localhost:3000/api/tenants
```

## Benefits of Supabase

✅ **Free tier**: 500MB database, 2GB bandwidth  
✅ **Automatic backups**: Daily backups included  
✅ **Web dashboard**: Easy database management  
✅ **API ready**: REST and GraphQL APIs included  
✅ **Works everywhere**: Same connection string for dev and production  
✅ **No local setup**: No need to run PostgreSQL locally  

## Supabase Dashboard

You can manage your database at:
- **Table Editor**: View/edit data
- **SQL Editor**: Run queries
- **Database**: See schema, connections, etc.

## For Render Deployment

When deploying to Render, just use the same Supabase `DATABASE_URL` in your Render environment variables. No need for a separate Render database!

