import { env } from './env.js';
import { prisma } from './db.js';
import { createApp } from './app.js';
import { seed } from '../scripts/seed.js';

try {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log('SQL Server connected');
} catch (err) {
  console.error(`Failed to connect to SQL Server: ${err.message}`);
  process.exit(1);
}

// Idempotent: creates the admin/sample data on a fresh database, no-ops once seeded.
// This is what makes a fresh clone on another machine "just work" after `npm run dev`.
await seed();

const server = createApp().listen(env.PORT, () => {
  console.log(`FoundIt API listening on http://localhost:${env.PORT}/api/v1`);
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
