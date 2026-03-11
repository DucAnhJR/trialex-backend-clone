import { User } from '@/api/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  senderId?: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 255 })
  title: string;

  @Prop({ type: String, default: null })
  message?: string;

  @Prop({ type: String, maxlength: 255, default: null })
  type?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  data?: Record<string, any> | any;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date, default: null })
  readAt?: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ isRead: 1 }, { name: 'idx_notification_isRead' });
NotificationSchema.index({ type: 1 }, { name: 'idx_notification_type' });
