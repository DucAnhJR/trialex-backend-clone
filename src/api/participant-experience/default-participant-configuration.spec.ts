import {
  DEFAULT_COMPLETION_PROMPT,
  DEFAULT_PARTICIPANT_SCHEDULE,
  GLOBAL_ONBOARDING_FIELDS,
} from './default-participant-configuration';

describe('default participant configuration', () => {
  it('seeds the initial, +14 day, and +28 day questionnaire reminders', () => {
    expect(DEFAULT_PARTICIPANT_SCHEDULE.reminders.offsets).toEqual([0, 14, 28]);
  });

  it('leaves the prompt timing and modes for the customer rollout to choose', () => {
    expect(DEFAULT_COMPLETION_PROMPT).toEqual({ enabled: false, modes: [] });
  });

  it('uses the three customer-approved onboarding fields', () => {
    expect(GLOBAL_ONBOARDING_FIELDS).toEqual([
      expect.objectContaining({ id: 'surgery_date', type: 'date' }),
      expect.objectContaining({
        id: 'surgery_location',
        type: 'text',
        maxLength: 200,
      }),
      expect.objectContaining({
        id: 'participant_id',
        type: 'text',
        maxLength: 128,
      }),
    ]);
  });
});
