import { NotificationsModule } from '@/api/notification/notifications.module';
import { QueueName } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
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
