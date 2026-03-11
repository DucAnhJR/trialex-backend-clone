import {
  BooleanField,
  DateField,
  StringField,
} from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';

export class Document {
  @StringField({
    description: 'File name of the uploaded document',
    example: 'passport.jpg',
  })
  @Prop({
    default: null,
  })
  file_name: string;

  @DateField({
    description: 'Date and time when the document was uploaded',
    example: '2023-10-01T12:34:56.789Z',
  })
  @Prop({
    default: null,
  })
  uploaded_at: Date;

  @BooleanField({
    description: 'Indicates whether the document has been verified',
    example: false,
  })
  @Prop({
    default: false,
  })
  verified: boolean;

  @DateField({
    description: 'Date and time when the document was verified',
    example: '2023-10-02T12:34:56.789Z',
  })
  @Prop({
    default: null,
  })
  verified_at?: Date;

  @StringField({
    description: 'Type of identification document',
    example: 'passport',
  })
  @Prop({
    default: null,
  })
  id_type: string;

  @StringField({
    description: 'Country that issued the identification document',
    example: 'USA',
  })
  @Prop({
    default: null,
  })
  country_issue: string;
}
