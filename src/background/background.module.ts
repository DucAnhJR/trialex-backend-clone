import { Module } from '@nestjs/common';
import { EmailQueueModule } from './queues/email/email-queue.module';
import { SmsQueueModule } from './queues/sms/sms-queue.module';
@Module({
  imports: [EmailQueueModule, SmsQueueModule],
})
export class BackgroundModule {}
