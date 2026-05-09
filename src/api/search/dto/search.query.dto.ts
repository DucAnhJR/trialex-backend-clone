import {
  NumberFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class SearchQueryDto {
  @StringFieldOptional({
    description: 'Search keyword',
    example: 'cancer',
  })
  q?: string;

  @NumberFieldOptional({
    int: true,
    min: 1,
    max: 50,
    default: 20,
    description: 'Max items per type',
  })
  limit?: number = 20;
}
