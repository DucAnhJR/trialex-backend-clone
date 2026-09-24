import { NotificationsModule } from '@/api/notification/notifications.module';
import {
  QuestionnaireInstance,
  QuestionnaireInstanceSchema,
} from '@/api/participant-experience/schemas/questionnaire-instance.schema';
import {
  TrialsRecord,
  TrialsRecordSchema,
} from '@/api/trials/schemas/trials-record.schema';
import { QueueName } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationQueueEvents } from './notification-queue.events';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationProcessor } from './notification.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.NOTIFICATION,
      streams: {
        events: {
          maxLen: 1000,
        },
      },
    }),
    MongooseModule.forFeature([
      { name: QuestionnaireInstance.name, schema: QuestionnaireInstanceSchema },
      { name: TrialsRecord.name, schema: TrialsRecordSchema },
    ]),
    NotificationsModule,
  ],
  providers: [
    NotificationQueueService,
    NotificationProcessor,
    NotificationQueueEvents,
  ],
  exports: [NotificationQueueService, BullModule],
})
export class NotificationQueueModule {}
