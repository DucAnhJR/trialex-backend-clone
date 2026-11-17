import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsMongoId, IsOptional } from 'class-validator';

export class QueryTrialsDto extends PageOptionsDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  theme_ids?: string[];
}
