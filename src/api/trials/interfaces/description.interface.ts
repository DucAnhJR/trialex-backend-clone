import { StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class Description {
  @StringField({
    description: 'Short description of the trial',
    example: 'A brief overview of the clinical trial.',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  short: string;

  @StringField({
    description: 'Elaborated description of the trial',
    example:
      'A detailed explanation of the clinical trial, including objectives, methodology, and expected outcomes.',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  elaborated: string;
}
