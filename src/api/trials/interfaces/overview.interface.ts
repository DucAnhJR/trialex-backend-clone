import { DateField, StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';
import { Description } from './description.interface';

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

  @StringField({
    description: 'List of milestones for the trial',
    example: ['Milestone 1', 'Milestone 2'],
    isArray: true,
    nullable: true,
  })
  @Expose()
  @Prop({ type: [String], default: null })
  milestones: string[];

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
}
