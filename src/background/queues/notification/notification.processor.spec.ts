import { TrialStatus } from '@/database/enums/trials.enum';
import { Job } from 'bullmq';
import { Types } from 'mongoose';
import { NotificationProcessor } from './notification.processor';

describe('NotificationProcessor questionnaire reminder guard', () => {
  const trialRecordId = new Types.ObjectId();
  const job = {
    id: 'reminder-1',
    name: 'send-push-notification-message',
    data: {
      userId: new Types.ObjectId(),
      title: 'Questionnaire reminder',
      message: 'Questionnaire due',
      data: {
        questionnaireInstanceId: new Types.ObjectId().toString(),
      },
    },
  } as unknown as Job;

  const questionnaireLookup = (instance: Record<string, unknown> | null) => ({
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(instance),
      }),
    }),
  });

  it('skips a reminder after the questionnaire is completed', async () => {
    const sender = { sendPushNotification: jest.fn() };
    const processor = new NotificationProcessor(
      sender as never,
      questionnaireLookup({
        status: 'completed',
        trial_record_id: trialRecordId,
      }) as never,
      { exists: jest.fn() } as never,
    );

    await expect(processor.process(job)).resolves.toEqual({ skipped: true });
    expect(sender.sendPushNotification).not.toHaveBeenCalled();
  });

  it('skips a reminder when the enrolment is no longer active', async () => {
    const sender = { sendPushNotification: jest.fn() };
    const enrolments = { exists: jest.fn().mockResolvedValue(null) };
    const processor = new NotificationProcessor(
      sender as never,
      questionnaireLookup({
        status: 'due',
        trial_record_id: trialRecordId,
      }) as never,
      enrolments as never,
    );

    await expect(processor.process(job)).resolves.toEqual({ skipped: true });
    expect(enrolments.exists).toHaveBeenCalledWith({
      _id: trialRecordId,
      trial_status: TrialStatus.IN_PROGRESS,
      onboarding_status: 'approved',
      is_active: true,
    });
    expect(sender.sendPushNotification).not.toHaveBeenCalled();
  });

  it('sends a reminder only for an active questionnaire and enrolment', async () => {
    const sender = {
      sendPushNotification: jest.fn().mockResolvedValue({ sent: true }),
    };
    const processor = new NotificationProcessor(
      sender as never,
      questionnaireLookup({
        status: 'upcoming',
        trial_record_id: trialRecordId,
      }) as never,
      { exists: jest.fn().mockResolvedValue({ _id: trialRecordId }) } as never,
    );

    await expect(processor.process(job)).resolves.toEqual({ sent: true });
    expect(sender.sendPushNotification).toHaveBeenCalledWith(job.data);
  });
});
