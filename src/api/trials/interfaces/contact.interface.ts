import { StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';
import { IsPhoneNumber } from 'class-validator';

export class Contact {
  @StringField({
    description: 'Principal investigator of the trial',
    example: 'Dr. John Doe',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  principal_investigator: string;

  @StringField({
    description: 'Sponsor of the trial',
    example: 'Pharma Inc.',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  sponsor: string;

  @StringField({
    description: 'Contact email for the trial',
    example: 'contact@pharmatrial.com',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  email: string;

  @StringField({
    description: 'Contact phone number for the trial',
    example: '+1234567890',
    nullable: true,
  })
  @IsPhoneNumber()
  @Expose()
  @Prop({ default: null })
  phone: string;
}
