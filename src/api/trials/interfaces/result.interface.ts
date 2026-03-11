import { StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class Result {
  @StringField({
    description: 'Primary outcome of the trial',
    example: 'Reduction in blood pressure',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  outcome: string;

  @StringField({
    description: 'Post trial update information',
    example: 'Results published in Journal X',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  post_trial_update: string;
}
