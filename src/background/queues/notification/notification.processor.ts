import { SendPushNotificationDto } from '@/api/notification/dto/send-push-notification.dto';
import {
  QuestionnaireInstance,
  QuestionnaireInstanceDocument,
} from '@/api/participant-experience/schemas/questionnaire-instance.schema';
import {
  TrialsRecord,
  TrialsRecordDocument,
} from '@/api/trials/schemas/trials-record.schema';
import { QueueName } from '@/constants/job.constant';
import { TrialStatus } from '@/database/enums/trials.enum';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import { NotificationQueueService } from './notification-queue.service';

@Processor(QueueName.NOTIFICATION, {
  concurrency: 10,
  drainDelay: 300,
  stalledInterval: 300000,
  removeOnComplete: {
    age: 86400,
    count: 100,
  },
  limiter: {
    max: 2,
    duration: 150,
  },
})
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);
  constructor(
    private readonly notificationQueueService: NotificationQueueService,
    @InjectModel(QuestionnaireInstance.name)
    private readonly questionnaireModel: Model<QuestionnaireInstanceDocument>,
    @InjectModel(TrialsRecord.name)
    private readonly trialsRecordModel: Model<TrialsRecordDocument>,
  ) {
    super();
  }
  async process(job: Job<SendPushNotificationDto, any, string>): Promise<any> {
    this.logger.debug(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}...`,
    );

    const questionnaireInstanceId = job.data.data?.questionnaireInstanceId;
    if (questionnaireInstanceId) {
      const instance = await this.questionnaireModel
        .findById(questionnaireInstanceId)
        .select('status trial_record_id')
        .lean();
      if (
        !instance ||
        !['upcoming', 'due', 'overdue'].includes(instance.status)
      ) {
        this.logger.debug(
          `Skipping reminder job ${job.id}; questionnaire is no longer active.`,
        );
        return { skipped: true };
      }
      const activeEnrolment = await this.trialsRecordModel.exists({
        _id: instance.trial_record_id,
        trial_status: TrialStatus.IN_PROGRESS,
        onboarding_status: 'approved',
        is_active: true,
      });
      if (!activeEnrolment) {
        this.logger.debug(
          `Skipping reminder job ${job.id}; enrolment is no longer active.`,
        );
        return { skipped: true };
      }
    }
    return await this.notificationQueueService.sendPushNotification(job.data);
  }

  @OnWorkerEvent('active')
  async onActive(job: Job) {
    this.logger.debug(`Job ${job.id} is now active`);
  }

  @OnWorkerEvent('progress')
  async onProgress(job: Job) {
    this.logger.debug(`Job ${job.id} is ${job.progress}% complete`);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} has been completed`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job) {
    this.logger.error(
      `Job ${job.id} has failed with reason: ${job.failedReason}`,
    );
    this.logger.error(job.stacktrace);
  }

  @OnWorkerEvent('stalled')
  async onStalled(job: Job) {
    this.logger.error(`Job ${job.id} has been stalled`);
  }

  @OnWorkerEvent('error')
  async onError(error: Error) {
    this.logger.error(`Notification queue error: ${error.message}`);
  }
}
