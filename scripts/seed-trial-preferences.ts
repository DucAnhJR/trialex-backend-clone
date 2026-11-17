import mongoose from 'mongoose';
import { HEALTH_THEMES } from '../src/api/users/health-themes';
import { loadPreferenceCatalog } from '../src/api/users/preference-catalog';
import {
  TrialPreference,
  TrialPreferenceSchema,
} from '../src/api/users/schemas/trial-preference.schema';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  await mongoose.connect(process.env.DATABASE_URL, {
    tls: process.env.DATABASE_TLS_ENABLED === 'true',
    ssl: process.env.DATABASE_SSL_ENABLED === 'true',
  });
  const model = mongoose.model<TrialPreference>(
    TrialPreference.name,
    TrialPreferenceSchema,
  );
  const catalog = await loadPreferenceCatalog(model);
  console.info(
    `Provisioned ${HEALTH_THEMES.length} customer categories; ${catalog.length} total including preserved legacy categories.`,
  );
}
main()
  .catch(() => {
    console.error('Unable to provision trial preferences.');
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
