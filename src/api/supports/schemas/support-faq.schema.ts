import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SupportFaqDocument = HydratedDocument<SupportFaq>;

@Schema({ _id: false })
export class SupportQuestion {
  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, required: true, default: '' })
  answer: string;
}

const SupportQuestionSchema = SchemaFactory.createForClass(SupportQuestion);

@Schema({ collection: 'supports', versionKey: false })
export class SupportFaq {
  @Prop({ type: String, required: true, trim: true, unique: true })
  thread_title: string;

  @Prop({ type: [SupportQuestionSchema], required: true, default: [] })
  questions: SupportQuestion[];
}

export const SupportFaqSchema = SchemaFactory.createForClass(SupportFaq);
