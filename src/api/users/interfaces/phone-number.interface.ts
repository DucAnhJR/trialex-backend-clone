import { StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class PhoneNumber {
  @StringField({
    description: 'Calling code of the phone number',
    example: '+1',
  })
  @Expose()
  @Prop({
    default: null,
  })
  callingCode: string;

  @StringField({
    description: 'Country code of the phone number',
    example: 'US',
  })
  @Expose()
  @Prop({
    default: null,
  })
  cca2: string;

  @StringField({
    description: 'Phone number without the calling code',
    example: '1234567890',
  })
  @Expose()
  @Prop({
    default: null,
  })
  phone: string;
}
