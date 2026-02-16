# Database Setup Guide

## Current Issue

The application is showing Prisma connection errors. This means the database needs to be set up.

## Setup Steps

### Option 1: Using Prisma Accelerate (Current Setup)

Your `.env` file shows you're using Prisma Accelerate. To set up:

1. **Ensure your database is running and accessible**
   - The Accelerate URL in your `.env` points to `localhost:51213`
   - Make sure PostgreSQL is running on that port

2. **Push the schema to create tables:**
   ```bash
   npx prisma db push
   ```

3. **If the database isn't accessible, you may need to:**
   - Start your local PostgreSQL server
   - Or update the `DATABASE_URL` in `.env` to point to a running database
   - Or set up a new database connection

### Option 2: Using Direct PostgreSQL Connection

If you want to use a direct PostgreSQL connection instead of Accelerate:

1. **Update `.env`:**
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/pixel_insights?schema=public"
   ```

2. **Push the schema:**
   ```bash
   npx prisma db push
   ```

### Option 3: Using Supabase (Recommended for Development)

1. **Create a Supabase project** at https://supabase.com
2. **Get your connection string** from Supabase dashboard
3. **Update `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
   ```
4. **Push the schema:**
   ```bash
   npx prisma db push
   ```

## Verify Setup

After setting up, test the connection:

```bash
# Test the connection
npx prisma db pull

# Or check status
npx prisma migrate status
```

## Troubleshooting

- **"Can't reach database server"**: Database isn't running or connection string is wrong
- **"Invalid invocation"**: Prisma client might need regeneration - run `npx prisma generate`
- **Port mismatch**: Check that the port in `DATABASE_URL` matches your database server port

