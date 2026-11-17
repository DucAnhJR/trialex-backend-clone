import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CONTACT_METHOD_OPTIONS } from '../profile-options';

// Shared by registration, stored information and profile responses.
export class ProfileExtras {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Expose()
  @Prop({ type: String, default: '' })
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Expose()
  @Prop({ type: String, default: '' })
  health_conditions?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(CONTACT_METHOD_OPTIONS, { each: true })
  @Expose()
  @Prop({ type: [String], enum: CONTACT_METHOD_OPTIONS, default: [] })
  methods_of_contact?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Expose()
  @Prop({ type: String, default: '' })
  gender_description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Expose()
  @Prop({ type: String, default: '' })
  ethnicity_description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Expose()
  @Prop({ type: String, default: '' })
  occupation_description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Expose()
  @Prop({ type: String, default: '' })
  parental_status_description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Expose()
  @Prop({ type: String, default: '' })
  education_level_description?: string;
}
