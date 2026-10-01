import prismaPkg from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { env } from './env.js';

const { PrismaClient } = prismaPkg;

export const prisma = new PrismaClient({ adapter: new PrismaMssql(env.DATABASE_URL) });

export async function dbStatus() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
}
