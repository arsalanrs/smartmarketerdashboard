# Pixel Insights - Multi-Tenant Analytics Dashboard

A comprehensive analytics dashboard that ingests AudienceLab-style pixel CSV exports and generates white-label dashboards per tenant (client).

## Features

- **Multi-Tenant Architecture**: Each tenant (client) has isolated data with tenant_id filtering
- **CSV Ingestion**: Upload and process large CSV files (50k-200k rows)
- **Visitor Profiling**: Automatic visitor profile aggregation with engagement scoring
- **Geo Enrichment**: IP to location mapping with caching
- **AI Summaries**: OpenAI-powered executive summaries and actionable insights
- **Interactive Dashboard**: 
  - KPI cards (Total visitors, Engaged, Repeat, High Intent, New vs Returning)
  - Engagement breakdown table
  - Interactive map with visitor locations
  - Filterable visitor list with color coding
  - Visitor detail drawer with event timeline
  - AI summary panel

## Tech Stack

- **Next.js 15** (App Router) with TypeScript
- **Prisma ORM** with PostgreSQL
- **Tailwind CSS** for styling
- **Leaflet** for map visualization
- **OpenAI API** for AI summaries
- **PapaParse** for CSV parsing

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free) - recommended, or PostgreSQL database
- OpenAI API key (for AI summaries) - optional
- Optional: Geo location provider API key (ipinfo.io, ipapi.co, or maxmind)

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   # Database (Supabase recommended - see SUPABASE_SETUP.md)
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

   # OpenAI (for AI summaries)
   OPENAI_API_KEY="your-openai-api-key"

   # Geo Location Provider (optional)
   GEO_PROVIDER="ipinfo"  # or "ipapi"
   GEO_API_KEY="your-geo-api-key"  # optional, some providers work without key
   ```
   
   **Quick Setup**: See `SUPABASE_SETUP.md` for step-by-step Supabase setup (recommended).

3. **Set up the database:**
   
   **Option A: Supabase (Recommended - see SUPABASE_SETUP.md)**
   ```bash
   # After setting DATABASE_URL in .env
   npx prisma db push
   ```
   
   **Option B: Local PostgreSQL**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run migrations (creates all tables)
   npx prisma migrate dev --name init
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Create a Tenant

1. Go to `/admin/tenants`
2. Click "Create Tenant"
3. Enter tenant name and optional domain
4. Click "Create"

### 2. Upload CSV

1. Go to `/admin/upload`
2. Select a tenant
3. Choose a CSV file
4. Click "Upload & Process"

**CSV Format:**
The CSV should include these columns (case-insensitive):
- `Event Timestamp` or `event_timestamp` or `timestamp`
- `Event Type` or `event_type`
- `Uuid` or `uuid`
- `Ip Address` or `ip_address` or `ip`
- `Url` or `url`
- `Referrer Url` or `Referrer` or `referrer_url`
- `Timeonpage` or `time_on_page`
- `Percentage` or `percentage` (scroll depth)
- `Elementidentifier` or `Element Identifier` or `element_identifier`
- `Coordinates` (optional, JSON or "lat,lng" format)

Optional identity fields:
- `First Name`, `Last Name`
- `Company Name`, `Company Domain`
- `Job Title`, `Seniority Level`
- `Business Email`, `Personal Emails`
- `Direct Number`, `Mobile Phone`

### 3. View Dashboard

1. Go to `/dashboard/[tenantId]` or click "View Dashboard" from tenants page
2. View KPIs, engagement breakdown, map, and visitor list
3. Click on a visitor to see detailed event timeline
4. Generate AI summary (requires OpenAI API key)

## Engagement Scoring

Visitors are scored based on:
- **+2 points**: Repeat visits (2+ sessions)
- **+2 points**: Total time on page ≥ 60 seconds
- **+1 point**: Max scroll depth ≥ 50%
- **+2 points**: Visited key pages (pricing, contact, book, demo, etc.)
- **+3 points**: CTA clicked
- **+3 points**: Exit intent triggered
- **+2 points**: Video engagement

**Segments:**
- **0-2**: Casual Explorer
- **3-5**: Topic Researcher
- **6-8**: High-Intent Evaluator
- **9+**: Action-Oriented

## Database Schema

The application uses the following main tables:

- `tenants` - Client/tenant information
- `uploads` - CSV upload metadata
- `raw_events` - All parsed events from CSV
- `geo_cache` - Cached IP to location mappings
- `visitor_profiles` - Aggregated visitor profiles with scores
- `tenant_summaries` - AI-generated summaries per tenant/time window

## API Routes

- `GET /api/tenants` - List all tenants
- `POST /api/tenants` - Create a tenant
- `POST /api/upload` - Upload and process CSV
- `GET /api/dashboard?tenantId=&window=L30` - Get dashboard data
- `GET /api/ai-summary?tenantId=&window=L30` - Get AI summary
- `POST /api/ai-summary` - Generate AI summary
- `GET /api/visitor/[visitorKey]?tenantId=` - Get visitor details

## Processing Pipeline

When a CSV is uploaded:

1. Upload metadata is saved
2. CSV is parsed in batches (streaming)
3. Raw events are inserted into database
4. Events are grouped by visitor and into sessions (30min gap threshold)
5. Visitor profiles are computed with:
   - Aggregated metrics (visits, time, scroll, pages)
   - Flags (repeat, key page, CTA, exit intent, video)
   - Engagement score and segment
   - Geo location (from coordinates or IP lookup)
   - Identity overlay (if present in CSV)
6. AI summary is generated (if OpenAI key is set)

## Geo Enrichment

The system supports multiple geo providers:
- **ipinfo.io** (default, free tier available)
- **ipapi.co** (free tier available)
- **maxmind** (requires license)

Coordinates from CSV take precedence. If not available, IP addresses are geolocated and results are cached to reduce API costs.

## Multi-Tenancy

- Every table includes `tenant_id`
- All queries filter by `tenant_id`
- Admin selects tenant context before viewing dashboard or uploading files
- Designed for future Row Level Security (RLS) in Supabase

## Performance

- Handles 50k-200k row CSVs efficiently
- Batch inserts for raw events
- Cached geo lookups
- Indexed database queries
- Visitor profiles pre-aggregated for fast dashboard loads

## Security

- PII (emails, phones, names) are redacted by default in AI summaries
- Visitor keys are masked in UI (shows last 6 chars)
- Admin-only access for MVP (can be extended with auth)

## Development

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# View database in Prisma Studio
npx prisma studio
```

