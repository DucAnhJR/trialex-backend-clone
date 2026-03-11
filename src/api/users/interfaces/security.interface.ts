import { StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class Security {
  @StringField({
    description: 'Face ID authentication',
    example: 'face_id_value',
  })
  @Expose()
  @Prop({
    default: null,
  })
  face_id: string;
}
