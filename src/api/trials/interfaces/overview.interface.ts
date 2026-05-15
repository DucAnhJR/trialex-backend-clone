import {
  ClassField,
  DateField,
  StringField,
} from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose, Transform } from 'class-transformer';
import { Types } from 'mongoose';
import { Description } from './description.interface';

export class TrialMilestone {
  @StringField({
    description: 'Milestone ID',
    example: '68d608f0363eff5322aefb7a',
  })
  @Expose()
  @Transform(({ value }) => value?.toString())
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @StringField({
    description: 'Milestone title',
    example: 'Milestone 1',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  title: string;
}

export class Overview {
  @StringField({
    description: 'ID of the trial',
    example: 'CVD-001',
    nullable: false,
  })
  @Expose()
  @Prop()
  id: string;

  @StringField({
    description: 'Name of the trial',
    example: 'Cardiovascular Health Study',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  name: string;

  @DateField({
    description: 'Start date of the trial',
    example: '2023-01-01',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  start_date: Date;

  @DateField({
    description: 'End date of the trial',
    example: '2024-01-01',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  end_date: Date;

  @StringField({
    description: 'Purpose of the trial',
    example: 'To evaluate the effectiveness of a new cardiovascular drug.',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  purpose: string;

  @StringField({
    description: 'Medical condition being studied in the trial',
    example: 'Cardiovascular Disease',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  medical_condition: string;

  @ClassField(() => TrialMilestone, {
    description: 'List of milestones for the trial',
    isArray: true,
  })
  @Expose()
  @Prop({ type: [TrialMilestone], default: [] })
  milestones: TrialMilestone[];

  @StringField({
    description: 'Detailed description of the trial',
    nullable: true,
  })
  @Expose()
  @Prop({ type: Description, default: null })
  description: Description;

  @StringField({
    description: 'Theme of the trial',
    example: 'Cardiology',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  theme: string;

  @StringField({
    description: 'Full official name of the trial',
    example:
      'Anterior Cruciate Ligament Stratified Accelerated Repair or Reconstruction',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  full_name: string;

  @StringField({
    description: 'Search keywords for the trial',
    example: ['ACL', 'Knee', 'Surgery'],
    isArray: true,
    nullable: true,
  })
  @Expose()
  @Prop({ type: [String], default: [] })
  keywords: string[];

  @StringField({
    description: 'URLs to the Patient Information Sheet(s)',
    example: ['https://example.com/pis.pdf'],
    isArray: true,
    nullable: true,
  })
  @Expose()
  @Prop({ type: [String], default: [] })
  pis_urls: string[];
}
