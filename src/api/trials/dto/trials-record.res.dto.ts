import { TrialStatus } from '@/database/enums/trials.enum';
import {
  BooleanField,
  ClassField,
  DateField,
  EnumField,
  NumberField,
  StringField,
} from '@/decorators/field.decorators';
import { Expose, Transform } from 'class-transformer';
import { TrialsResDto } from './trials.res.dto';

export class TrialsRecordResDto {
  @StringField({
    description: 'Trial Record ID',
  })
  @Expose()
  @Transform(({ value }) => value?.toString())
  _id: string;

  @StringField({
    description: 'User Record ID',
  })
  @Expose()
  @Transform(({ value }) => value?._id?.toString() ?? value?.toString())
  user_id: string;

  @StringField({
    description: 'Trial ID',
  })
  @Expose()
  @Transform(({ value }) => value?._id?.toString() ?? value?.toString())
  trial_id: string;

  @ClassField(() => TrialsResDto, {
    description: 'Trial Details',
  })
  @Expose()
  trial: TrialsResDto;

  @BooleanField({
    description: 'Is Approved',
  })
  @Expose()
  is_approved: boolean;

  @BooleanField({
    description: 'Is Active',
  })
  @Expose()
  is_active: boolean;

  @EnumField(() => TrialStatus, {
    description: 'Trial Status',
  })
  @Expose()
  trial_status: TrialStatus;

  @DateField({
    description: 'Sign Up Date',
  })
  @Expose()
  sign_up_date: Date;

  @DateField({
    description: 'Approval Date',
  })
  @Expose()
  approval_date: Date;

  @StringField({
    description: 'List of Appointment IDs',
    isArray: true,
  })
  @Expose()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => v?._id?.toString() ?? v?.toString())
      : [],
  )
  appointments: string[];

  @StringField({
    description: 'List of Trial Milestone IDs',
    isArray: true,
  })
  @Expose()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((v) => v?._id?.toString() ?? v?.toString())
      : [],
  )
  milestones: string[];

  @NumberField({
    description: 'Total milestones in the trial',
    default: 0,
  })
  @Expose()
  total_milestones: number;

  @NumberField({
    description: 'Total completed milestones in the trial record',
    default: 0,
  })
  @Expose()
  total_milestones_completed: number;

  @NumberField({
    description: 'Number of Badges',
    default: 0,
  })
  @Expose()
  number_of_badges: number;
}
