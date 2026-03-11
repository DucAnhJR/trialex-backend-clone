import { ClassFieldOptional } from '@/decorators/field.decorators';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CreateNotificationDto {
  @ApiProperty({ description: 'ID người nhận', type: String })
  userId: Types.ObjectId;

  @ApiProperty({ description: 'ID người gửi', type: String, required: false })
  senderId?: Types.ObjectId;

  @ApiProperty({ description: 'Tiêu đề thông báo', type: String })
  title: string;

  @ApiProperty({
    description: 'Nội dung thông báo',
    type: String,
    required: false,
  })
  message: string;

  @ApiProperty({ description: 'Loại thông báo', type: String, required: false })
  type?: string;

  @ClassFieldOptional(() => Object, {
    description: 'Additional data for the notification',
  })
  data?: Record<string, any>;
}
