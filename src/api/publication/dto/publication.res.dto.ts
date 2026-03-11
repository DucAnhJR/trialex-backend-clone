import { AuditResDto } from '@/common/dto/response/audit.dto';
import { StringField } from '@/decorators/field.decorators';
import { Expose, Transform } from 'class-transformer';

export class PublicationResDto extends AuditResDto {
  @StringField({
    description: 'Title of the publication',
    example:
      'Text Exercise increases brain vessel lumen size and blood flow in young adults',
    maxLength: 200,
  })
  @Expose()
  title: string;

  @StringField({
    description: 'Authors of the publication',
    example: 'John Doe, Jane Smith',
    maxLength: 200,
  })
  @Expose()
  authors: string;

  @StringField({
    description: 'Image path of the publication',
    example: '/images/publication1.png',
    nullable: true,
  })
  @Expose()
  image_path: string;

  @StringField({
    description: 'Body/abstract of the publication',
    example:
      'Abstract: Participants aged 18-35 who engaged in regular aerobic exercise...',
    maxLength: 2000,
  })
  @Expose()
  body: string;

  @StringField({
    description: 'List of user IDs who liked the publication',
    example: ['64b8f0f2e1b1c8a1d2e3f4g5', '64b8f0f2e1b1c8a1d2e3f4g6'],
    isArray: true,
  })
  @Expose()
  @Transform(({ value }) => value?.map((v: any) => v?.toString()))
  likes: string[];

  @StringField({
    description: 'Type of publication',
    example: 'Sports Medicine',
    maxLength: 100,
  })
  @Expose()
  type: string;
}
