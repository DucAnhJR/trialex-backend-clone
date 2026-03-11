import { StringField } from '@/decorators/field.decorators';

export class TrialPreferences {
  @StringField({
    description: 'Title of the trial preference',
    example: 'Preference A',
  })
  title: string;

  @StringField({
    description: 'Image URL of the trial preference',
    example: 'https://example.com/image.png',
  })
  image: string;

  @StringField({
    description: 'Indicates if the trial preference is selected',
    example: true,
  })
  selected: boolean;
}