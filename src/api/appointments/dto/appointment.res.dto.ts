import { TrialsResDto } from '@/api/trials/dto/trials.res.dto';
import { BaseUserResDto } from '@/api/users/dto/base-user.res.dto';
import { AppointmentStatus } from '@/database/enums/appointment';
import {
  BooleanField,
  ClassField,
  DateField,
  EnumField,
  StringField,
} from '@/decorators/field.decorators';
import { Expose, Transform } from 'class-transformer';
import { IsMongoId } from 'class-validator';

export class AppointmentResDto {
  @IsMongoId()
  @Expose()
  @Transform(({ value }) => value?.toString())
  user_id: string;

  @ClassField(() => BaseUserResDto)
  @Expose()
  user: BaseUserResDto;

  @IsMongoId()
  @Expose()
  @Transform(({ value }) => value?.toString())
  trial_id: string;

  @ClassField(() => TrialsResDto)
  @Expose()
  trial: TrialsResDto;

  @DateField({
    description: 'Date when the user signed up for the appointment',
  })
  @Expose()
  sign_up_date: Date;

  @EnumField(() => AppointmentStatus, {
    description: 'Status of the appointment',
  })
  @Expose()
  appointment_status: AppointmentStatus;

  @DateField({
    description: 'Date of the appointment',
  })
  @Expose()
  appointment_date: Date;

  @StringField({
    description: 'Location of the appointment',
  })
  @Expose()
  appointment_location: string;

  @BooleanField({
    description: 'Indicates if the appointment is active',
    default: true,
  })
  @Expose()
  is_active: boolean;
}
