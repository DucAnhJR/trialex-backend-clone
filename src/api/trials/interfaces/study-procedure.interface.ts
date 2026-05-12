import { StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class StudyProcedure {
  @StringField({
    description: 'Procedure title',
    example: 'Trial overview',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  title: string;

  @StringField({
    description: 'Procedure answer',
    example:
      'Anterior cruciate ligament - ACL is 1 of 4 main ligaments of the knee and connects the tibia (shin bone) and the femur (thigh bone).',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  answer: string;
}
