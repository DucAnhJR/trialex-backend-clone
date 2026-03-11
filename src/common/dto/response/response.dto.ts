import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ResponseDto<TData> {
  @ApiProperty({ type: [Object] })
  @Expose()
  readonly data: TData;

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
    success = true,
    message = 'Success',
  }: {
    data: TData;
    success?: boolean;
    message?: string;
  }) {
    this.data = data;
    this.success = success;
    this.message = message;
    this.timestamp = new Date();
  }
}
