import { SexEnum } from '@/database/enums/sex.enum';
import { ClassField, StringField } from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';
import { PhoneNumber } from '../interfaces/phone-number.interface';

export class CreateUserInformationDto {
  @StringField({
    description: 'First name of the user',
    example: 'John',
  })
  @Expose()
  first_name: string;

  @StringField({
    description: 'Last name of the user',
    example: 'Doe',
  })
  @Expose()
  last_name: string;

  @StringField({
    description: 'Date of birth of the user',
    example: '1990-01-01',
  })
  @Expose()
  date_of_birth: Date;

  @ClassField(() => PhoneNumber, {
    description: 'Phone number of the user',
  })
  @Expose()
  phone_number: PhoneNumber;

  @StringField({
    description: 'Sex of the user',
    example: SexEnum.MALE,
  })
  @Expose()
  sex: SexEnum;

  @StringField({
    description: 'Gender of the user',
  })
  @Expose()
  gender: string;

  @StringField({
    description: 'Ethnicity of the user',
  })
  @Expose()
  ethnicity: string;

  @StringField({
    description: 'Occupation of the user',
  })
  @Expose()
  occupation: string;

  @StringField({
    description: 'Parental status of the user',
  })
  @Expose()
  parental_status: string;

  @StringField({
    description: 'Education level of the user',
  })
  @Expose()
  education_level: string;
}
