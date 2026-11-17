import { PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsMongoId,
  IsOptional,
} from 'class-validator';
import { Information } from '../interfaces/information.interface';

export class UpdatePersonalInfoDto extends PartialType(Information) {
  @IsOptional()
  @IsEmail()
  email?: string;

  // Updating all preferences together gives the form a single save boundary.
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  trial_preference_ids?: string[];
}
