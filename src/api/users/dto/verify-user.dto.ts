import { EmailField, StringField } from '@/decorators/field.decorators';
import { IsPhoneNumber } from 'class-validator';

export class VerifyUserDto {
  @EmailField({
    description: 'Email address of the user to verify',
    example: 'user@example.com',
  })
  email: string;

  @StringField({
    description: 'Phone number of the user to verify',
    example: '+1234567890',
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @StringField({
    description: 'Verification token sent to the user',
    example: '123456',
  })
  code: string;
}
