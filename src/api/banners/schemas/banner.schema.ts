import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BannerDocument = HydratedDocument<Banner>;

@Schema({ collection: 'banners', versionKey: false })
export class Banner {
  @Prop({ type: String, required: true, trim: true, unique: true })
  title: string;

  @Prop({ type: String, required: true, trim: true })
  description: string;

  @Prop({ type: String, required: true, trim: true })
  image: string;

  @Prop({ type: String, required: true, trim: true })
  link: string;

  @Prop({ type: String, required: true, trim: true })
  tag: string;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
