import { readFile } from 'fs/promises';
import mongoose, { Types } from 'mongoose';

type Confirmation = {
  trial_record_id: string;
  administrator_id: string;
  informed_consent_obtained: true;
  eligibility_confirmed: true;
  study_team_confirmed_at: string;
  study_team_confirmation_reference: string;
};

// No application context: this script never starts workers or sends messages.
// Without --apply it only audits records and validates an optional manifest.
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const manifestPath = process.argv
    .find((arg) => arg.startsWith('--manifest='))
    ?.slice('--manifest='.length);
  const apply = process.argv.includes('--apply');
  if (apply && !manifestPath)
    throw new Error(
      '--apply requires --manifest with verified study-team confirmations',
    );
  const manifest: Confirmation[] = manifestPath
    ? JSON.parse(await readFile(manifestPath, 'utf8'))
    : [];
  if (!Array.isArray(manifest)) throw new Error('Manifest must be an array');
  const seen = new Set<string>();
  for (const item of manifest) {
    if (
      !Types.ObjectId.isValid(item.trial_record_id) ||
      !Types.ObjectId.isValid(item.administrator_id) ||
      item.informed_consent_obtained !== true ||
      item.eligibility_confirmed !== true ||
      !item.study_team_confirmation_reference?.trim() ||
      item.study_team_confirmation_reference.length > 500 ||
      !item.study_team_confirmed_at ||
      Number.isNaN(Date.parse(item.study_team_confirmed_at)) ||
      Date.parse(item.study_team_confirmed_at) > Date.now() ||
      seen.has(item.trial_record_id)
    ) {
      throw new Error(
        'Manifest contains an invalid, duplicate or unverified confirmation',
      );
    }
    seen.add(item.trial_record_id);
  }
  await mongoose.connect(databaseUrl, {
    tls: process.env.DATABASE_TLS_ENABLED === 'true',
    ssl: process.env.DATABASE_SSL_ENABLED === 'true',
  });
  const records = mongoose.connection.collection('trials_records');
  const users = mongoose.connection.collection('users');
  const activeFilter = {
    is_approved: true,
    is_active: true,
    trial_status: { $in: ['inprogress', 'completed', 'incomplete'] },
  };
  // Validate every target before applying the first change.
  for (const item of manifest) {
    if (
      !(await users.findOne(
        { _id: new Types.ObjectId(item.administrator_id), role: 'admin' },
        { projection: { _id: 1 } },
      ))
    ) {
      throw new Error(
        'Manifest administrator does not have administrator access',
      );
    }
    if (
      !(await records.findOne(
        { _id: new Types.ObjectId(item.trial_record_id), ...activeFilter },
        { projection: { _id: 1 } },
      ))
    ) {
      throw new Error(
        'Manifest target is not an approved active/history record',
      );
    }
  }
  if (apply)
    for (const item of manifest) {
      const result = await records.updateOne(
        { _id: new Types.ObjectId(item.trial_record_id), ...activeFilter },
        {
          $set: {
            informed_consent_obtained: true,
            eligibility_confirmed: true,
            study_team_confirmed_at: new Date(item.study_team_confirmed_at),
            study_team_confirmed_by: new Types.ObjectId(item.administrator_id),
            study_team_confirmation_reference:
              item.study_team_confirmation_reference.trim(),
            updatedAt: new Date(),
          },
        },
      );
      if (result.matchedCount !== 1)
        throw new Error(
          'Enrolment changed during verification; re-audit before continuing',
        );
    }
  const unverified = await records
    .find(
      {
        ...activeFilter,
        $or: [
          { informed_consent_obtained: { $ne: true } },
          { eligibility_confirmed: { $ne: true } },
        ],
      },
      { projection: { _id: 1, trial_id: 1, trial_status: 1 } },
    )
    .toArray();
  console.info(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'read-only',
        manifest_entries: manifest.length,
        records_requiring_study_team_verification: unverified,
      },
      null,
      2,
    ),
  );
  if (unverified.length) process.exitCode = 2;
}
main()
  .catch(() => {
    // Connection strings and confirmation references must not enter logs.
    console.error(
      'Verification failed. Check database access, manifest values and administrator/record status.',
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
