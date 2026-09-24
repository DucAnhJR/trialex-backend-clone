import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type QuestionnaireInstanceDocument =
  HydratedDocument<QuestionnaireInstance>;

@Schema({ timestamps: true, collection: 'questionnaire_instances' })
export class QuestionnaireInstance {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  trial_record_id: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true })
  trial_id: Types.ObjectId;
  @Prop({ type: Types.ObjectId, required: true, index: true })
  user_id: Types.ObjectId;
  @Prop({ required: true }) configuration_version: number;
  @Prop({ required: true }) questionnaire_key: string;
  @Prop({ required: true }) scheduled_local_date: string;
  @Prop({ required: true }) timezone: string;
  @Prop({ type: Date, required: true, index: true }) due_at: Date;
  @Prop({
    enum: ['upcoming', 'due', 'completed', 'overdue', 'cancelled'],
    default: 'upcoming',
    index: true,
  })
  status: string;
  @Prop({ type: Object, default: null }) completion?: Record<string, unknown>;
  @Prop({ type: Object, default: null }) delivery?: Record<string, unknown>;
  @Prop({
    type: [{ field_id: String, value: MongooseSchema.Types.Mixed }],
    default: [],
  })
  answers: { field_id: string; value: unknown }[];
  @Prop({ type: [String], default: [] }) completion_modes: string[];
  @Prop({ type: Object, default: null }) completion_prompt?: Record<
    string,
    unknown
  >;
  @Prop({ default: 1 }) schedule_revision: number;
  @Prop({ type: Date, default: null }) prompt_shown_at?: Date;
  @Prop({ type: Date, default: null }) prompt_dismissed_at?: Date;
  @Prop({ type: Date, default: null }) prompt_answered_at?: Date;
}

export const QuestionnaireInstanceSchema = SchemaFactory.createForClass(
  QuestionnaireInstance,
);
QuestionnaireInstanceSchema.index(
  { trial_record_id: 1, questionnaire_key: 1, schedule_revision: 1 },
  { unique: true },
);
