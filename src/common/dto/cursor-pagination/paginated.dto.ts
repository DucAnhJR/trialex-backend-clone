import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CursorPaginationDto } from './cursor-pagination.dto';

export class CursorPaginatedDto<TData> {
  @ApiProperty({ type: [Object] })
  @Expose()
  readonly data: TData[];

  @ApiProperty()
  @Expose()
  pagination: CursorPaginationDto;

  @ApiProperty()
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
    success = true,
    message = 'OK',
  }: {
    data: TData[];
    meta: CursorPaginationDto;
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
