import { SupportsType } from '@/database/enums/supports.enum';
import { EnumField, StringField } from '@/decorators/field.decorators';

export class CreateSupportsDto {
  @EnumField(() => SupportsType, {
    description: 'Type of support request',
    example: SupportsType.CONTACT,
  })
  type: SupportsType;

  @StringField({
    description: 'Subject of the support request',
    example: 'Issue with account login',
    maxLength: 100,
  })
  subject: string;

  @StringField({
    description: 'Detailed description of the support request',
    example: 'I am unable to log into my account since yesterday.',
    maxLength: 500,
  })
  message: string;

  @StringField({
    description: 'First name of the user',
    example: 'John',
    maxLength: 50,
  })
  first_name: string;

  @StringField({
    description: 'Last name of the user',
    example: 'Doe',
    maxLength: 50,
  })
  last_name: string;
}
