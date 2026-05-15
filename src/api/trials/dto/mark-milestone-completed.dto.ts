import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class MarkMilestoneCompletedDto {
  @ApiProperty({
    description: 'Milestone ID from trials.overview.milestones',
    example: '67b93550f81beed12ab81418',
  })
  @IsMongoId()
  milestone_id: string;

  @ApiProperty({
    description: 'Trial record ID',
    example: '67b93550f81beed12ab81417',
  })
  @IsMongoId()
  trial_record_id: string;
}
