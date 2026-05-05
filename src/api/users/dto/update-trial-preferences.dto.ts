import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsMongoId } from 'class-validator';

export class UpdateTrialsPreferencesDto {
  @ApiProperty({
    description: 'Trial preference document id',
    example: '67b93550f81beed12ab81417',
  })
  @IsMongoId()
  trialPreferenceId: string;

  @ApiProperty({ description: 'Select or unselect preference', example: true })
  @IsBoolean()
  selected: boolean;
}
