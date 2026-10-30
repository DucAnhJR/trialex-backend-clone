import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean, IsIn } from 'class-validator';

export const INTEREST_COPY_VERSION = 'interest-v1';
export class RegisterInterestDto {
  @ApiProperty({ enum: [INTEREST_COPY_VERSION] })
  @IsIn([INTEREST_COPY_VERSION])
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
