import { ChatService } from '@/api/chat/chat.service';
import { JobName, QueueName } from '@/constants/job.constant';
import { NotificationTypeEnum } from '@/database/enums/notification.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Types } from 'mongoose';
import { Event } from 'stream-chat';
import { SendPushNotificationDto } from '../notification/dto/send-push-notification.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectQueue(QueueName.NOTIFICATION)
    private readonly notificationQueue: Queue,
    private readonly client: ChatService,
  ) {}

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    if (!signature) return false;
    try {
      return this.client.verifyWebhook(rawBody.toString(), signature);
    } catch {
      return false;
    }
  }

  async handleGetStreamWebhook(webhookData: Event): Promise<void> {
    if (webhookData.type === 'message.new') {
      await this.handleNewMessage(webhookData);
    }
  }

  private async handleNewMessage(webhookData: Event) {
    this.logger.log(
      `New message from ${webhookData.message?.user?.id} in ${webhookData.channel_id}`,
    );

    const senderId = webhookData.message?.user?.id;

    const receivers = webhookData.channel?.members?.filter(
      (member) => member.user_id !== senderId,
    );

    for (const receiver of receivers) {
      const notificationData: SendPushNotificationDto = {
        senderId: new Types.ObjectId(senderId),
        userId: new Types.ObjectId(receiver.user_id),
        title: 'New Message',
        message: webhookData.message?.text,
        data: {
          uri: `https://trialex.app/MainStack/Chat?channelId=${webhookData.channel_id}`,
        },
        type: NotificationTypeEnum.MESSAGE,
      };

      await this.notificationQueue.add(
        JobName.SEND_PUSH_NOTIFICATION_MESSAGE,
        notificationData,
        {
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    }
  }
}
