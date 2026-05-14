import { ClassField, StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose, Type } from 'class-transformer';

export class AboutQuestion {
  @StringField({
    description: 'Question title',
    example: 'What is the ACL?',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  title: string;

  @StringField({
    description: 'Question answer',
    example:
      'Anterior cruciate ligament - ACL is 1 of 4 main ligaments of the knee and connects the tibia (shin bone) and the femur (thigh bone).',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  answer: string;
}

export class About {
  @StringField({
    description: 'Thread title',
    example: '14 - 17 years old',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  thread_title: string;

  @StringField({
    description: 'Age range',
    example: '14-17',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  age_between: string;

  @ClassField(() => AboutQuestion, { isArray: true })
  @Type(() => AboutQuestion)
  @Expose()
  @Prop({ type: [AboutQuestion], default: [] })
  question: AboutQuestion[];
}
