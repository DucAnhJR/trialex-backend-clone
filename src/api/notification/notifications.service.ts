import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { ResponseNoDataDto } from '@/common/dto/response/response-no-data.dto';
import { NotificationTypeEnum } from '@/database/enums/notification.enum';
import { buildPaginator } from '@/utils/cursor-pagination';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Expo, ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { FilterQuery, Model, Types } from 'mongoose';
import { DeviceTokenService } from '../device-tokens/device-token.service';
import {
  DeviceToken,
  DeviceTokenPlatform,
  DeviceTokenProvider,
} from '../device-tokens/schemas/device-tokens.schema';
import { UsersService } from '../users/users.service';
import { ExpoConfig } from './config/expo.config';
import { FirebaseConfig } from './config/firebase.config';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { NotificationResDto } from './dto/notification.res.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { SendPushNotificationDto } from './dto/send-push-notification.dto';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private expo: Expo;

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(DeviceToken.name)
    private deviceTokenModel: Model<DeviceToken>,
    private expoConfig: ExpoConfig,
    private firebaseConfig: FirebaseConfig,
    private deviceTokenServices: DeviceTokenService,
    private userServices: UsersService,
  ) {
    this.expo = this.expoConfig.getExpoInstance();
  }

  async markRead(
    dto: MarkReadDto,
    userId: Types.ObjectId,
  ): Promise<ResponseNoDataDto> {
    const notification = await this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(dto.notificationId),
        userId: new Types.ObjectId(userId),
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true },
    );

    if (!notification) {
      this.logger.warn(
        `No notification marked as read for notificationId: ${dto.notificationId} and userId: ${userId}`,
      );

      return new ResponseNoDataDto({
        success: false,
        message: 'Không tìm thấy thông báo',
      });
    }

    return new ResponseNoDataDto({
      message: 'Đánh dấu thông báo là đã đọc thành công',
    });
  }

  async markAllRead(userId: Types.ObjectId): Promise<ResponseNoDataDto> {
    const result = await this.notificationModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    this.logger.log(
      `Marked ${result.modifiedCount} notifications as read for userId: ${userId}`,
    );

    return new ResponseNoDataDto({
      message: 'Đánh dấu tất cả thông báo là đã đọc thành công',
    });
  }

  async clearAll(userId: Types.ObjectId): Promise<ResponseNoDataDto> {
    const result = await this.notificationModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });

    this.logger.log(
      `Deleted ${result.deletedCount} notifications for userId: ${userId}`,
    );

    return new ResponseNoDataDto({
      message: 'Xoá tất cả thông báo thành công',
    });
  }

  async deleteOne(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ResponseNoDataDto> {
    const result = await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      this.logger.warn(
        `No notification deleted for notificationId: ${notificationId} and userId: ${userId}`,
      );

      return new ResponseNoDataDto({
        success: false,
        message: 'Không tìm thấy thông báo',
      });
    }

    return new ResponseNoDataDto({
      message: 'Xoá thông báo thành công',
    });
  }

  async findAll(query: QueryNotificationDto, userId: Types.ObjectId) {
    const paginator = buildPaginator<NotificationDocument>({
      model: this.notificationModel,
      query: {
        afterCursor: query.afterCursor,
        beforeCursor: query.beforeCursor,
        limit: query.limit,
        order: query.order,
      },
      paginationKeys: ['createdAt', '_id'],
    });

    const filter: FilterQuery<Notification> = {
      userId: new Types.ObjectId(userId),
    };

    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.senderId) {
      filter.senderId = query.senderId;
    }

    const { cursor, data, totalCount } = await paginator.paginate(filter);

    const metaDto = new CursorPaginationDto(
      totalCount,
      cursor.afterCursor,
      cursor.beforeCursor,
      query,
    );

    return new CursorPaginatedDto<NotificationResDto>({
      data: plainToInstance(NotificationResDto, data, {
        excludeExtraneousValues: true,
      }),
      meta: metaDto,
      message: 'Notification records retrieved successfully',
    });
  }

  createNotification(
    dto: CreateNotificationDto,
  ): Promise<NotificationDocument> {
    return this.notificationModel.create({
      ...dto,
      userId: new Types.ObjectId(dto.userId),
      senderId: dto.senderId ? new Types.ObjectId(dto.senderId) : null,
    });
  }

  async sendTestNotification(id: Types.ObjectId) {
    const testNotificationDto: SendPushNotificationDto = {
      userId: id,
      title: 'Test Notification',
      message: 'This is a test notification sent from the system.',
      type: NotificationTypeEnum.GENERAL,
      senderId: null,
      data: { test: true },
    };

    return this.sendPushNotification(testNotificationDto);
  }

  async sendPushNotification(dto: SendPushNotificationDto) {
    const userReceivedNoti = await this.userServices.findOne(dto.userId);

    const notification = await this.createNotification(dto);

    if (userReceivedNoti.notifications?.push === false) {
      this.logger.debug(
        `Push notifications disabled for userId: ${dto.userId}. In-app notification only.`,
      );
      return notification;
    }

    // Persist in-app notification even when push token is missing.
    const deviceTokens = await this.deviceTokenModel
      .find({
        userId: new Types.ObjectId(dto.userId),
        $or: [{ active: true }, { active: { $exists: false } }],
      })
      .lean();

    if (!deviceTokens || deviceTokens.length === 0) {
      this.logger.warn(
        `No device tokens found for userId: ${dto.userId}. Push notification not sent.`,
      );
      return notification;
    }

    const data = this.stringifyPushData({
      ...Object.fromEntries(
        Object.entries(dto.data || {}).map(([key, value]) => [
          key,
          String(value),
        ]),
      ),
      timestamp: new Date().toISOString(),
      notificationId: notification._id.toString(),
      uri: dto.data?.uri || '',
      vibrate: !!userReceivedNoti.notifications?.vibrate,
      type: dto.type,
      title: dto.title,
      body: dto.message,
    });

    const fcmDeviceTokens = deviceTokens.filter(
      (token) => token.provider === DeviceTokenProvider.FCM,
    );

    if (fcmDeviceTokens.length > 0) {
      await this.sendFcmPushNotification(dto, data, fcmDeviceTokens);
      return notification;
    }

    const expoDeviceTokens = deviceTokens.filter(
      (token) => !token.provider || token.provider === DeviceTokenProvider.EXPO,
    );

    const validExpoTokens = expoDeviceTokens
      .filter((token) => Expo.isExpoPushToken(token.token))
      .map((token) => token.token);
    const invalidExpoTokens = expoDeviceTokens
      .filter((token) => !Expo.isExpoPushToken(token.token))
      .map((token) => token.token);

    if (invalidExpoTokens.length > 0) {
      await this.handleInvalidTokens(
        dto.userId,
        invalidExpoTokens,
        DeviceTokenProvider.EXPO,
      );
    }

    if (validExpoTokens.length === 0) {
      this.logger.warn(
        `No valid push tokens found for user ${dto.userId} - ${userReceivedNoti.email}`,
      );

      return notification;
    }

    const message: ExpoPushMessage = {
      to: validExpoTokens,
      sound: 'default',
      title: dto.title,
      body: dto.message,
      data,
      priority: 'high',
    };

    try {
      const chunks = this.expo.chunkPushNotifications([message]);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          this.logger.error('Error sending chunk:', error);
        }
      }

      await this.handleExpoResponse(tickets, validExpoTokens, dto.userId);
    } catch (error) {
      this.logger.error('Failed to send push notification:', error);
    }

    return notification;
  }

  private async handleExpoResponse(
    tickets: ExpoPushTicket[],
    tokens: string[],
    userId: Types.ObjectId,
  ) {
    const invalidTokens: string[] = [];

    tickets.forEach((ticket, index) => {
      console.log('Ticket:', ticket);

      if (ticket.status === 'error') {
        const token = tokens[index];
        this.logger.error(
          `Error sending notification to token ${token}: ${ticket.details?.error}`,
        );

        if (
          ticket.details?.error === 'DeviceNotRegistered' ||
          ticket.details?.error === 'InvalidCredentials'
        ) {
          invalidTokens.push(token);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await this.handleInvalidTokens(
        userId,
        invalidTokens,
        DeviceTokenProvider.EXPO,
      );
    }
  }

  private async handleInvalidTokens(
    userId: Types.ObjectId,
    invalidTokens: string[],
    provider?: DeviceTokenProvider,
  ) {
    this.logger.warn(
      `Deactivating ${invalidTokens.length} invalid tokens for user ${userId}`,
    );

    for (const token of invalidTokens) {
      await this.deviceTokenServices.deactivateToken(userId, token, provider);
    }
  }

  private async sendFcmPushNotification(
    dto: SendPushNotificationDto,
    data: Record<string, string>,
    deviceTokens: Array<{
      token: string;
      platform?: DeviceTokenPlatform;
    }>,
  ) {
    const messaging = this.firebaseConfig.getMessaging();

    if (!messaging) {
      this.logger.warn(
        `Firebase Admin is not configured. FCM push notification not sent for userId: ${dto.userId}.`,
      );
      return;
    }

    const androidTokens = deviceTokens
      .filter((item) => item.platform === DeviceTokenPlatform.ANDROID)
      .map((item) => item.token);
    const iosAndLegacyTokens = deviceTokens
      .filter((item) => item.platform !== DeviceTokenPlatform.ANDROID)
      .map((item) => item.token);

    // Android receives high-priority data-only messages so Notifee owns the
    // visible notification. iOS keeps an APNs alert for reliable delivery.
    const messages = [
      ...this.chunkArray(androidTokens, 500).map((tokens) => ({
        tokens,
        data,
        android: {
          priority: 'high' as const,
        },
      })),
      ...this.chunkArray(iosAndLegacyTokens, 500).map((tokens) => ({
        tokens,
        notification: {
          title: dto.title,
          body: dto.message,
        },
        data,
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      })),
    ];

    for (const message of messages) {
      try {
        const response = await messaging.sendEachForMulticast(message);

        const invalidTokens = response.responses
          .map((item, index) =>
            item.success || !this.isInvalidFcmTokenError(item.error?.code)
              ? null
              : message.tokens[index],
          )
          .filter((token): token is string => Boolean(token));

        if (invalidTokens.length > 0) {
          await this.handleInvalidTokens(
            dto.userId,
            invalidTokens,
            DeviceTokenProvider.FCM,
          );
        }

        if (response.failureCount > 0) {
          response.responses.forEach((item, index) => {
            if (!item.success) {
              this.logger.warn(
                `FCM failure token=...${message.tokens[index].slice(-8)} code=${item.error?.code || 'unknown'} message=${item.error?.message || 'unknown'}`,
              );
            }
          });
          this.logger.warn(
            `FCM sent with ${response.failureCount} failures for userId: ${dto.userId}`,
          );
        }

        if (response.successCount > 0) {
          this.logger.log(
            `FCM delivered to ${response.successCount}/${message.tokens.length} tokens for notificationId=${data.notificationId}`,
          );
        }
      } catch (error) {
        this.logger.error('Failed to send FCM push notification:', error);
      }
    }
  }

  private stringifyPushData(data: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === undefined || value === null ? '' : String(value),
      ]),
    );
  }

  private isInvalidFcmTokenError(code?: string) {
    return [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument',
    ].includes(code || '');
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }
}
