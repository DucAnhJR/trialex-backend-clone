import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { TrialStatus } from '@/database/enums/trials.enum';
import { EnumFieldOptional } from '@/decorators/field.decorators';

export class QueryTrialsRecord extends PageOptionsDto {
  @EnumFieldOptional(() => TrialStatus, {
    description: 'Filter by trial status',
    example: TrialStatus.PENDING,
  })
  status?: TrialStatus;
}
