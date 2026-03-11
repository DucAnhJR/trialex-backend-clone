import { DeviceTokenModule } from '@/api/device-tokens/device-token.module';
import {
  DeviceToken,
  DeviceTokenSchema,
} from '@/api/device-tokens/schemas/device-tokens.schema';
import { UsersModule } from '@/api/users/users.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpoConfig } from './config/expo.config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: DeviceToken.name, schema: DeviceTokenSchema },
    ]),
    DeviceTokenModule,
    UsersModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, ExpoConfig],
  exports: [NotificationsService],
})
export class NotificationsModule {}
