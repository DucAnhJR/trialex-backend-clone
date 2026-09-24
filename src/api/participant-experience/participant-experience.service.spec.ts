import { TrialStatus } from '@/database/enums/trials.enum';
import { UserRole } from '@/database/enums/user.enum';
import { Types } from 'mongoose';
import { GLOBAL_ONBOARDING_FIELDS } from './default-participant-configuration';
import { ParticipantExperienceService } from './participant-experience.service';

describe('ParticipantExperienceService completion prompt response', () => {
  const service = Object.create(
    ParticipantExperienceService.prototype,
  ) as ParticipantExperienceService;
  const toResponse = (
    instance: Record<string, unknown>,
    now: Date,
    fallbackPrompt?: Record<string, unknown>,
  ) =>
    (
      service as unknown as {
        toQuestionnaireResponse: (
          value: Record<string, unknown>,
          fallback: Record<string, unknown> | undefined,
          currentTime: Date,
        ) => Record<string, unknown>;
      }
    ).toQuestionnaireResponse(instance, fallbackPrompt, now);

  const instance = {
    _id: 'instance-1',
    trial_record_id: 'record-1',
    trial_id: 'trial-1',
    user_id: 'user-1',
    questionnaire_key: 'week_3',
    scheduled_local_date: '2025-04-05',
    timezone: 'Australia/Melbourne',
    due_at: new Date('2025-04-04T22:00:00.000Z'),
    status: 'due',
    completion_prompt: {
      enabled: true,
      days_after_due: 1,
      modes: ['REDCap', 'Post'],
    },
  };

  it('returns due only after the configured local calendar-day offset', () => {
    expect(
      toResponse(instance, new Date('2025-04-05T22:59:59.999Z'))
        .completion_prompt_due,
    ).toBe(false);
    expect(
      toResponse(instance, new Date('2025-04-05T23:00:00.000Z'))
        .completion_prompt_due,
    ).toBe(true);
  });

  it('does not return a prompt after it was answered or dismissed', () => {
    expect(
      toResponse(
        { ...instance, prompt_answered_at: new Date() },
        new Date('2025-04-06T00:00:00.000Z'),
      ).completion_prompt_due,
    ).toBe(false);
    expect(
      toResponse(
        { ...instance, prompt_dismissed_at: new Date() },
        new Date('2025-04-06T00:00:00.000Z'),
      ).completion_prompt_due,
    ).toBe(false);
  });

  it('uses the enrolment configuration for instances created before snapshotting', () => {
    const legacyInstance = { ...instance, completion_prompt: undefined };
    expect(
      toResponse(legacyInstance, new Date('2025-04-06T00:00:00.000Z'), {
        enabled: true,
        days_after_due: 1,
        modes: [],
      }).completion_prompt_due,
    ).toBe(true);
  });
});

