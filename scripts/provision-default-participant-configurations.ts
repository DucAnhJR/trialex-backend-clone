import {
  DEFAULT_COMPLETION_PROMPT,
  DEFAULT_PARTICIPANT_SCHEDULE,
  GLOBAL_ONBOARDING_FIELDS,
} from '@/api/participant-experience/default-participant-configuration';
import { createHash } from 'crypto';
import mongoose, { Types } from 'mongoose';

// v3 replaces the unapproved health-condition field with surgery location and
// participant ID. The new key makes --replace-published publish an immutable
// replacement instead of silently retaining the old onboarding snapshot.
const BASE_PROVISIONING_KEY = 'participant-experience-standard-v3';
const shouldApply = process.argv.includes('--apply');
const replacePublished = process.argv.includes('--replace-published');

const getOptionValue = (name: string) => {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(
    prefix.length,
  );
};

type ProvisionedCompletionPrompt = {
  enabled: boolean;
  days_after_due?: number;
  modes: string[];
};

const getCompletionPrompt = (): ProvisionedCompletionPrompt => {
  const rawDays = getOptionValue('--completion-prompt-days');
  const rawModes = getOptionValue('--completion-modes');

  if (rawDays === undefined) {
    return {
      enabled: false,
      modes: DEFAULT_COMPLETION_PROMPT.modes,
    };
  }
  if (!/^\d+$/.test(rawDays)) {
    throw new Error('--completion-prompt-days must be a non-negative integer');
  }

  return {
    enabled: true,
    days_after_due: Number(rawDays),
    modes: rawModes
      ? rawModes
          .split(',')
          .map((mode) => mode.trim())
          .filter(Boolean)
      : [],
  };
};

// A published configuration must be immutable. Include an enabled popup's
// settings in the provisioning key so --replace-published recognises this as
// a new configuration rather than incorrectly treating it as the old default.
// v2 remains recognisable as the retired pre-customer-approval configuration.
const getProvisioningKey = (completionPrompt: ProvisionedCompletionPrompt) => {
  if (
    !completionPrompt.enabled ||
    completionPrompt.days_after_due === undefined
  ) {
    return BASE_PROVISIONING_KEY;
  }

  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        days_after_due: completionPrompt.days_after_due,
        modes: completionPrompt.modes,
      }),
    )
    .digest('hex')
    .slice(0, 12);
  return `${BASE_PROVISIONING_KEY}-prompt-${fingerprint}`;
};

type TrialRow = {
  _id: Types.ObjectId;
  overview?: { name?: string };
};

type ConfigurationRow = {
  _id: Types.ObjectId;
  trial_id: Types.ObjectId;
  version: number;
  status: 'draft' | 'published' | 'retired';
  onboarding: { fields: unknown[] };
  schedule: Record<string, unknown>;
  approval: { required: boolean };
  completion_prompt: Record<string, unknown>;
  published_at?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  provisioning_key?: string;
};

const printUsage = () => {
  console.info(`
Provision the shared participant onboarding + six-questionnaire schedule.
The default includes an initial questionnaire reminder, then +14 and +28 days.

Usage:
  pnpm provision:participant-configurations
  pnpm provision:participant-configurations --apply
  pnpm provision:participant-configurations --apply --replace-published
  pnpm provision:participant-configurations --apply --replace-published --completion-prompt-days=14 --completion-modes="REDCap,Postal return"

Without --apply this is a dry-run and writes nothing.
--replace-published creates a new standard version when the standard settings
change, then retires the old version. Existing
participant enrolments keep their own configuration snapshot.
--completion-prompt-days enables the completion popup after that many local
calendar days. --completion-modes is an optional comma-separated list.
`);
};

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  await mongoose.connect(databaseUrl, {
    tls: process.env.DATABASE_TLS_ENABLED === 'true',
    ssl: process.env.DATABASE_SSL_ENABLED === 'true',
  });

  const trials = mongoose.connection.collection<TrialRow>('trials');
  const configurations = mongoose.connection.collection<ConfigurationRow>('trial_participant_configurations');
  const allTrials = await trials.find({}, { projection: { _id: 1, 'overview.name': 1 } }).toArray();

  let created = 0;
  let skipped = 0;
  let wouldCreate = 0;
  const completionPrompt = getCompletionPrompt();
  const provisioningKey = getProvisioningKey(completionPrompt);

  for (const trial of allTrials) {
    const published = await configurations.findOne({ trial_id: trial._id, status: 'published' });
    const label = trial.overview?.name ? ` (${trial.overview.name})` : '';

    if (published?.provisioning_key === provisioningKey) {
      skipped += 1;
      console.info(`Skip ${trial._id.toString()}${label}: standard configuration is already published.`);
      continue;
    }

    if (published && !replacePublished) {
      skipped += 1;
      console.info(`Skip ${trial._id.toString()}${label}: a published configuration already exists.`);
      continue;
    }

    const latest = await configurations.findOne(
      { trial_id: trial._id },
      { sort: { version: -1 }, projection: { version: 1 } },
    );
    const version = (latest?.version || 0) + 1;

    if (!shouldApply) {
      wouldCreate += 1;
      console.info(`Would publish v${version} for ${trial._id.toString()}${label}.`);
      continue;
    }

    // The partial unique index permits one published version. Retiring first
    // retains history; a participant's existing snapshot is never rewritten.
    if (published) {
      await configurations.updateOne(
        { _id: published._id, status: 'published' },
        { $set: { status: 'retired', updatedAt: new Date() } },
      );
    }

    const now = new Date();
    await configurations.insertOne({
      _id: new Types.ObjectId(),
      trial_id: trial._id,
      version,
      status: 'published',
      onboarding: { fields: GLOBAL_ONBOARDING_FIELDS },
      schedule: DEFAULT_PARTICIPANT_SCHEDULE,
      approval: { required: true },
      completion_prompt: completionPrompt,
      provisioning_key: provisioningKey,
      published_at: now,
      createdAt: now,
      updatedAt: now,
    });
    created += 1;
    console.info(`Published v${version} for ${trial._id.toString()}${label}.`);
  }

  if (shouldApply) {
    console.info(`Done: ${created} published, ${skipped} skipped.`);
  } else {
    console.info(`Dry-run complete: ${wouldCreate} would be published, ${skipped} skipped. Run again with --apply to write.`);
  }
}

main()
  .catch((error: unknown) => {
    console.error('Failed to provision participant configurations.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
