import { PasswordField } from '@/decorators/field.decorators';

export class UpdatePasswordDto {
  @PasswordField({
    description: 'New password',
  })
  newPassword: string;
}
