import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PublicationDocument = HydratedDocument<Publication>;

@Schema({ timestamps: true })
export class Publication {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  authors: string;

  @Prop({ default: '' })
  image_path: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  likes: Types.ObjectId[];

  @Prop({ required: true })
  type: string;
}

export const PublicationSchema = SchemaFactory.createForClass(Publication);