## Production Deployment (Render)

### Setting up on Render

1. **Create a PostgreSQL database on Render:**
   - Go to your Render dashboard
   - Click "New +" → "PostgreSQL"
   - Create a new database
   - Copy the "Internal Database URL" or "External Database URL"

2. **Set environment variables in Render:**
   - Go to your Web Service → Environment
   - Add `DATABASE_URL` with your Render PostgreSQL connection string
   - Add `OPENAI_API_KEY` (if using AI summaries)
   - Add other environment variables as needed

3. **Deploy:**
   - Connect your GitHub repository
   - Render will automatically detect Next.js
   - Build command: `npm run build`
   - Start command: `npm start`

4. **Run migrations:**
   - After first deployment, run migrations:
   ```bash
   # In Render shell or locally with DATABASE_URL set
   npx prisma migrate deploy
   ```
   - Or use `npx prisma db push` for initial setup

### Local Development Setup

For local development, use a local PostgreSQL database:

1. **Install PostgreSQL:**
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   ```

2. **Run the setup script:**
   ```bash
   ./setup-local-db.sh
   ```

3. **Or manually:**
   ```bash
   # Create database
   createdb pixel_insights
   
   # Update .env
   DATABASE_URL="postgresql://$(whoami)@localhost:5432/pixel_insights?schema=public"
   
   # Push schema
   npx prisma db push
   ```

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
