import { StringField } from '@/decorators/field.decorators';
import { IsPhoneNumber } from 'class-validator';

export class CreateSmsDto {
  @StringField({
    description: 'Phone number to send SMS to',
    example: '+1234567890',
  })
  @IsPhoneNumber()
  phoneNumber: string;
}
