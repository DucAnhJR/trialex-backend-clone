import { NumberField, StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class Participant {
  @StringField({
    description: 'Eligibility criteria for participants in the trial',
    example: ['Age 18-65', 'No prior history of heart disease'],
    isArray: true,
  })
  @Expose()
  @Prop({ type: [String], default: null })
  elegibility: string[];

  @StringField({
    description: 'Inclusion criteria for participants in the trial',
    example: ['Adults aged 18-65', 'Diagnosed with hypertension'],
    isArray: true,
  })
  @Expose()
  @Prop({ type: [String], default: null })
  exclusions: string[];

  @NumberField({
    description: 'Number of participants in the trial',
    example: 100,
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  number: number;

  @StringField({
    description: 'Demographics of the participants in the trial',
    example: 'Adults aged 18-65',
    nullable: true,
  })
  @Prop({ default: null })
  demographics: string;
}