describe('ParticipantExperienceService enrolment workflow', () => {
  const userId = new Types.ObjectId();
  const trialId = new Types.ObjectId();
  const recordId = new Types.ObjectId();
  const configurationId = new Types.ObjectId();

  const adminLookup = () => ({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({ role: UserRole.ADMIN }),
    }),
  });

  it('submits onboarding with compare-and-set and stores only the record ID on User', async () => {
    const record = { _id: recordId, toObject: () => ({ _id: recordId }) };
    const userModel = { updateOne: jest.fn(), findById: jest.fn() };
    const configModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: configurationId,
          version: 3,
          status: 'published',
        }),
      }),
    };
    const trialRecordModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue(record),
    };
    const service = new ParticipantExperienceService(
      userModel as never,
      {} as never,
      trialRecordModel as never,
      configModel as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.submitOnboarding(trialId, userId, {
      configuration_version: 3,
      idempotency_key: 'request-1',
      answers: {
        surgery_date: '2026-01-31',
        surgery_location: 'Birmingham Hospital',
        participant_id: 'ACL-ODS-1234',
      },
    });

    expect(trialRecordModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ trial_id: trialId, user_id: userId }),
      expect.objectContaining({
        $set: expect.objectContaining({
          onboarding_status: 'pending_approval',
        }),
      }),
      expect.objectContaining({ upsert: true, new: true }),
    );
    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: userId },
      { $addToSet: { trial_records: recordId } },
    );
  });

  it('returns the winning onboarding only for a matching idempotency key', async () => {
    const duplicateKeyError = Object.assign(new Error('duplicate'), {
      code: 11000,
    });
    const existing = {
      onboarding_status: 'pending_approval',
      onboarding_idempotency_key: 'request-1',
      toObject: jest.fn().mockReturnValue({ _id: recordId }),
    };
    const trialRecordModel = {
      findOneAndUpdate: jest.fn().mockRejectedValue(duplicateKeyError),
      findOne: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(existing),
      }),
    };
    const service = new ParticipantExperienceService(
      {} as never,
      {} as never,
      trialRecordModel as never,
      {
        findOne: jest
          .fn()
          .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
      } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const answers = {
      surgery_date: '2026-01-31',
      surgery_location: 'Birmingham Hospital',
      participant_id: 'ACL-ODS-1234',
    };

    await expect(
      service.submitOnboarding(trialId, userId, {
        idempotency_key: 'request-1',
        answers,
      }),
    ).resolves.toEqual({ _id: recordId });
    await expect(
      service.submitOnboarding(trialId, userId, {
        idempotency_key: 'different-request',
        answers,
      }),
    ).rejects.toThrow('already been submitted');
  });

  it('requires surgery location and participant ID, and rejects the retired health field', async () => {
    const service = new ParticipantExperienceService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const validateAnswers = service as unknown as {
      validateAnswers: (
        fields: unknown,
        answers: Record<string, unknown>,
      ) => Record<string, unknown>;
    };
    expect(() =>
      validateAnswers.validateAnswers(GLOBAL_ONBOARDING_FIELDS, {
        surgery_date: '2026-01-31',
        participant_id: 'ACL-ODS-1234',
      }),
    ).toThrow('surgery_location is required');
    expect(() =>
      validateAnswers.validateAnswers(GLOBAL_ONBOARDING_FIELDS, {
        surgery_date: '2026-01-31',
        surgery_location: 'Birmingham Hospital',
        participant_id: 'ACL-ODS-1234',
        health_conditions: 'No known health conditions',
      }),
    ).toThrow('Unknown onboarding field: health_conditions');
    expect(
      validateAnswers.validateAnswers(GLOBAL_ONBOARDING_FIELDS, {
        surgery_date: '2026-01-31',
        surgery_location: ' Birmingham Hospital ',
        participant_id: ' ACL-ODS-1234 ',
      }),
    ).toEqual({
      surgery_date: '2026-01-31',
      surgery_location: 'Birmingham Hospital',
      participant_id: 'ACL-ODS-1234',
    });
  });

  it('approves an enrolment without exposing Calendar when no schedule exists', async () => {
    const record = {
      _id: recordId,
      trial_id: trialId,
      user_id: userId,
      onboarding_answers: [
        { field_id: 'surgery_date', value: '2026-01-31' },
        { field_id: 'surgery_location', value: 'Birmingham Hospital' },
        { field_id: 'participant_id', value: 'ACL-ODS-1234' },
      ],
      onboarding_status: 'pending_approval',
      has_questionnaire_schedule: false,
      trial_status: TrialStatus.PENDING,
      is_approved: false,
      is_active: false,
      approval_date: null as Date | null,
      approved_by: null as Types.ObjectId | null,
      save: jest.fn(),
      toObject: jest.fn().mockReturnValue({ _id: recordId }),
    };
    const userModel = { findById: jest.fn().mockImplementation(adminLookup) };
    const trialRecordModel = { findById: jest.fn().mockResolvedValue(record) };
    const configModel = {
      findOne: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    };
    const notifications = { sendPushNotification: jest.fn() };
    const service = new ParticipantExperienceService(
      userModel as never,
      {} as never,
      trialRecordModel as never,
      configModel as never,
      {} as never,
      notifications as never,
      {} as never,
    );

    await service.approve(recordId, userId);

    expect(record.onboarding_status).toBe('approved');
    expect(record.has_questionnaire_schedule).toBe(false);
    expect(record.trial_status).toBe(TrialStatus.IN_PROGRESS);
    expect(record.save).toHaveBeenCalledTimes(1);
    expect(notifications.sendPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({ data: undefined }),
    );
  });

  it('approves with a snapshotted month-end schedule and queues its reminder', async () => {
    const record = {
      _id: recordId,
      trial_id: trialId,
      user_id: userId,
      configuration_id: configurationId,
      configuration_version: 1,
      onboarding_answers: [
        {
          field_id: 'surgery_date',
          value: '2030-01-31',
          submitted_at: new Date(),
        },
        {
          field_id: 'surgery_location',
          value: 'Birmingham Hospital',
          submitted_at: new Date(),
        },
        {
          field_id: 'participant_id',
          value: 'ACL-ODS-1234',
          submitted_at: new Date(),
        },
      ],
      onboarding_status: 'pending_approval',
      has_questionnaire_schedule: false,
      trial_status: TrialStatus.PENDING,
      is_approved: false,
      is_active: false,
      approval_date: null as Date | null,
      approved_by: null as Types.ObjectId | null,
      anchor_date: null as Date | null,
      anchor_timezone: null as string | null,
      save: jest.fn(),
      toObject: jest.fn().mockReturnValue({ _id: recordId }),
    };
    const configuration = {
      _id: configurationId,
      version: 2,
      status: 'published',
      schedule: {
        timezone: 'Australia/Melbourne',
        questionnaires: [
          {
            key: 'month_1',
            rule: 'months_after',
            offset: 1,
            due_time: '09:00',
          },
        ],
        reminders: { offsets: [14] },
      },
      completion_prompt: {
        enabled: true,
        days_after_due: 3,
        modes: ['REDCap'],
      },
    };
    const createdInstances: Array<Record<string, unknown>> = [];
    const InstanceModel = jest.fn().mockImplementation(function (
      this: Record<string, unknown>,
      value: Record<string, unknown>,
    ) {
      Object.assign(this, value, {
        _id: new Types.ObjectId(),
        save: jest.fn(),
      });
      this.toObject = () => ({ ...this });
      createdInstances.push(this);
    });
    Object.assign(InstanceModel, {
      findOne: jest.fn().mockResolvedValue(null),
    });
    const userModel = { findById: jest.fn().mockImplementation(adminLookup) };
    const trialRecordModel = { findById: jest.fn().mockResolvedValue(record) };
    const configModel = {
      findById: jest.fn().mockResolvedValue(configuration),
    };
    const notifications = { sendPushNotification: jest.fn() };
    const notificationQueue = {
      add: jest.fn().mockImplementation(() => {
        expect(record).toEqual(
          expect.objectContaining({
            onboarding_status: 'approved',
            trial_status: 'inprogress',
            is_active: true,
          }),
        );
      }),
    };
    const service = new ParticipantExperienceService(
      userModel as never,
      {} as never,
      trialRecordModel as never,
      configModel as never,
      InstanceModel as never,
      notifications as never,
      notificationQueue as never,
    );

    await service.approve(recordId, userId);

    expect(createdInstances).toHaveLength(1);
    expect(createdInstances[0]).toEqual(
      expect.objectContaining({
        scheduled_local_date: '2030-02-28',
        timezone: 'Australia/Melbourne',
        completion_modes: ['REDCap'],
      }),
    );
    expect(record.configuration_version).toBe(2);
    expect(record.has_questionnaire_schedule).toBe(true);
    expect(record.anchor_timezone).toBe('Australia/Melbourne');
    expect(record.save).toHaveBeenCalledTimes(2);
    expect(notificationQueue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        data: expect.objectContaining({
          trialRecordId: recordId.toString(),
        }),
      }),
      expect.objectContaining({
        jobId: expect.stringContaining('reminder:14'),
      }),
    );
  });

  it('declines pending onboarding and cancels defensive questionnaire instances', async () => {
    const record = {
      _id: recordId,
      user_id: userId,
      onboarding_status: 'pending_approval',
      trial_status: TrialStatus.PENDING,
      is_approved: false,
      is_active: false,
      has_questionnaire_schedule: false,
      declined_by: null as Types.ObjectId | null,
      declined_at: null as Date | null,
      decision_note: null as string | null,
      save: jest.fn(),
      toObject: jest.fn().mockReturnValue({ _id: recordId }),
    };
    const userModel = { findById: jest.fn().mockImplementation(adminLookup) };
    const trialRecordModel = { findById: jest.fn().mockResolvedValue(record) };
    const instanceModel = { updateMany: jest.fn() };
    const notifications = { sendPushNotification: jest.fn() };
    const service = new ParticipantExperienceService(
      userModel as never,
      {} as never,
      trialRecordModel as never,
      {} as never,
      instanceModel as never,
      notifications as never,
      {} as never,
    );

    await service.decline(recordId, userId, {
      decision_note: ' Not eligible ',
    });

    expect(record.onboarding_status).toBe('declined');
    expect(record.trial_status).toBe(TrialStatus.DECLINED);
    expect(record.decision_note).toBe('Not eligible');
    expect(instanceModel.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ trial_record_id: recordId }),
      { $set: { status: 'cancelled' } },
    );
  });

  it('uses a retired configuration snapshot when approving a pending enrolment', async () => {
    const record = {
      _id: recordId,
      trial_id: trialId,
      user_id: userId,
      configuration_id: configurationId,
      onboarding_answers: [
        { field_id: 'surgery_date', value: '2030-01-31' },
        { field_id: 'surgery_location', value: 'Birmingham Hospital' },
        { field_id: 'participant_id', value: 'ACL-ODS-1234' },
      ],
      onboarding_status: 'pending_approval',
      has_questionnaire_schedule: false,
      is_approved: false,
      is_active: false,
      trial_status: TrialStatus.PENDING,
      save: jest.fn(),
      toObject: jest.fn().mockReturnValue({ _id: recordId }),
    };
    const configuration = {
      _id: configurationId,
      version: 1,
      status: 'retired',
      schedule: {
        timezone: 'Australia/Melbourne',
        questionnaires: [
          { key: 'baseline', rule: 'days_after', offset: 0 },
        ],
      },
      completion_prompt: { enabled: false },
    };
    const userModel = { findById: jest.fn().mockImplementation(adminLookup) };
    const trialRecordModel = { findById: jest.fn().mockResolvedValue(record) };
    const configModel = { findById: jest.fn().mockResolvedValue(configuration) };
    const service = new ParticipantExperienceService(
      userModel as never,
      {} as never,
      trialRecordModel as never,
      configModel as never,
      {} as never,
      { sendPushNotification: jest.fn() } as never,
      {} as never,
    );
    const serviceWithPrivateSchedule = service as unknown as {
      createSchedule: (record: unknown, config: unknown) => Promise<void>;
    };
    const createSchedule = jest
      .spyOn(serviceWithPrivateSchedule, 'createSchedule')
      .mockResolvedValue(undefined);

    await service.approve(recordId, userId);

    expect(record.has_questionnaire_schedule).toBe(true);
    expect(createSchedule).toHaveBeenCalledWith(record, configuration);
  });

  it('does not approve a pending record submitted with the retired onboarding fields', async () => {
    const record = {
      _id: recordId,
      onboarding_status: 'pending_approval',
      onboarding_answers: [
        { field_id: 'surgery_date', value: '2026-01-31' },
        { field_id: 'health_conditions', value: 'No known health conditions' },
      ],
      save: jest.fn(),
    };
    const service = new ParticipantExperienceService(
      { findById: jest.fn().mockImplementation(adminLookup) } as never,
      {} as never,
      { findById: jest.fn().mockResolvedValue(record) } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.approve(recordId, userId)).rejects.toThrow(
      'surgery_location is required',
    );
    expect(record.save).not.toHaveBeenCalled();
  });

  it('returns an approved active calendar, promotes due items, and exposes a due completion prompt', async () => {
    const dueDocument = {
      status: 'upcoming',
      save: jest.fn(),
    };
    const calendarInstance = {
      _id: new Types.ObjectId(),
      trial_record_id: recordId,
      trial_id: trialId,
      user_id: userId,
      scheduled_local_date: '2020-01-31',
      timezone: 'Australia/Melbourne',
      due_at: new Date('2020-01-30T22:00:00.000Z'),
      status: 'due',
    };
    const trialRecordModel = {
      findOne: jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValue({ configuration_id: configurationId }),
      }),
    };
    const instanceModel = {
      find: jest
        .fn()
        .mockResolvedValueOnce([dueDocument])
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([calendarInstance]),
          }),
        }),
    };
    const configModel = {
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          completion_prompt: {
            enabled: true,
            days_after_due: 0,
            modes: ['Phone'],
          },
        }),
      }),
    };
    const service = new ParticipantExperienceService(
      {} as never,
      {} as never,
      trialRecordModel as never,
      configModel as never,
      instanceModel as never,
      {} as never,
      {} as never,
    );

    const result = await service.calendar(recordId, userId);

    expect(trialRecordModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: recordId,
        user_id: userId,
        onboarding_status: 'approved',
        is_active: true,
      }),
    );
    expect(dueDocument.status).toBe('due');
    expect(dueDocument.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      expect.objectContaining({
        _id: calendarInstance._id.toString(),
        completion_prompt_due: true,
      }),
    ]);
  });

  it('aggregates questionnaire calendars from every owned active enrolment', async () => {
    const secondRecordId = new Types.ObjectId();
    const trialRecordModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue([{ _id: recordId }, { _id: secondRecordId }]),
        }),
      }),
    };
    const service = new ParticipantExperienceService(
      {} as never,
      {} as never,
      trialRecordModel as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const calendar = jest
      .spyOn(service, 'calendar')
      .mockResolvedValueOnce([
        { due_at: new Date('2026-09-24T00:00:00.000Z'), _id: 'later' },
      ] as never)
      .mockResolvedValueOnce([
        { due_at: new Date('2026-09-23T00:00:00.000Z'), _id: 'earlier' },
      ] as never);

    const result = await service.calendarForUser(userId);

    expect(trialRecordModel.find).toHaveBeenCalledWith({
      user_id: userId,
      onboarding_status: 'approved',
      trial_status: {
        $in: [
          TrialStatus.IN_PROGRESS,
          TrialStatus.COMPLETED,
          TrialStatus.IN_COMPLETE,
        ],
      },
      is_active: true,
    });
    expect(calendar).toHaveBeenNthCalledWith(1, recordId, userId);
    expect(calendar).toHaveBeenNthCalledWith(2, secondRecordId, userId);
    expect(result.map((item) => item._id)).toEqual(['earlier', 'later']);
  });

  it('submits a native questionnaire and suppresses its completion prompt', async () => {
    const instance = {
      _id: new Types.ObjectId(),
      status: 'due',
      delivery: {
        type: 'native',
        fields: [
          { id: 'pain_score', type: 'number', required: true, min: 0, max: 10 },
        ],
      },
      answers: [] as { field_id: string; value: unknown }[],
      completion: null as Record<string, unknown> | null,
      prompt_answered_at: null as Date | null,
      save: jest.fn(),
      toObject() {
        return { ...this };
      },
    };
    const instanceModel = { findOne: jest.fn().mockResolvedValue(instance) };
    const service = new ParticipantExperienceService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      instanceModel as never,
      {} as never,
      {} as never,
    );

    await service.submitNativeQuestionnaire(instance._id, userId, {
      answers: { pain_score: 7 },
    });

    expect(instance.status).toBe('completed');
    expect(instance.answers).toEqual([{ field_id: 'pain_score', value: 7 }]);
    expect(instance.prompt_answered_at).toBeInstanceOf(Date);
    expect(instance.save).toHaveBeenCalledTimes(1);
  });

  it('does not expose or accept a future questionnaire before its due date', async () => {
    const upcoming = {
      _id: new Types.ObjectId(),
      status: 'upcoming',
      delivery: { type: 'native', fields: [] },
      save: jest.fn(),
    };
    const instanceModel = {
      findOne: jest
        .fn()
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(upcoming),
        })
        .mockResolvedValueOnce(upcoming)
        .mockResolvedValueOnce(upcoming),
    };
    const service = new ParticipantExperienceService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      instanceModel as never,
      {} as never,
      {} as never,
    );

    await expect(service.getQuestionnaire(upcoming._id, userId)).rejects.toThrow(
      'not available yet',
    );
    await expect(
      service.complete(upcoming._id, userId, { reported_completed: true }),
    ).rejects.toThrow('not available yet');
    await expect(
      service.submitNativeQuestionnaire(upcoming._id, userId, { answers: {} }),
    ).rejects.toThrow('not available yet');
    expect(upcoming.save).not.toHaveBeenCalled();
  });

  it('accepts only the configured completion modes', async () => {
    const instance = {
      _id: new Types.ObjectId(),
      status: 'due',
      completion_modes: ['REDCap', 'Postal return'],
      completion: null as Record<string, unknown> | null,
      save: jest.fn(),
      toObject() {
        return { ...this };
      },
    };
    const instanceModel = { findOne: jest.fn().mockResolvedValue(instance) };
    const service = new ParticipantExperienceService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      instanceModel as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.complete(instance._id, userId, {
        reported_completed: true,
        mode: 'Made up method',
      }),
    ).rejects.toThrow('not allowed');
    await expect(
      service.complete(instance._id, userId, { reported_completed: true }),
    ).rejects.toThrow('required');
    await expect(
      service.complete(instance._id, userId, {
        reported_completed: true,
        mode: ' REDCap ',
      }),
    ).resolves.toEqual(expect.objectContaining({ completion_prompt_due: false }));
    expect(instance.completion).toEqual(
      expect.objectContaining({ mode: 'REDCap' }),
    );
  });
});
