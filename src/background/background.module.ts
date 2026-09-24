import { Module } from '@nestjs/common';
import { EmailQueueModule } from './queues/email/email-queue.module';
import { SmsQueueModule } from './queues/sms/sms-queue.module';
import { NotificationQueueModule } from './queues/notification/notification-queue.module';
@Module({
  imports: [EmailQueueModule, SmsQueueModule, NotificationQueueModule],
})
export class BackgroundModule {}
