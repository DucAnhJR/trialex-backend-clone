import { AuditResDto } from '@/common/dto/response/audit.dto';
import { SupportsType } from '@/database/enums/supports.enum';
import { EnumField, StringField } from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';

export class SupportsResDto extends AuditResDto {
  @EnumField(() => SupportsType, {
    description: 'Type of support request',
    example: SupportsType.CONTACT,
  })
  @Expose()
  type: SupportsType;

  @StringField({
    description: 'Subject of the support request',
    example: 'Issue with account login',
    maxLength: 100,
  })
  @Expose()
  subject: string;

  @StringField({
    description: 'Detailed description of the support request',
    example: 'I am unable to log into my account since yesterday.',
    maxLength: 500,
  })
  @Expose()
  message: string;

  @StringField({
    description: 'First name of the user',
    example: 'John',
    maxLength: 50,
  })
  @Expose()
  first_name: string;

  @StringField({
    description: 'Last name of the user',
    example: 'Doe',
    maxLength: 50,
  })
  @Expose()
  last_name: string;
}
