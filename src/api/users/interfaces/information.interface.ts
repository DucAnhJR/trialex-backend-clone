import { SexEnum } from '@/database/enums/sex.enum';
import { ClassField, StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';
import { PhoneNumber } from './phone-number.interface';

export class Information {
  @StringField({
    description: 'First name of the user',
    example: 'John',
    nullable: true,
  })
  @Expose()
  @Prop({
    default: null,
  })
  first_name: string;

  @StringField({
    description: 'Last name of the user',
    example: 'Doe',
    nullable: true,
  })
  @Expose()
  @Prop({
    default: null,
  })
  last_name: string;

  @StringField({
    description: 'Date of birth of the user',
    example: '1990-01-01',
    nullable: true,
  })
  @Expose()
  @Prop({
    default: null,
  })
  date_of_birth: Date;

  @ClassField(() => PhoneNumber, {
    description: 'Phone number of the user',
    nullable: true,
  })
  @Expose()
  @Prop({ type: PhoneNumber })
  phone_number: PhoneNumber;

  @StringField({
    description: 'Sex of the user',
    example: SexEnum.MALE,
    nullable: true,
  })
  @Expose()
  @Prop({
    enum: SexEnum,
    default: SexEnum.MALE,
  })
  sex: SexEnum;

  @StringField({
    description: 'Gender of the user',
    nullable: true,
  })
  @Expose()
  @Prop({
    default: null,
  })
  gender: string;

  @StringField({
    description: 'Ethnicity of the user',
    nullable: true,
  })
  @Expose()
  @Prop({
    default: null,
  })
  ethnicity: string;

  @StringField({
    description: 'Occupation of the user',
    nullable: true,
  })
  @Expose()
  @Prop({
    default: null,
  })
  occupation: string;

  @StringField({
    description: 'Parental status of the user',
    nullable: true,
  })
  @Expose()
  @Prop({
    default: null,
  })
  parental_status: string;

  @StringField({
    description: 'Education level of the user',
    nullable: true,
  })
  @Expose()
  @Prop({
    default: null,
  })
  education_level: string;
}
