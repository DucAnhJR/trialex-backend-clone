import { SendPushNotificationDto } from '@/api/notification/dto/send-push-notification.dto';
import { NotificationsService } from '@/api/notification/notifications.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(private readonly notificationService: NotificationsService) {}

  async sendPushNotification(data: SendPushNotificationDto): Promise<void> {
    this.logger.debug(`Sending push notification to ${data.userId}...`);
    await this.notificationService.sendPushNotification(data);
  }
}
