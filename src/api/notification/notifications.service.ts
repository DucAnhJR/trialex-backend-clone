import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { ResponseNoDataDto } from '@/common/dto/response/response-no-data.dto';
import { Order } from '@/constants/app.constant';
import { NotificationTypeEnum } from '@/database/enums/notification.enum';
import { buildPaginator } from '@/utils/cursor-pagination';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Expo, ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { FilterQuery, Model, Types } from 'mongoose';
import { DeviceTokenService } from '../device-tokens/device-token.service';
import { DeviceToken } from '../device-tokens/schemas/device-tokens.schema';
import { UsersService } from '../users/users.service';
import { ExpoConfig } from './config/expo.config';
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
    private deviceTokenServices: DeviceTokenService,
    private userServices: UsersService,
  ) {
    this.expo = this.expoConfig.getExpoInstance();
  }

  async markRead(
    dto: MarkReadDto,
    userId: Types.ObjectId,
  ): Promise<ResponseNoDataDto> {
    const result = await this.notificationModel.updateOne(
      {
        _id: new Types.ObjectId(dto.notificationId),
        userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    if (result.modifiedCount === 0) {
      this.logger.warn(
        `No notification marked as read for notificationId: ${dto.notificationId} and userId: ${userId}`,
      );
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

  async findAll(query: QueryNotificationDto, userId: Types.ObjectId) {
    const paginator = buildPaginator<NotificationDocument>({
      model: this.notificationModel,
      query: {
        afterCursor: query.afterCursor,
        beforeCursor: query.beforeCursor,
        limit: query.limit,
        order: query.order,
      },
      paginationKeys: ['_id'],
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

    const allowedSortBy = ['createdAt', 'updatedAt'];

    if (query.sortBy) {
      if (!allowedSortBy.includes(query.sortBy)) {
        this.logger.warn(`Invalid sortBy value: ${query.sortBy}`);
      }
      filter['$sort'] = { [query.sortBy]: query.order === Order.DESC ? -1 : 1 };
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

    const deviceTokens = await this.deviceTokenModel
      .find({
        userId: new Types.ObjectId(dto.userId),
      })
      .lean();

    if (!deviceTokens || deviceTokens.length === 0) {
      this.logger.warn(
        `No device tokens found for userId: ${dto.userId}. Push notification not sent.`,
      );
      return;
    }

    const notification = await this.createNotification(dto);

    const data = {
      ...Object.fromEntries(
        Object.entries(dto.data || {}).map(([key, value]) => [
          key,
          String(value),
        ]),
      ),
      timestamp: new Date().toISOString(),
      notificationId: notification._id.toString(),
      uri: dto.data?.uri || '',
      vibrate: !!userReceivedNoti.notifications.vibrate,
    };

    const validTokens = deviceTokens
      .filter((token) => Expo.isExpoPushToken(token.token))
      .map((token) => token.token);
    const invalidTokens = deviceTokens
      .filter((token) => !Expo.isExpoPushToken(token.token))
      .map((token) => token.token);

    if (invalidTokens.length > 0) {
      await this.handleInvalidTokens(dto.userId, invalidTokens);
    }

    if (validTokens.length === 0) {
      this.logger.warn(
        `No valid Expo push tokens found for user ${dto.userId} - ${userReceivedNoti.email}`,
      );

      return notification;
    }

    const message: ExpoPushMessage = {
      to: validTokens,
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

      await this.handleExpoResponse(tickets, validTokens, dto.userId);
    } catch (error) {
      this.logger.error('Failed to send push notification:', error);
    }
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
      await this.handleInvalidTokens(userId, invalidTokens);
    }
  }

  private async handleInvalidTokens(
    userId: Types.ObjectId,
    invalidTokens: string[],
  ) {
    this.logger.warn(
      `Removing ${invalidTokens.length} invalid tokens for user ${userId}`,
    );

    for (const token of invalidTokens) {
      await this.deviceTokenServices.removeToken(userId, token);
    }
  }
}
