import { BooleanField, StringField } from '@/decorators/field.decorators';

export class UpdateTrialsPreferencesDto {
  @StringField({
    description: 'The trial preference option',
    example: 'Daily Updates',
  })
  trialPreference: string;

  @BooleanField({
    description: 'Indicates if this preference is selected by the user',
    example: true,
  })
  selected: boolean;
}
