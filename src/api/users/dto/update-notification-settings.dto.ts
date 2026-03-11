import { Notifications } from '@/api/users/interfaces/notifications.interface';
import { PartialType } from '@nestjs/swagger';

export class UpdateNotificationSettingsDto extends PartialType(Notifications) {}
