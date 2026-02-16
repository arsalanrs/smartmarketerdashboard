# Quick Setup Guide

## 1. Install Dependencies
```bash
npm install
```

## 2. Set Up Database

Create a `.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/pixel_insights?schema=public"
OPENAI_API_KEY="your-key-here"
GEO_PROVIDER="ipinfo"
GEO_API_KEY="optional"
```

## 3. Initialize Database
```bash
# Generate Prisma client
npm run db:generate

# Create database tables
npm run db:migrate
```

## 4. Start Development Server
```bash
npm run dev
```

## 5. First Steps

1. **Create a Tenant**: Go to http://localhost:3000/admin/tenants
2. **Upload CSV**: Go to http://localhost:3000/admin/upload
3. **View Dashboard**: Click "View Dashboard" from tenants page

## Database Management

- View database: `npm run db:studio`
- Create migration: `npm run db:migrate`
- Push schema changes: `npm run db:push`

## Troubleshooting

### Database Connection Issues
- Make sure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists

### CSV Upload Fails
- Check file format matches expected columns
- Ensure tenant exists
- Check server logs for errors

### Map Not Showing
- Leaflet loads dynamically on client side
- Check browser console for errors
- Ensure visitors have lat/lng coordinates

### AI Summary Not Generating
- Verify OPENAI_API_KEY is set
- Check API key is valid
- Review server logs for OpenAI errors

