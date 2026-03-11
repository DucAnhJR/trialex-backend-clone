import { EmailField, PasswordField } from '@/decorators/field.decorators';

export class LoginDto {
  @EmailField({
    description: 'User email',
  })
  email: string;

  @PasswordField({
    description: 'User password',
  })
  password: string;
}
