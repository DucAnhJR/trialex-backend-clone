import { BaseUserResDto } from '@/api/users/dto/base-user.res.dto';
import { AuditResDto } from '@/common/dto/response/audit.dto';
import { ClassField, StringField } from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class NotificationResDto extends AuditResDto {
  @StringField({
    example: '690477dd816cf16fce4caa99',
  })
  @IsMongoId()
  @Expose()
  userId: Types.ObjectId;

  @ClassField(() => BaseUserResDto)
  @Expose()
  user: BaseUserResDto;

  @ClassField(() => BaseUserResDto)
  @Expose()
  sender?: BaseUserResDto;

  @ApiProperty({
    type: String,
    required: false,
    example: '601b2262-7316-4899-9742-031a610b5b0f',
  })
  @Expose()
  senderId?: string;

  @ApiProperty({
    type: String,
    example: 'Welcome to Trialex',
  })
  @Expose()
  title: string;

  @ApiProperty({
    type: String,
    required: false,
    example:
      'Hello! Thank you for joining Trialex. We are excited to have you on board.',
  })
  @Expose()
  message?: string;

  @ApiProperty({ type: String, required: false, example: 'workspace' })
  @Expose()
  type?: string;

  @ApiProperty({
    type: Object,
    required: false,
    example: {
      uri: '/invite-members/23c070e36f701860b080a7cf76012d0d8065bd0b698a48045e53c95f5ffde82c',
      vibrate: true,
    },
  })
  @Expose()
  data?: any;

  @ApiProperty({ type: Boolean, example: false })
  @Expose()
  isRead: boolean;

  @ApiProperty({
    type: String,
    required: false,
    example: '2025-10-22T20:14:18.405Z',
  })
  @Expose()
  readAt?: Date;
}
