import { ChatModule } from '@/api/chat/chat.module';
import { NotificationQueueModule } from '@/background/queues/notification/notification-queue.module';
import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [ChatModule, NotificationQueueModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
