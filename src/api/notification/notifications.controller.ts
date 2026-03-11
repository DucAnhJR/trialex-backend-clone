import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { MarkReadDto } from './dto/mark-read.dto';
import { NotificationResDto } from './dto/notification.res.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Get()
  @ApiAuth({
    summary: 'Lấy danh sách thông báo',
    type: NotificationResDto,
    paginationType: 'cursor',
    isPaginated: true,
  })
  async findAll(
    @Query() query: QueryNotificationDto,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.notificationService.findAll(query, userId);
  }

  @Post('mark-read')
  @ApiAuth({
    summary: 'Đánh dấu thông báo là đã đọc',
  })
  async markRead(
    @Query() dto: MarkReadDto,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.notificationService.markRead(dto, userId);
  }

  @Post('mark-all-read')
  @ApiAuth({
    summary: 'Đánh dấu tất cả thông báo là đã đọc',
  })
  async markAllRead(@CurrentUser('id') userId: Types.ObjectId) {
    return this.notificationService.markAllRead(userId);
  }

  @Post('clear-all')
  @ApiAuth({
    summary: 'Xoá tất cả thông báo',
  })
  async clearAll(@CurrentUser('id') userId: Types.ObjectId) {
    return this.notificationService.clearAll(userId);
  }

  @Post('test/:id')
  @ApiPublic({
    summary: 'Gửi thông báo test đến thiết bị của user hiện tại',
    type: NotificationResDto,
  })
  @ApiParam({
    name: 'id',
    description: 'ID của user hiện tại',
    type: 'string',
  })
  async sendTestNotification(@Param('id') id: Types.ObjectId) {
    return this.notificationService.sendTestNotification(id);
  }
}
