import { TrialStatus } from '@/database/enums/trials.enum';
import {
  BooleanFieldOptional,
  EnumFieldOptional,
  NumberFieldOptional,
} from '@/decorators/field.decorators';

export class UpdateTrialRecord {
  @BooleanFieldOptional({
    description: 'Indicates if the trial is completed',
  })
  is_approved: boolean;

  @EnumFieldOptional(() => TrialStatus, {
    description: 'Status of the trial',
  })
  trial_status: TrialStatus;

  @BooleanFieldOptional({
    description: 'Indicates if the trial record is active',
  })
  is_active: boolean;

  @NumberFieldOptional({
    description: 'Indicates if the trial is approved',
  })
  number_of_badges: number;
}
