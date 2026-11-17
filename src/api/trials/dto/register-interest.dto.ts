import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean, IsIn } from 'class-validator';

export const INTEREST_COPY_VERSION = 'interest-v2';
// v1 evidence remains v1; existing installed clients remain compatible.
export const ACCEPTED_INTEREST_COPY_VERSIONS = [
  'interest-v1',
  INTEREST_COPY_VERSION,
];
export class RegisterInterestDto {
  @ApiProperty({ enum: ACCEPTED_INTEREST_COPY_VERSIONS })
  @IsIn(ACCEPTED_INTEREST_COPY_VERSIONS)
  copy_version: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  trial_information_read: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  interest_is_not_enrolment: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  study_team_obtains_consent: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true)
  share_contact_details: boolean;
}
