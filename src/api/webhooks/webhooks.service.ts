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
    if (webhookData.type !== 'message.new') {
      return;
    }

    await this.handleNewMessage(webhookData);
  }

  private async handleNewMessage(webhookData: Event): Promise<void> {
    const senderId = webhookData.message?.user?.id;
    const messageId = webhookData.message?.id;
    const channelId = webhookData.channel_id;
    const channelType = webhookData.channel_type || 'messaging';
    const messageText = webhookData.message?.text || 'You have a new message';

    this.logger.log(`New message from ${senderId} in ${channelId}`);

    if (!senderId || !Types.ObjectId.isValid(senderId)) {
      this.logger.warn(
        `Skip message.new webhook: invalid senderId="${senderId}" for channelId="${channelId}"`,
      );
      return;
    }

    if (!channelId) {
      this.logger.warn('Skip message.new webhook: missing channelId');
      return;
    }

    const eventMemberIds = (webhookData.channel?.members || [])
      .map((member) => member.user_id || member.user?.id)
      .filter((memberId): memberId is string => Boolean(memberId));

    let memberIds = eventMemberIds;

    if (memberIds.length === 0) {
      try {
        memberIds = await this.client.getChannelMemberIds(
          channelType,
          channelId,
        );
      } catch (error) {
        this.logger.error(
          `Failed to load members for channel ${channelType}:${channelId}`,
          error,
        );
        return;
      }
    }

    const receivers = [...new Set(memberIds)]
      .filter((memberId): memberId is string => Boolean(memberId))
      .filter((memberId) => memberId !== senderId)
      .filter((memberId) => Types.ObjectId.isValid(memberId));

    if (receivers.length === 0) {
      this.logger.debug(
        `No valid receivers for message.new event in channelId="${channelId}"`,
      );
      return;
    }

    const jobs = receivers.map(async (receiverId) => {
      const notificationData: SendPushNotificationDto = {
        senderId: new Types.ObjectId(senderId),
        userId: new Types.ObjectId(receiverId),
        title: 'New Message',
        message: messageText,
        data: {
          channelId,
          uri: `https://trialex.app/MainStack/Chat?channelId=${channelId}`,
        },
        type: NotificationTypeEnum.MESSAGE,
      };

      await this.notificationQueue.add(
        JobName.SEND_PUSH_NOTIFICATION_MESSAGE,
        notificationData,
        {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 86400,
            count: 500,
          },
          removeOnFail: {
            age: 172800,
            count: 1000,
          },
          jobId: `${messageId || channelId || 'message'}:${receiverId}`,
        },
      );
    });

    await Promise.all(jobs);
  }
}
