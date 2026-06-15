import { BANNER_DATA } from '@/api/banners/data/banner.data';
import mongoose from 'mongoose';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  await mongoose.connect(databaseUrl, {
    tls: process.env.DATABASE_TLS_ENABLED === 'true',
    ssl: process.env.DATABASE_SSL_ENABLED === 'true',
  });

  const collection = mongoose.connection.collection('banners');
  const result = await collection.bulkWrite(
    BANNER_DATA.map((banner) => ({
      updateOne: {
        filter: { title: banner.title },
        update: { $set: banner },
        upsert: true,
      },
    })),
  );

  console.info(
    `Seeded banners: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`,
  );

  await mongoose.disconnect();
}

main().catch(async (error: unknown) => {
  console.error('Failed to seed banners.');
  console.error(error);

  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
