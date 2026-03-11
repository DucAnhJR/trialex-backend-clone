import {
  EmailFieldOptional,
  EnumField,
  StringFieldOptional,
} from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString } from 'class-validator';

export class VerifyOtpDto {
  @EmailFieldOptional({
    example: 'user@example.com',
    description: 'User email',
  })
  email: string;

  @ApiProperty({
    example: '12345',
    description: 'Reset Token',
  })
  @IsString()
  otp: string;

  @StringFieldOptional({
    example: '+1234567890',
    description: 'Phone number',
  })
  @IsPhoneNumber()
  phone_number?: string;

  @EnumField(() => ['email', 'sms'], { example: 'email' })
  method: 'email' | 'sms';
}
