import { StringField } from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsMongoId } from 'class-validator';

export class AuditResDto {
  @StringField({
    example: '68d608f0363eff5322aefb7a',
    description: 'MongoDB ObjectId',
  })
  @IsMongoId()
  @Expose()
  _id: string;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  @Expose()
  updatedAt: Date;
}
