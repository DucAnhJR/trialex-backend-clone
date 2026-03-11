import { StringField } from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';

export class TrialPreferencesResDto {
  @StringField({
    isArray: true,
    description: 'List of trial preferences',
  })
  @Expose()
  trial_preferences: string[];
}
