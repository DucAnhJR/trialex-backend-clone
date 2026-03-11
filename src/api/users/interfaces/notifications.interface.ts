import { BooleanField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class Notifications {
  @BooleanField({
    description: 'Push notifications',
    example: true,
  })
  @Expose()
  @Prop({
    default: true,
  })
  push: boolean;

  @BooleanField({
    description: 'Email notifications',
    example: true,
  })
  @Expose()
  @Prop({
    default: true,
  })
  email: boolean;

  @BooleanField({
    description: 'SMS notifications',
    example: true,
  })
  @Expose()
  @Prop({
    default: false,
  })
  sms: boolean;

  @BooleanField({
    description: 'Vibrate notifications',
    example: true,
  })
  @Expose()
  @Prop({
    default: false,
  })
  vibrate: boolean;
}
