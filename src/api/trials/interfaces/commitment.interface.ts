import { NumberField, StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class Commitment {
  @NumberField({
    description: 'Duration of the trial commitment',
    example: '6 months',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  duration: string;

  @StringField({
    description: 'Time commitment required for the trial',
    example: '2 hours per week',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  time_commitment: string;

  @StringField({
    description: 'Mode of participation in the trial',
    example: 'In-person',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  mode: string;
}
