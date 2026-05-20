import { NumberField, StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class Location {
  @StringField({
    description: 'Trial sites',
    example: 'Hospital A, Clinic B',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  sites: string;

  @StringField({
    description: 'Postcodes of the trial locations',
    example: ['12345', '67890'],
    isArray: true,
  })
  @Prop({ type: [String], default: null })
  postcodes: string[];

  @StringField({
    description: 'Number of locations involved in the trial',
    example: 5,
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  number: number;

  @StringField({
    description: 'Proximity information related to the trial locations',
    example: 'Within 10 miles of city center',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  proximity: string;

  @NumberField({
    description: 'Latitude of the primary trial location',
    example: 51.5074,
    nullable: true,
    min: -90,
    max: 90,
  })
  @Expose()
  @Prop({ type: Number, default: null })
  latitude: number;

  @NumberField({
    description: 'Longitude of the primary trial location',
    example: -0.1278,
    nullable: true,
    min: -180,
    max: 180,
  })
  @Expose()
  @Prop({ type: Number, default: null })
  longitude: number;

  @StringField({
    description: 'Site codes for each participating location',
    example: ['ACL001Ayr', 'ACL002Birmingham'],
    isArray: true,
    nullable: true,
  })
  @Expose()
  @Prop({ type: [String], default: [] })
  site_codes: string[];

  @Prop({ default: false })
  is_multisite: boolean;
}
