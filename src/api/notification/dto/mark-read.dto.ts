import { StringField } from '@/decorators/field.decorators';
import { IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class MarkReadDto {
  @StringField()
  @IsMongoId()
  notificationId: Types.ObjectId;
}
