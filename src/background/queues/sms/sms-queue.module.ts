import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { SmsQueueEvents } from './sms-queue.events';
import { SmsQueueService } from './sms-queue.service';
import { SmsProcessor } from './sms.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QueueName.SMS,
      prefix: QueuePrefix.AUTH,
      streams: {
        events: {
          maxLen: 1000,
        },
      },
    }),
  ],
  providers: [SmsQueueService, SmsProcessor, SmsQueueEvents],
  exports: [SmsQueueService, BullModule],
})
export class SmsQueueModule {}
