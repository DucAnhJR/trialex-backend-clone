import {
  ClassFieldOptional,
  StringField,
  UUIDField,
  UUIDFieldOptional,
} from '@/decorators/field.decorators';
import { Types } from 'mongoose';

export class SendPushNotificationDto {
  @UUIDFieldOptional({
    description: 'The ID of the user who will send the notification',
  })
  senderId?: Types.ObjectId;

  @UUIDField({
    description: 'The ID of the user to whom the notification will be sent',
  })
  userId: Types.ObjectId;

  @StringField({
    description: 'The title of the notification',
  })
  title: string;

  @StringField({
    description: 'The message of the notification',
  })
  message: string;

  @StringField({
    description: 'The type of the notification',
  })
  type: string;

  @ClassFieldOptional(() => Object, {
    description: 'Additional data for the notification',
  })
  data?: Record<string, any>;
}
