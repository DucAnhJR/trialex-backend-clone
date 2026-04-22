import { AuditResDto } from '@/common/dto/response/audit.dto';
import { StringField } from '@/decorators/field.decorators';
import { Expose, Transform } from 'class-transformer';

export class DiscoverResDto extends AuditResDto {
  @StringField({ description: 'Discover item type', example: 'Clinical trials' })
  @Expose()
  type: string;

  @StringField({
    description: 'Discover item author line',
    example: 'Written by Cheryl Tan, Jasmine Reese',
    maxLength: 500,
  })
  @Expose()
  author: string;

  @StringField({
    description: 'Discover item context/abstract',
    example: 'Abstract: Participants aged 18-35...',
    maxLength: 5000,
  })
  @Expose()
  context: string;

  @StringField({
    description: 'Discover item title',
    example: 'The Impact of Clinical Trials on Medicine',
    maxLength: 300,
  })
  @Expose()
  title: string;

  @StringField({
    description: 'Discover item image URL',
    example: 'https://cdn.ncbi.nlm.nih.gov/pmc/blobs/.../figure.jpg',
    nullable: true,
    required: false,
  })
  @Expose()
  image: string;

  @StringField({
    description: 'Source link for the discover item',
    example: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13094381/',
    nullable: true,
    required: false,
  })
  @Expose()
  link: string;

  @StringField({
    description: 'List of user IDs who liked this discover item',
    example: ['67b93550f81beed12ab81417'],
    isArray: true,
  })
  @Expose()
  @Transform(({ value }) => value?.map((v: any) => v?.toString()))
  like: string[];
}