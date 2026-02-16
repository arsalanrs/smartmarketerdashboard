# Quick Start with Supabase

## 🚀 5-Minute Setup

### 1. Create Supabase Project
- Go to https://supabase.com
- Sign up (free)
- Click "New Project"
- Name: `pixel-insights`
- Set a database password (save it!)
- Click "Create new project"
- Wait ~2 minutes

### 2. Get Connection String
- In Supabase dashboard: **Settings** → **Database**
- Scroll to **"Connection string"**
- Click **"URI"** tab
- Copy the connection string

### 3. Update .env
Replace `DATABASE_URL` in your `.env` file:

```env
DATABASE_URL="postgresql://postgres.[ref]:YOUR_PASSWORD@aws-0-[region].pooler.supabase.com:6543/postgres"
```

**Replace `YOUR_PASSWORD` with the password you set when creating the project.**

### 4. Create Tables
```bash
npx prisma db push
```

### 5. Start Dev Server
```bash
npm run dev
```

### 6. Test It
Visit: http://localhost:3000/api/tenants

Should return: `[]` (empty array = success!)

## ✅ Done!

Your app is now using Supabase. The same connection string works for:
- ✅ Local development
- ✅ Render deployment
- ✅ Any other hosting platform

Just set `DATABASE_URL` in your hosting environment variables!

