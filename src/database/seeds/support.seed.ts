import { SUPPORT_FAQ_DATA } from '@/api/supports/data/support-faq.data';
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

  const collection = mongoose.connection.collection('support');
  const result = await collection.bulkWrite(
    SUPPORT_FAQ_DATA.map((supportFaq) => ({
      updateOne: {
        filter: { thread_title: supportFaq.thread_title },
        update: { $set: supportFaq },
        upsert: true,
      },
    })),
  );

  console.info(
    `Seeded support FAQs: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`,
  );

  await mongoose.disconnect();
}

main().catch(async (error: unknown) => {
  console.error('Failed to seed support FAQs.');
  console.error(error);

  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
