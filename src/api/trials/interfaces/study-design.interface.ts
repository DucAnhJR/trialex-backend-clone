import { NumberField, StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class StudyDesign {
  @StringField({
    description: 'Types of study design used in the trial',
    example: ['Randomized', 'Double-Blind'],
    isArray: true,
    nullable: true,
  })
  @Expose()
  @Prop({ type: [String], default: null })
  types: string[];

  @StringField({
    description: 'Phase of the clinical trial',
    example: 'Phase 3',
    nullable: true,
  })
  @Expose()
  @Prop({ type: String, default: null })
  phase: string;

  @StringField({
    description: 'Type of treatment being investigated in the trial',
    example: 'Chemotherapy',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  treatment_type: string;

  @StringField({
    description: 'Description of the control group in the trial',
    example: 'Placebo',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  control: string;

  @StringField({
    description: 'Step-by-step schedule of the trial from consent to follow-up',
    example: 'Day 0: Consent. Days 1-7: Medication. Day 8: Assessment.',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  schedule: string;

  @NumberField({
    description: 'Total number of study visits per participant',
    example: 4,
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  number_of_visits: number;
}
