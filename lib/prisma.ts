import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Only create Prisma client if DATABASE_URL is available
// This allows the app to work on Vercel without a database
let prismaInstance: PrismaClient | null = null;

// Only create Prisma client if DATABASE_URL is set and not during build
if (process.env.DATABASE_URL && process.env.DATABASE_URL !== 'file:./dev.db') {
  try {
    prismaInstance = globalForPrisma.prisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance;
  } catch (error) {
    console.warn('Failed to initialize Prisma client:', error);
    prismaInstance = null;
  }
}

export const prisma = prismaInstance;
