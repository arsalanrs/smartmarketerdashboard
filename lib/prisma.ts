import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const isAccelerate = process.env.DATABASE_URL.startsWith('prisma+')

  try {
    if (isAccelerate) {
      return new PrismaClient({
        accelerateUrl: process.env.DATABASE_URL,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      })
    }

    const { Pool } = require('pg') as typeof import('pg')
    const { PrismaPg } = require('@prisma/adapter-pg') as typeof import('@prisma/adapter-pg')

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })

    const adapter = new PrismaPg(pool)

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    throw error
  }
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/**
 * Lazily creates the client on first property access so `next build` can import
 * route modules without DATABASE_URL until a query actually runs.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma()
    const value = Reflect.get(client, prop, receiver) as unknown
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

if (process.env.NODE_ENV === 'development' && process.env.DATABASE_URL) {
  getPrisma()
    .$connect()
    .catch((error: Error) => {
      console.error('⚠️  Prisma connection error:', error.message)
      console.error('💡 Make sure your database is running and accessible')
      console.error(
        '💡 If using Prisma Accelerate, ensure your database is set up and the Accelerate URL is valid'
      )
    })
}
