import { BooleanField } from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { OffsetPaginationDto } from './offset-pagination.dto';

export class OffsetPaginatedDto<TData> {
  @ApiProperty({ type: [Object] })
  @Expose()
  readonly data: TData[];

  @ApiProperty()
  @Expose()
  pagination: OffsetPaginationDto;

  @BooleanField()
  @Expose()
  success: boolean;

  @ApiProperty()
  @Expose()
  message: string;

  @ApiProperty()
  @Expose()
  timestamp: Date;

  constructor({
    data,
    meta,
    message = 'OK',
    success = true,
  }: {
    data: TData[];
    meta: OffsetPaginationDto;
    success?: boolean;
    message?: string;
  }) {
    this.data = data;
    this.pagination = meta;
    this.success = success;
    this.message = message;
    this.timestamp = new Date();
  }
}
