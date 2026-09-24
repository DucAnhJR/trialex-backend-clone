import { NotificationsService } from '@/api/notification/notifications.service';
import {
  TrialsRecord,
  TrialsRecordDocument,
} from '@/api/trials/schemas/trials-record.schema';
import { Trials, TrialsDocument } from '@/api/trials/schemas/trials.schema';
import { User, UserDocument } from '@/api/users/schemas/user.schema';
import { JobName, QueueName } from '@/constants/job.constant';
import { NotificationTypeEnum } from '@/database/enums/notification.enum';
import { TrialStatus } from '@/database/enums/trials.enum';
import { UserRole } from '@/database/enums/user.enum';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model, Types } from 'mongoose';
import {
  GLOBAL_ONBOARDING_FIELDS,
  OnboardingField,
  QuestionnaireField,
  QuestionnaireRule,
} from './default-participant-configuration';
import {
  CompleteQuestionnaireDto,
  DeclineTrialOnboardingDto,
  SubmitNativeQuestionnaireDto,
  SubmitTrialOnboardingDto,
  UpdateCompletionPromptDto,
} from './dto/submit-trial-onboarding.dto';
import {
  calculateCompletionPromptAt,
  calculateScheduledDate,
  getLocalDueTime,
  isValidDueTime,
  isValidIanaTimeZone,
} from './schedule-date';
import {
  QuestionnaireInstance,
  QuestionnaireInstanceDocument,
} from './schemas/questionnaire-instance.schema';
import {
  TrialParticipantConfiguration,
  TrialParticipantConfigurationDocument,
} from './schemas/trial-participant-configuration.schema';

const isValidDateOnly = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

type CompletionPromptConfiguration = {
  enabled: boolean;
  days_after_due: number;
  modes: string[];
};

// Questionnaire records form part of the participant's completion history.
// Keep them available in Calendar after the enrolment moves out of progress,
// while still excluding pending, declined and withdrawn enrolments.
const CALENDAR_VISIBLE_TRIAL_STATUSES = [
  TrialStatus.IN_PROGRESS,
  TrialStatus.COMPLETED,
  TrialStatus.IN_COMPLETE,
];

