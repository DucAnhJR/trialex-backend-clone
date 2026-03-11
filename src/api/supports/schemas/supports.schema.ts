import { SupportsType } from '@/database/enums/supports.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SupportsDocument = HydratedDocument<Supports>;

@Schema({ timestamps: true })
export class Supports {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requester_id: Types.ObjectId;

  @Prop({ type: String, enum: SupportsType, required: true })
  type: SupportsType;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: false, default: null })
  first_name: string;

  @Prop({ required: false, default: null })
  last_name: string;
}

export const SupportsSchema = SchemaFactory.createForClass(Supports);
