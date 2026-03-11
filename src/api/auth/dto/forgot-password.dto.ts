import {
  EmailFieldOptional,
  EnumField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { IsPhoneNumber } from 'class-validator';

export class ForgotPasswordDto {
  @EmailFieldOptional({ example: 'user@example.com' })
  email?: string;

  @StringFieldOptional({
    example: '+1234567890',
    description: 'Phone number',
  })
  @IsPhoneNumber()
  phone_number?: string;

  @EnumField(() => ['email', 'sms'], { example: 'email' })
  method: 'email' | 'sms';
}
