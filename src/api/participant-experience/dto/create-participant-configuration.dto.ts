import { IsObject, IsOptional } from 'class-validator';

export class CreateParticipantConfigurationDto {
  @IsOptional()
  @IsObject()
  schedule?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  completion_prompt?: Record<string, unknown>;
}
