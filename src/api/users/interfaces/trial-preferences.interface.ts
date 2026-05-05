import { BooleanField, StringField } from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';

export class TrialPreferences {
  @StringField({
    description: 'Preference id',
    example: '67b93550f81beed12ab81417',
  })
  @Expose()
  _id: string;

  @StringField({
    description: 'Title of the trial preference',
    example: 'Preference A',
  })
  @Expose()
  trial_preferences_name: string;

  @StringField({
    description: 'Image key of the trial preference',
    example: 'images.preferenceHeart',
  })
  @Expose()
  image: string;

  @BooleanField({
    description: 'Indicates if the trial preference is selected by current user',
    example: true,
  })
  @Expose()
  selected: boolean;
}
