import { StringField } from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';

export class Ethical {
  @StringField({
    description: 'Informed consent process for the trial',
    example: 'Written informed consent obtained from all participants',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  consent: string;

  @StringField({
    description: 'Ethical approval details for the trial',
    example: 'Approved by the Institutional Review Board (IRB)',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  approval: string;

  @StringField({
    description: 'Ethical approval ID for the trial',
    example: 'IRB-2023-001',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  approval_id: string;
}
