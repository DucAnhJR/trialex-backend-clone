import { EmailField } from '@/decorators/field.decorators';

export class CheckEmailDto {
  @EmailField({ description: 'Email to check before registration' })
  email: string;
}
