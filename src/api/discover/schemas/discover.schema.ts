import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DiscoverDocument = HydratedDocument<Discover>;

@Schema({ collection: 'discover', timestamps: true })
export class Discover {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  author: string;

  @Prop({ required: true })
  context: string;

  @Prop({ required: true })
  title: string;

  @Prop({ type: String, default: '' })
  image: string;

  @Prop({ type: String, default: '' })
  link: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  like: Types.ObjectId[];
}

export const DiscoverSchema = SchemaFactory.createForClass(Discover);