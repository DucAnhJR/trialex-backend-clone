import { StringField } from '@/decorators/field.decorators';

export class SaveDeviceTokenReqDto {
  @StringField({
    description: 'The device token to be saved',
    example: 'abcdef1234567890',
  })
  token: string;
}
