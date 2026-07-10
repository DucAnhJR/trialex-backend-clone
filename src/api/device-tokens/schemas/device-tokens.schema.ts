import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceTokenDocument = DeviceToken & Document;

export enum DeviceTokenProvider {
  EXPO = 'expo',
  FCM = 'fcm',
}

export enum DeviceTokenPlatform {
  IOS = 'ios',
  ANDROID = 'android',
}

@Schema({ collection: 'device-token', timestamps: true })
export class DeviceToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, default: '' })
  token: string;

  @Prop({
    type: String,
    enum: DeviceTokenProvider,
    default: DeviceTokenProvider.EXPO,
    index: true,
  })
  provider: DeviceTokenProvider;

  @Prop({
    type: String,
    enum: DeviceTokenPlatform,
    default: null,
  })
  platform?: DeviceTokenPlatform;

  @Prop({ type: String, default: null })
  appVersion?: string;

  @Prop({ type: String, default: null })
  deviceId?: string;

  @Prop({ type: Boolean, default: true, index: true })
  active: boolean;

  @Prop({ type: Date, default: Date.now })
  lastSeenAt: Date;
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);

DeviceTokenSchema.index({ userId: 1 }, { name: 'idx_device_token_user' });
