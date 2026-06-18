import { CreateUserInformationDto } from '@/api/users/dto/create-user-information.dto';
import { ClassField, EmailField, StringField } from '@/decorators/field.decorators';
import { Matches } from 'class-validator';

export class SignUpDto {
  @EmailField({
    description: 'User email',
  })
  email: string;

  @StringField({
    description: 'User password',
    minLength: 8,
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/, {
    message: 'password must include uppercase, lowercase, and a number',
  })
  password: string;

  @ClassField(() => CreateUserInformationDto, {
    description: 'User profile information required to complete registration',
  })
  information: CreateUserInformationDto;
}
