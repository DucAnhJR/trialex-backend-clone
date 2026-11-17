import { createHash } from 'crypto';
import { Model, Types } from 'mongoose';
import { HEALTH_THEMES } from './health-themes';
import { TrialPreference } from './schemas/trial-preference.schema';

export const themeCode = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// Provision the requested catalog without deleting legacy categories or changing
// IDs already selected by users. Also used by the explicit seed command.
export async function loadPreferenceCatalog(model: Model<TrialPreference>) {
  const existing = await model.find().lean();
  const operations = HEALTH_THEMES.flatMap((name) => {
    const code = themeCode(name);
    const match = existing.find(
      (item) =>
        item.code === code ||
        item.trial_preferences_name?.trim().toLowerCase() ===
          name.toLowerCase(),
    );
    if (match?.code === code && match.trial_preferences_name === name)
      return [];
    const newId = new Types.ObjectId(
      createHash('sha256')
        .update(`trialex-health-theme:${code}`)
        .digest('hex')
        .slice(0, 24),
    );
    return [
      {
        updateOne: {
          filter: { _id: match?._id || newId },
          update: {
            $set: { code, trial_preferences_name: name },
            $setOnInsert: { image: 'images.clinicalTrials' },
          },
          upsert: true,
        },
      },
    ];
  });
  if (operations.length) {
    try {
      await model.bulkWrite(operations, { ordered: false });
    } catch (error) {
      // A concurrent first request may have inserted the same catalog codes.
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    return model.find().lean();
  }
  return existing;
}
