# Render Deployment Guide

## Quick Setup for Render

### 1. Create PostgreSQL Database on Render

1. Go to your Render dashboard: https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Choose:
   - **Name**: `pixel-insights-db` (or any name)
   - **Database**: `pixel_insights`
   - **User**: `pixel_insights` (or default)
   - **Plan**: Free (or choose based on needs)
4. Click **"Create Database"**
5. Wait for it to provision (~2 minutes)

### 2. Get Database Connection String

1. Click on your database in Render dashboard
2. Go to **"Connections"** tab
3. Copy the **"Internal Database URL"** (for services in same region)
   - Or **"External Database URL"** if needed
   - Format: `postgresql://user:password@host:port/database`

### 3. Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `pixel-insights` (or any name)
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or choose based on needs)

### 4. Set Environment Variables

In your Web Service → **Environment** tab, add:

```env
DATABASE_URL=<paste-your-render-database-url>
OPENAI_API_KEY=<your-openai-key-if-using-ai-summaries>
GEO_PROVIDER=ipinfo
GEO_API_KEY=<optional>
NODE_ENV=production
```

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Install dependencies
   - Run `npm run build`
   - Start the service

### 6. Run Database Migrations

After first deployment, you need to create the database tables:

**Option A: Using Render Shell**
1. Go to your Web Service → **Shell** tab
2. Run: `npx prisma db push`

**Option B: Using Local Terminal**
```bash
# Set DATABASE_URL to your Render database URL
export DATABASE_URL="postgresql://..."
npx prisma db push
```

### 7. Verify

1. Visit your Render service URL
2. Test: `https://your-app.onrender.com/api/tenants`
3. Should return `[]` (empty array) if working

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | Render PostgreSQL connection string |
| `OPENAI_API_KEY` | ⚠️ Optional | For AI summary generation |
| `GEO_PROVIDER` | ⚠️ Optional | `ipinfo` or `ipapi` (default: `ipinfo`) |
| `GEO_API_KEY` | ⚠️ Optional | API key for geo provider |
| `NODE_ENV` | ✅ Yes | Set to `production` |

## Troubleshooting

### Database Connection Issues
- Make sure you're using **Internal Database URL** if services are in same region
- Check that database is **Active** in Render dashboard
- Verify `DATABASE_URL` is set correctly in environment variables

### Build Failures
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Render uses Node 18+ by default)

### Migration Issues
- Run `npx prisma db push` in Render Shell after first deployment
- Or use `npx prisma migrate deploy` if using migrations

## Local Development vs Production

- **Local**: Uses `postgresql://user@localhost:5432/pixel_insights`
- **Render**: Uses Render's PostgreSQL connection string
- The code automatically detects and uses the correct connection

## Cost

- **Free tier**: 
  - Web service: 750 hours/month (enough for most projects)
  - PostgreSQL: 90 days free trial, then $7/month
- **Paid tiers**: Start at $7/month for web service

