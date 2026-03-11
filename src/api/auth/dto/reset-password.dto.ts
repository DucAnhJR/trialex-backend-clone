import {
  EmailFieldOptional,
  StringField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { IsIn, IsString, ValidateIf } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsIn(['email', 'sms'])
  @StringField({
    example: 'email',
    description: 'email or sms',
  })
  method: 'email' | 'sms';

  @ValidateIf((o) => o.method === 'email')
  @EmailFieldOptional({ example: 'user@example.com' })
  email?: string;

  @ValidateIf((o) => o.method === 'sms')
  @StringFieldOptional({
    example: '+1234567890',
    description: 'Phone number',
  })
  phone_number?: string;

  @StringField({
    example: '123456',
    description: 'New Password',
  })
  newPassword: string;
}
