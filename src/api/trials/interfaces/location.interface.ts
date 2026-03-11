import { StringField } from '@/decorators/field.decorators';
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
}
