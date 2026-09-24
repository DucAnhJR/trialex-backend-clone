import {
  calculateCompletionPromptAt,
  calculateScheduledDate,
  getLocalDueTime,
} from './schedule-date';

describe('calculateScheduledDate', () => {
  it('clamps a month-end anchor to the last day of the target month', () => {
    const result = calculateScheduledDate(
      '2025-01-31',
      'months_after',
      1,
      'Australia/Melbourne',
    );

    expect(result.scheduledLocalDate).toBe('2025-02-28');
  });

  it('preserves leap-day month-end behaviour', () => {
    const result = calculateScheduledDate(
      '2024-01-31',
      'months_after',
      1,
      'Australia/Melbourne',
    );

    expect(result.scheduledLocalDate).toBe('2024-02-29');
  });

  it('keeps the local due time through a daylight-saving change', () => {
    const result = calculateScheduledDate(
      '2024-09-06',
      'months_after',
      1,
      'Australia/Melbourne',
      '09:00',
    );

    expect(result.scheduledLocalDate).toBe('2024-10-06');
    expect(result.dueAt.toISOString()).toBe('2024-10-05T22:00:00.000Z');
    expect(getLocalDueTime(result.dueAt, 'Australia/Melbourne')).toBe('09:00');
  });
});

describe('calculateCompletionPromptAt', () => {
  it('uses local calendar days across the end of daylight saving', () => {
    const dueAt = new Date('2025-04-04T22:00:00.000Z'); // 09:00 Melbourne

    const promptAt = calculateCompletionPromptAt(
      '2025-04-05',
      dueAt,
      1,
      'Australia/Melbourne',
    );

    expect(promptAt.toISOString()).toBe('2025-04-05T23:00:00.000Z');
    expect(getLocalDueTime(promptAt, 'Australia/Melbourne')).toBe('09:00');
  });
});
