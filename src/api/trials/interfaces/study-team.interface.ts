import { StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';
import { IsPhoneNumber } from 'class-validator';

export class StudyTeamMember {
  @StringField({
    description: 'Principal investigator name',
    example: 'Dr. Sarah Johnson',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  principal_investigator: string;

  @StringField({
    description: 'Trial sponsor',
    example: 'CardioPharm Australia Pty Ltd',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  sponsor: string;

  @StringField({
    description: 'Contact email',
    example: 'trial.cvd001@cardiopharm.com.au',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  email: string;

  @StringField({
    description: 'Team member website',
    example: 'https://aclstarr.com',
    nullable: true,
  })
  @Expose()
  @Prop({ default: '' })
  website: string;

  @StringField({
    description: 'Contact phone number',
    example: '61412345678',
    nullable: true,
  })
  @IsPhoneNumber()
  @Expose()
  @Prop({ default: null })
  phone: string;

  @StringField({
    description: 'Position in the study team',
    example: 'Senior Research Program Manager',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  position: string;

  @StringField({
    description: 'Team member gender',
    example: 'female',
    nullable: true,
  })
  @Expose()
  @Prop({ default: '' })
  gender: string;

  @StringField({
    description: 'Contribution summary',
    example:
      'Leads protocol design, site training, and ongoing trial oversight.',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  contribute: string;

  @StringField({
    description: 'Avatar URL',
    example: '',
    nullable: true,
  })
  @Expose()
  @Prop({ default: '' })
  avatar: string;
}
