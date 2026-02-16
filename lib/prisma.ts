import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Check if using Prisma Accelerate (prisma+postgres://) or direct connection
  const isAccelerate = process.env.DATABASE_URL.startsWith('prisma+')
  
  try {
    if (isAccelerate) {
      // Use accelerateUrl for Prisma Accelerate
      return new PrismaClient({
        accelerateUrl: process.env.DATABASE_URL,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      })
    } else {
      // Use adapter for direct PostgreSQL connection
      const { Pool } = require('pg')
      const { PrismaPg } = require('@prisma/adapter-pg')
      
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      })
      
      const adapter = new PrismaPg(pool)
      
      return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      })
    }
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    throw error
  }
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient()

// Test connection on startup (optional, can be removed if causing issues)
if (process.env.NODE_ENV === 'development') {
  prisma.$connect().catch((error) => {
    console.error('⚠️  Prisma connection error:', error.message)
    console.error('💡 Make sure your database is running and accessible')
    console.error('💡 If using Prisma Accelerate, ensure your database is set up and the Accelerate URL is valid')
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

