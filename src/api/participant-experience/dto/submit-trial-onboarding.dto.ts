import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SubmitTrialOnboardingDto {
  @IsOptional() configuration_version?: number;
  @IsOptional() @IsBoolean() consent?: boolean;
  @IsOptional() @IsObject() answers?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(128) idempotency_key?: string;
}

export class CompleteQuestionnaireDto {
  @IsBoolean() reported_completed: boolean;
  @IsOptional() @IsString() @MaxLength(100) mode?: string;
  @IsOptional() @IsString() @MaxLength(32) participant_reported_date?: string;
}

export class UpdateCompletionPromptDto {
  @IsIn(['shown', 'dismissed']) action: 'shown' | 'dismissed';
}

export class DeclineTrialOnboardingDto {
  @IsOptional() @IsString() @MaxLength(500) decision_note?: string;
}

export class SubmitNativeQuestionnaireDto {
  @IsObject() answers: Record<string, unknown>;
}
