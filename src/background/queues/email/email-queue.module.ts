import {
  TrialsRecord,
  TrialsRecordSchema,
} from '@/api/trials/schemas/trials-record.schema';
import { Trials, TrialsSchema } from '@/api/trials/schemas/trials.schema';
import { QueueName, QueuePrefix } from '@/constants/job.constant';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailQueueEvents } from './email-queue.events';
import { EmailQueueService } from './email-queue.service';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrialsRecord.name, schema: TrialsRecordSchema },
      { name: Trials.name, schema: TrialsSchema },
    ]),
    BullModule.registerQueue({
      name: QueueName.EMAIL,
      prefix: QueuePrefix.AUTH,
      streams: {
        events: {
          maxLen: 1000,
        },
      },
    }),
  ],
  providers: [EmailQueueService, EmailProcessor, EmailQueueEvents],
  exports: [EmailQueueService, BullModule],
})
export class EmailQueueModule {}
