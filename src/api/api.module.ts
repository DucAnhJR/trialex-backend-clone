import { Module } from '@nestjs/common';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { DeviceTokenModule } from './device-tokens/device-token.module';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { NotificationsModule } from './notification/notifications.module';
import { PublicationModule } from './publication/publication.module';
import { SupportsModule } from './supports/supports.module';
import { TrialsModule } from './trials/trials.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    NotificationsModule,
    DeviceTokenModule,
    AppointmentsModule,
    TrialsModule,
    PublicationModule,
    SupportsModule,
    AuthModule,
    UsersModule,
    UploadModule,
    HealthModule,
    HomeModule,
    ChatModule,
    WebhooksModule,
  ],
})
export class ApiModule {}
