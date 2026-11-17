import { Types } from 'mongoose';
import { loadPreferenceCatalog } from './preference-catalog';
import { HEALTH_THEMES } from './health-themes';

it('provisions all customer themes, reuses matching legacy IDs, and never deletes unknown historical selections', async () => {
  const cancerId = new Types.ObjectId();
  const legacyId = new Types.ObjectId();
  const existing = [
    { _id: cancerId, trial_preferences_name: 'Cancer' },
    { _id: legacyId, trial_preferences_name: 'Old custom theme' },
  ];
  const model = {
    find: jest
      .fn()
      .mockReturnValue({ lean: jest.fn().mockResolvedValue(existing) }),
    bulkWrite: jest.fn().mockResolvedValue({}),
  };
  await loadPreferenceCatalog(model as never);
  const writes = model.bulkWrite.mock.calls[0][0];
  expect(writes).toHaveLength(HEALTH_THEMES.length);
  expect(
    writes.find(
      (entry) =>
        entry.updateOne.update.$set.trial_preferences_name === 'Cancer',
    ).updateOne.filter,
  ).toEqual({ _id: cancerId });
  expect(
    writes.every(
      (entry) => entry.updateOne && !entry.deleteOne && !entry.deleteMany,
    ),
  ).toBe(true);
  expect(writes.some((entry) => entry.updateOne.filter._id === legacyId)).toBe(
    false,
  );
});
