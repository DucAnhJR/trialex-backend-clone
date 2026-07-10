import {
  EnumFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import {
  DeviceTokenPlatform,
  DeviceTokenProvider,
} from '../schemas/device-tokens.schema';

export class SaveDeviceTokenReqDto {
  @StringField({
    description: 'The device token to be saved',
    example: 'abcdef1234567890',
  })
  token: string;

  @EnumFieldOptional(() => DeviceTokenProvider, {
    description: 'The push notification provider',
    example: DeviceTokenProvider.FCM,
  })
  provider?: DeviceTokenProvider;

  @EnumFieldOptional(() => DeviceTokenPlatform, {
    description: 'The mobile platform for this token',
    example: DeviceTokenPlatform.IOS,
  })
  platform?: DeviceTokenPlatform;

  @StringFieldOptional({
    description: 'Application version that registered this token',
    example: '1.0.0',
  })
  appVersion?: string;

  @StringFieldOptional({
    description: 'Stable device identifier, if available',
    example: 'device-123',
  })
  deviceId?: string;
}
