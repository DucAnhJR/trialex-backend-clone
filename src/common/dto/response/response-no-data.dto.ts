import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ResponseNoDataDto {
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
    success = true,
    message = 'Success',
  }: {
    success?: boolean;
    message?: string;
  }) {
    this.success = success;
    this.message = message;
    this.timestamp = new Date();
  }
}