@Injectable()
export class ParticipantExperienceService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Trials.name)
    private readonly trialModel: Model<TrialsDocument>,
    @InjectModel(TrialsRecord.name)
    private readonly trialRecordModel: Model<TrialsRecordDocument>,
    @InjectModel(TrialParticipantConfiguration.name)
    private readonly configModel: Model<TrialParticipantConfigurationDocument>,
    @InjectModel(QuestionnaireInstance.name)
    private readonly instanceModel: Model<QuestionnaireInstanceDocument>,
    private readonly notifications: NotificationsService,
    @InjectQueue(QueueName.NOTIFICATION)
    private readonly notificationQueue: Queue,
  ) {}

  async getPublishedConfiguration(trialId: Types.ObjectId) {
    return this.configModel
      .findOne({ trial_id: trialId, status: 'published' })
      .lean();
  }

  async createDraftConfiguration(
    trialId: Types.ObjectId,
    actorId: Types.ObjectId,
    body: {
      schedule?: Record<string, unknown>;
      completion_prompt?: Record<string, unknown>;
    } = {},
  ) {
    await this.assertAdmin(actorId);
    const trial = await this.trialModel.exists({ _id: trialId });
    if (!trial) throw new NotFoundException('Trial not found');
    const configuration = {
      onboarding: { fields: GLOBAL_ONBOARDING_FIELDS },
      schedule: body.schedule || {},
      // The required verification step is common to every trial.
      approval: { required: true },
      completion_prompt: body.completion_prompt || { enabled: false },
    };
    this.validateConfiguration(configuration);
    const latest = await this.configModel
      .findOne({ trial_id: trialId })
      .sort({ version: -1 })
      .lean();
    const config = new this.configModel({
      trial_id: trialId,
      version: (latest?.version || 0) + 1,
      status: 'draft',
      ...configuration,
    });
    await config.save();
    return this.toConfigurationResponse(config);
  }

  async publishConfiguration(
    configurationId: Types.ObjectId,
    actorId: Types.ObjectId,
  ) {
    await this.assertAdmin(actorId);
    const config = await this.configModel.findById(configurationId);
    if (!config) throw new NotFoundException('Configuration not found');
    if (config.status === 'published')
      return this.toConfigurationResponse(config);
    this.validateConfiguration(config);
    const publishedConfigurations = await this.configModel.find({
      trial_id: config.trial_id,
      status: 'published',
    });
    for (const publishedConfiguration of publishedConfigurations) {
      publishedConfiguration.status = 'retired';
      await publishedConfiguration.save();
    }
    config.status = 'published';
    config.published_at = new Date();
    await config.save();
    return this.toConfigurationResponse(config);
  }

  async submitOnboarding(
    trialId: Types.ObjectId,
    userId: Types.ObjectId,
    dto: SubmitTrialOnboardingDto,
  ) {
    const config = await this.getPublishedConfiguration(trialId);
    if (
      config &&
      dto.configuration_version !== undefined &&
      dto.configuration_version !== config.version
    ) {
      throw new BadRequestException(
        'The trial form has changed. Refresh and submit again.',
      );
    }
    const validatedAnswers = this.validateAnswers(
      GLOBAL_ONBOARDING_FIELDS,
      dto.answers || {},
    );

    const submittedAt = new Date();
    const answers = Object.entries(validatedAnswers).map(
      ([field_id, value]) => ({ field_id, value, submitted_at: submittedAt }),
    );

    try {
      // The conditional upsert and database unique index make retries and
      // concurrent requests converge on one enrolment. Once pending/approved,
      // the existing record is returned below without rewriting answers.
      const record = await this.trialRecordModel.findOneAndUpdate(
        {
          trial_id: trialId,
          user_id: userId,
          $or: [
            { onboarding_status: 'draft' },
            { onboarding_status: null },
            { onboarding_status: { $exists: false } },
          ],
        },
        {
          $set: {
            configuration_id: config?._id || null,
            configuration_version: config?.version || null,
            onboarding_answers: answers,
            onboarding_status: 'pending_approval',
            onboarding_idempotency_key: dto.idempotency_key || null,
            is_approved: false,
            is_active: false,
            trial_status: TrialStatus.PENDING,
          },
          $setOnInsert: {
            sign_up_date: submittedAt,
            has_questionnaire_schedule: false,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      await this.userModel.updateOne(
        { _id: userId },
        { $addToSet: { trial_records: record._id } },
      );
      return record.toObject();
    } catch (error) {
      // A competing upsert can lose the unique-index race. Return the record
      // that won when it is already safely submitted, otherwise preserve the
      // existing business-state error.
      if ((error as { code?: number }).code !== 11000) throw error;
      const existing = await this.trialRecordModel
        .findOne({ trial_id: trialId, user_id: userId })
        .select('+onboarding_idempotency_key');
      if (
        existing &&
        (existing.onboarding_status === 'pending_approval' ||
          existing.onboarding_status === 'approved')
      ) {
        if (
          !dto.idempotency_key ||
          existing.onboarding_idempotency_key === dto.idempotency_key
        ) {
          return existing.toObject();
        }
        throw new BadRequestException(
          'This trial onboarding has already been submitted',
        );
      }
      throw new BadRequestException('A trial enrolment already exists');
    }
  }

  async approve(trialRecordId: Types.ObjectId, actorId: Types.ObjectId) {
    await this.assertAdmin(actorId);
    const record = await this.trialRecordModel.findById(trialRecordId);
    if (!record) throw new NotFoundException('Trial enrolment not found');
    if (record.onboarding_status === 'approved') return record.toObject();
    if (record.onboarding_status !== 'pending_approval')
      throw new BadRequestException('This enrolment cannot be approved');
    // Do not approve a legacy pending record that was submitted against the
    // retired health-condition form. Staff must receive the three
    // customer-approved fields before granting trial access.
    this.validateAnswers(
      GLOBAL_ONBOARDING_FIELDS,
      Object.fromEntries(
        (record.onboarding_answers || []).map(({ field_id, value }) => [
          field_id,
          value,
        ]),
      ),
    );
    // A participant can submit the shared onboarding form before staff have
    // prepared a questionnaire schedule. In that case, freeze the currently
    // published schedule at approval time; never replace an already-snapshotted
    // configuration on an existing enrolment.
    const hasConfigurationSnapshot = Boolean(record.configuration_id);
    const config = hasConfigurationSnapshot
      ? await this.configModel.findById(record.configuration_id)
      : await this.getPublishedConfiguration(record.trial_id);
    const questionnaires = (
      config?.schedule as { questionnaires?: QuestionnaireRule[] } | undefined
    )?.questionnaires;
    // A pending enrolment keeps the configuration version that was published
    // when it submitted onboarding. That version may have been retired by a
    // later rollout, but it must remain usable for this enrolment's schedule.
    const hasSchedule =
      !!config &&
      (hasConfigurationSnapshot || config.status === 'published') &&
      Array.isArray(questionnaires) &&
      questionnaires.some((questionnaire) => questionnaire.enabled !== false);
    record.has_questionnaire_schedule = hasSchedule;
    if (hasSchedule && config) {
      record.configuration_id = config._id;
      record.configuration_version = config.version;
    }
    // Persist approval before queuing any immediate reminder. The queue worker
    // correctly refuses reminders for pending enrolments; if the schedule is
    // queued first, an offset-0 reminder can be processed and skipped before
    // this approval is visible in MongoDB.
    record.onboarding_status = 'approved';
    record.is_approved = true;
    record.is_active = true;
    record.trial_status = 'inprogress' as never;
    record.approval_date = new Date();
    record.approved_by = actorId;
    await record.save();
    if (hasSchedule && config) {
      await this.createSchedule(record, config);
    }
    await this.notifications.sendPushNotification({
      userId: record.user_id,
      title: 'Trial enrolment approved',
      message: hasSchedule
        ? 'You can now access your trial calendar.'
        : 'Your trial enrolment has been approved.',
      type: NotificationTypeEnum.ALERT,
      data: hasSchedule
        ? { trialRecordId: record._id.toString(), uri: 'calendar' }
        : undefined,
    });
    return record.toObject();
  }

  async decline(
    trialRecordId: Types.ObjectId,
    actorId: Types.ObjectId,
    dto: DeclineTrialOnboardingDto,
  ) {
    await this.assertAdmin(actorId);
    const record = await this.trialRecordModel.findById(trialRecordId);
    if (!record) throw new NotFoundException('Trial enrolment not found');
    if (record.onboarding_status === 'declined') return record.toObject();
    if (record.onboarding_status !== 'pending_approval') {
      throw new BadRequestException('This enrolment cannot be declined');
    }

    record.onboarding_status = 'declined';
    record.is_approved = false;
    record.is_active = false;
    record.has_questionnaire_schedule = false;
    record.trial_status = TrialStatus.DECLINED;
    record.declined_by = actorId;
    record.declined_at = new Date();
    record.decision_note = dto?.decision_note?.trim() || null;
    await record.save();

    // Normally pending enrolments have no instances, but cancelling defensively
    // prevents reminders if an earlier partial operation ever created one.
    await this.instanceModel.updateMany(
      {
        trial_record_id: record._id,
        status: { $in: ['upcoming', 'due', 'overdue'] },
      },
      { $set: { status: 'cancelled' } },
    );
    await this.notifications.sendPushNotification({
      userId: record.user_id,
      title: 'Trial enrolment update',
      message: 'Your trial enrolment was not approved.',
      type: NotificationTypeEnum.ALERT,
    });
    return record.toObject();
  }

  async calendar(trialRecordId: Types.ObjectId, userId: Types.ObjectId) {
    const record = await this.assertOwner(trialRecordId, userId);
    const now = new Date();
    const dueInstances = await this.instanceModel.find({
      trial_record_id: trialRecordId,
      status: 'upcoming',
      due_at: { $lte: now },
    });
    for (const instance of dueInstances) {
      instance.status = 'due';
      await instance.save();
    }
    const instances = await this.instanceModel
      .find({ trial_record_id: trialRecordId })
      .sort({ due_at: 1 })
      .lean();
    const configuration = record.configuration_id
      ? await this.configModel.findById(record.configuration_id).lean()
      : null;
    const fallbackPrompt = this.normaliseCompletionPrompt(
      configuration?.completion_prompt,
    );
    return instances.map((instance) =>
      this.toQuestionnaireResponse(instance, fallbackPrompt, now),
    );
  }

  async calendarForUser(userId: Types.ObjectId) {
    // The profile Calendar is an aggregate view. Resolve its enrolments on the
    // server so it cannot miss questionnaire instances because the app has an
    // old /trials/active response or a legacy has_questionnaire_schedule flag.
    const records = await this.trialRecordModel
      .find({
        user_id: userId,
        onboarding_status: 'approved',
        trial_status: { $in: CALENDAR_VISIBLE_TRIAL_STATUSES },
        is_active: true,
      })
      .select('_id')
      .lean();

    const calendars = await Promise.all(
      records.map((record) =>
        this.calendar(record._id as Types.ObjectId, userId),
      ),
    );

    return calendars
      .flat()
      .sort(
        (left, right) =>
          new Date(String((left as Record<string, unknown>).due_at)).getTime() -
          new Date(String((right as Record<string, unknown>).due_at)).getTime(),
      );
  }

  async updateCompletionPrompt(
    instanceId: Types.ObjectId,
    userId: Types.ObjectId,
    dto: UpdateCompletionPromptDto,
  ) {
    const instance = await this.instanceModel.findOne({
      _id: instanceId,
      user_id: userId,
    });
    if (!instance) throw new NotFoundException('Questionnaire not found');
    if (instance.status === 'cancelled')
      throw new BadRequestException('Questionnaire is cancelled');
    if (instance.status === 'upcoming')
      throw new BadRequestException('Questionnaire is not available yet');

    const field =
      dto.action === 'shown' ? 'prompt_shown_at' : 'prompt_dismissed_at';
    if (!instance[field]) instance[field] = new Date();
    await instance.save();
    return this.toQuestionnaireResponse(instance);
  }

  async complete(
    instanceId: Types.ObjectId,
    userId: Types.ObjectId,
    dto: CompleteQuestionnaireDto,
  ) {
    const instance = await this.instanceModel.findOne({
      _id: instanceId,
      user_id: userId,
    });
    if (!instance) throw new NotFoundException('Questionnaire not found');
    if (instance.status === 'cancelled')
      throw new BadRequestException('Questionnaire is cancelled');
    if (instance.status === 'upcoming')
      throw new BadRequestException('Questionnaire is not available yet');
    if (!dto.reported_completed) {
      instance.prompt_answered_at = new Date();
      await instance.save();
      return this.toQuestionnaireResponse(instance);
    }
    if (instance.status === 'completed')
      return this.toQuestionnaireResponse(instance);
    const completionModes = Array.isArray(instance.completion_modes)
      ? instance.completion_modes
      : [];
    const mode = dto.mode?.trim() || undefined;
    if (completionModes.length > 0 && !mode) {
      throw new BadRequestException('A completion mode is required');
    }
    if (mode && !completionModes.includes(mode)) {
      throw new BadRequestException('Completion mode is not allowed');
    }
    instance.status = 'completed';
    instance.prompt_answered_at = new Date();
    instance.completion = {
      reported_completed: true,
      mode: mode || null,
      participant_reported_date: dto.participant_reported_date || null,
      submitted_at: new Date(),
      source: 'participant_prompt',
    };
    await instance.save();
    return this.toQuestionnaireResponse(instance);
  }

  async getQuestionnaire(instanceId: Types.ObjectId, userId: Types.ObjectId) {
    const instance = await this.instanceModel
      .findOne({ _id: instanceId, user_id: userId })
      .lean();
    if (!instance) throw new NotFoundException('Questionnaire not found');
    if (instance.status === 'cancelled')
      throw new BadRequestException('Questionnaire is cancelled');
    if (instance.status === 'upcoming')
      throw new BadRequestException('Questionnaire is not available yet');
    return this.toQuestionnaireResponse(instance);
  }

  async submitNativeQuestionnaire(
    instanceId: Types.ObjectId,
    userId: Types.ObjectId,
    dto: SubmitNativeQuestionnaireDto,
  ) {
    const instance = await this.instanceModel.findOne({
      _id: instanceId,
      user_id: userId,
    });
    if (!instance) throw new NotFoundException('Questionnaire not found');
    if (instance.status === 'completed')
      return this.toQuestionnaireResponse(instance);
    if (instance.status === 'cancelled')
      throw new BadRequestException('Questionnaire is cancelled');
    if (instance.status === 'upcoming')
      throw new BadRequestException('Questionnaire is not available yet');
    const delivery = instance.delivery as {
      type?: string;
      fields?: QuestionnaireField[];
    } | null;
    if (delivery?.type !== 'native' || !Array.isArray(delivery.fields))
      throw new BadRequestException('This is not an in-app questionnaire');
    this.validateQuestionnaireAnswers(delivery.fields, dto.answers);
    instance.answers = Object.entries(dto.answers).map(([field_id, value]) => ({
      field_id,
      value,
    }));
    instance.status = 'completed';
    instance.completion = {
      reported_completed: true,
      submitted_at: new Date(),
      source: 'native_form',
    };
    instance.prompt_answered_at = new Date();
    await instance.save();
    return this.toQuestionnaireResponse(instance);
  }

  private toQuestionnaireResponse(
    instance: QuestionnaireInstanceDocument | Record<string, unknown>,
    fallbackPrompt?: CompletionPromptConfiguration | null,
    now = new Date(),
  ) {
    const value =
      instance &&
      typeof (instance as { toObject?: unknown }).toObject === 'function'
        ? (instance as { toObject: () => Record<string, unknown> }).toObject()
        : (instance as Record<string, unknown>);
    const stringifyId = (id: unknown) => {
      if (typeof id === 'string') return id;
      if (id && typeof (id as { toString?: unknown }).toString === 'function') {
        const result = (id as { toString: () => string }).toString();
        if (result !== '[object Object]') return result;
      }
      return id;
    };

    const completionPrompt =
      this.normaliseCompletionPrompt(value.completion_prompt) || fallbackPrompt;
    const completionPromptDue = this.isCompletionPromptDue(
      value,
      completionPrompt,
      now,
    );

    return {
      ...value,
      _id: stringifyId(value._id),
      trial_record_id: stringifyId(value.trial_record_id),
      trial_id: stringifyId(value.trial_id),
      user_id: stringifyId(value.user_id),
      completion_prompt_due: completionPromptDue,
    };
  }

  private normaliseCompletionPrompt(
    value: unknown,
  ): CompletionPromptConfiguration | null {
    if (!value || typeof value !== 'object') return null;
    const prompt = value as Record<string, unknown>;
    if (
      prompt.enabled !== true ||
      !Number.isInteger(prompt.days_after_due) ||
      (prompt.days_after_due as number) < 0
    )
      return null;
    const modes = Array.isArray(prompt.modes)
      ? prompt.modes.filter((mode): mode is string => typeof mode === 'string')
      : [];
    return {
      enabled: true,
      days_after_due: prompt.days_after_due as number,
      modes,
    };
  }

  private isCompletionPromptDue(
    instance: Record<string, unknown>,
    prompt: CompletionPromptConfiguration | null | undefined,
    now: Date,
  ) {
    if (
      !prompt?.enabled ||
      instance.status === 'completed' ||
      instance.status === 'cancelled' ||
      instance.prompt_dismissed_at ||
      instance.prompt_answered_at
    )
      return false;
    if (
      typeof instance.scheduled_local_date !== 'string' ||
      typeof instance.timezone !== 'string'
    )
      return false;
    const dueAt = new Date(instance.due_at as string | Date);
    if (Number.isNaN(dueAt.getTime())) return false;
    const promptAt = calculateCompletionPromptAt(
      instance.scheduled_local_date,
      dueAt,
      prompt.days_after_due,
      instance.timezone,
    );
    return promptAt <= now;
  }

  private toConfigurationResponse(
    configuration: TrialParticipantConfigurationDocument,
  ) {
    const value = configuration.toObject();
    return {
      ...value,
      _id: value._id.toString(),
      trial_id: value.trial_id.toString(),
    };
  }

  private async createSchedule(
    record: TrialsRecordDocument,
    config: TrialParticipantConfigurationDocument,
  ) {
    const schedule = config.schedule as {
      timezone?: string;
      questionnaires?: QuestionnaireRule[];
    };
    const anchor = (record.onboarding_answers || []).find(
      (answer: { field_id: string; value: unknown }) =>
        answer.field_id === 'surgery_date',
    )?.value;
    if (!isValidDateOnly(anchor))
      throw new BadRequestException(
        'The configured anchor date is missing or invalid',
      );
    const timezone = schedule.timezone || 'UTC';
    record.anchor_date = new Date(`${anchor}T00:00:00.000Z`);
    record.anchor_timezone = timezone;
    const rules = schedule.questionnaires || [];
    const completionPrompt = this.normaliseCompletionPrompt(
      config.completion_prompt,
    );
    const completionModes = completionPrompt?.modes || [];
    for (const questionnaire of rules.filter(
      (item) => item.enabled !== false,
    )) {
      if (
        !questionnaire.key ||
        !Number.isInteger(questionnaire.offset) ||
        questionnaire.offset < 0
      )
        throw new BadRequestException('Invalid questionnaire schedule');
      const scheduled = calculateScheduledDate(
        anchor,
        questionnaire.rule,
        questionnaire.offset,
        timezone,
        questionnaire.due_time || '00:00',
      );
      const instanceFilter = {
        trial_record_id: record._id,
        questionnaire_key: questionnaire.key,
        schedule_revision: 1,
      };
      const existingInstance = await this.instanceModel.findOne(instanceFilter);
      if (!existingInstance) {
        const instance = new this.instanceModel({
          trial_record_id: record._id,
          trial_id: record.trial_id,
          user_id: record.user_id,
          configuration_version: config.version,
          questionnaire_key: questionnaire.key,
          scheduled_local_date: scheduled.scheduledLocalDate,
          timezone,
          due_at: scheduled.dueAt,
          status: scheduled.dueAt <= new Date() ? 'due' : 'upcoming',
          completion_modes: completionModes,
          completion_prompt: completionPrompt,
          delivery: questionnaire.delivery || null,
          schedule_revision: 1,
        });
        await instance.save();
        await this.enqueueReminders(instance.toObject(), config);
      }
    }
    await record.save();
  }

  private async enqueueReminders(
    instance: QuestionnaireInstanceDocument | Record<string, any>,
    config: TrialParticipantConfigurationDocument,
  ) {
    const reminders = (config.schedule as { reminders?: { offsets?: unknown } })
      .reminders;
    const offsets = Array.isArray(reminders?.offsets) ? reminders.offsets : [];
    for (const offset of offsets) {
      if (!Number.isInteger(offset)) continue;
      const dueAt = new Date(instance.due_at);
      const sendAt = calculateScheduledDate(
        String(instance.scheduled_local_date),
        'days_after',
        offset,
        String(instance.timezone),
        getLocalDueTime(dueAt, String(instance.timezone)),
      );
      await this.notificationQueue.add(
        JobName.SEND_PUSH_NOTIFICATION_MESSAGE,
        {
          userId: instance.user_id,
          title: 'Questionnaire reminder',
          message: 'You have a questionnaire due in your trial calendar.',
          type: NotificationTypeEnum.ALERT,
          data: {
            questionnaireInstanceId: instance._id.toString(),
            trialRecordId: instance.trial_record_id.toString(),
            uri: 'calendar',
          },
        },
        {
          jobId: `questionnaire:${instance._id}:reminder:${offset}`,
          delay: Math.max(0, sendAt.dueAt.getTime() - Date.now()),
          attempts: 3,
          backoff: { type: 'exponential', delay: 30000 },
          removeOnComplete: true,
        },
      );
    }
  }

  private validateAnswers(
    fields: OnboardingField[],
    answers: Record<string, unknown>,
  ): Record<string, unknown> {
    const normalisedAnswers = { ...answers };
    for (const field of fields) {
      const submittedValue = normalisedAnswers[field.id];
      const value =
        field.type === 'text' && typeof submittedValue === 'string'
          ? submittedValue.trim()
          : submittedValue;
      normalisedAnswers[field.id] = value;
      if (
        field.required &&
        (value === undefined || value === null || value === '')
      )
        throw new BadRequestException(`${field.id} is required`);
      if (value !== undefined && field.type === 'text') {
        if (typeof value !== 'string')
          throw new BadRequestException(`${field.id} must be text`);
        if (field.maxLength && value.length > field.maxLength)
          throw new BadRequestException(
            `${field.id} must be at most ${field.maxLength} characters`,
          );
      }
      if (
        value !== undefined &&
        field.type === 'date' &&
        !isValidDateOnly(value)
      )
        throw new BadRequestException(
          `${field.id} must be a valid YYYY-MM-DD date`,
        );
      if (
        value !== undefined &&
        field.options?.length &&
        typeof value === 'string' &&
        !field.options.includes(value)
      )
        throw new BadRequestException(`${field.id} has an invalid option`);
    }
    for (const key of Object.keys(answers))
      if (!fields.some((field) => field.id === key))
        throw new BadRequestException(`Unknown onboarding field: ${key}`);
    return normalisedAnswers;
  }

  private validateConfiguration(value: {
    onboarding?: Record<string, unknown>;
    schedule?: Record<string, unknown>;
    completion_prompt?: Record<string, unknown>;
  }) {
    const prompt = value.completion_prompt;
    if (prompt?.enabled === true) {
      if (
        !Number.isInteger(prompt.days_after_due) ||
        (prompt.days_after_due as number) < 0
      )
        throw new BadRequestException(
          'Completion prompt days_after_due must be a non-negative integer',
        );
      if (
        prompt.modes !== undefined &&
        (!Array.isArray(prompt.modes) ||
          prompt.modes.some((mode) => typeof mode !== 'string'))
      )
        throw new BadRequestException('Invalid completion prompt modes');
    }
    const schedule = value.schedule as
      | {
          anchor_field_id?: string;
          timezone?: string;
          questionnaires?: QuestionnaireRule[];
        }
      | undefined;
    if (!schedule?.questionnaires?.length) return;
    if (schedule.anchor_field_id && schedule.anchor_field_id !== 'surgery_date')
      throw new BadRequestException(
        'Questionnaire schedules use the global surgery_date anchor',
      );
    if (schedule.timezone && !isValidIanaTimeZone(schedule.timezone))
      throw new BadRequestException(
        'Questionnaire schedule timezone is invalid',
      );
    const keys = schedule.questionnaires.map(
      (questionnaire) => questionnaire.key,
    );
    if (keys.some((key) => !key) || new Set(keys).size !== keys.length)
      throw new BadRequestException('Questionnaire keys must be unique');
    for (const questionnaire of schedule.questionnaires) {
      if (
        !Number.isInteger(questionnaire.offset) ||
        questionnaire.offset < 0 ||
        !['days_after', 'weeks_after', 'months_after'].includes(
          questionnaire.rule,
        )
      )
        throw new BadRequestException('Questionnaire schedule rule is invalid');
      if (questionnaire.due_time && !isValidDueTime(questionnaire.due_time))
        throw new BadRequestException('Questionnaire due time must use HH:mm');
      this.validateDelivery(questionnaire.delivery);
    }
  }

  private validateDelivery(delivery?: QuestionnaireRule['delivery']) {
    if (!delivery) return;
    if (!['native', 'external'].includes(delivery.type))
      throw new BadRequestException('Invalid questionnaire delivery type');
    if (delivery.type === 'external') {
      if (!delivery.url || !/^https:\/\//i.test(delivery.url))
        throw new BadRequestException(
          'External questionnaire URL must use HTTPS',
        );
      return;
    }
    if (!Array.isArray(delivery.fields) || delivery.fields.length === 0)
      throw new BadRequestException('Native questionnaire fields are required');
    const ids = delivery.fields.map((field) => field.id);
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length)
      throw new BadRequestException('Questionnaire field IDs must be unique');
  }

  private validateQuestionnaireAnswers(
    fields: QuestionnaireField[],
    answers: Record<string, unknown>,
  ) {
    for (const field of fields) {
      const value = answers[field.id];
      if (
        field.required &&
        (value === undefined || value === null || value === '')
      )
        throw new BadRequestException(`${field.id} is required`);
      if (value === undefined || value === null || value === '') continue;
      if (
        field.type === 'number' &&
        (typeof value !== 'number' || !Number.isFinite(value))
      )
        throw new BadRequestException(`${field.id} must be a number`);
      if (
        field.type === 'date' &&
        (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
      )
        throw new BadRequestException(`${field.id} must be a date`);
      if (
        (field.type === 'select' || field.type === 'radio') &&
        (typeof value !== 'string' || !field.options?.includes(value))
      )
        throw new BadRequestException(`${field.id} has an invalid option`);
      if (field.type === 'checkbox' && typeof value !== 'boolean')
        throw new BadRequestException(`${field.id} must be true or false`);
      if (
        field.type === 'number' &&
        field.min !== undefined &&
        (value as number) < field.min
      )
        throw new BadRequestException(`${field.id} is below the minimum`);
      if (
        field.type === 'number' &&
        field.max !== undefined &&
        (value as number) > field.max
      )
        throw new BadRequestException(`${field.id} is above the maximum`);
    }
    for (const key of Object.keys(answers))
      if (!fields.some((field) => field.id === key))
        throw new BadRequestException(`Unknown questionnaire field: ${key}`);
  }

  private async assertOwner(
    trialRecordId: Types.ObjectId,
    userId: Types.ObjectId,
  ) {
    const record = await this.trialRecordModel
      .findOne({
        _id: trialRecordId,
        user_id: userId,
        onboarding_status: 'approved',
        trial_status: { $in: CALENDAR_VISIBLE_TRIAL_STATUSES },
        is_active: true,
      })
      .select('configuration_id');
    if (!record)
      throw new ForbiddenException('You cannot access this trial calendar');
    return record;
  }

  private async assertAdmin(userId: Types.ObjectId) {
    const user = await this.userModel.findById(userId).select('role').lean();
    if (!user || user.role !== UserRole.ADMIN)
      throw new ForbiddenException('Administrator access is required');
  }
}
