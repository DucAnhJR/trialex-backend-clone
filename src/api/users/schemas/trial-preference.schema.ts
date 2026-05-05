import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TrialPreferenceDocument = HydratedDocument<TrialPreference>;

@Schema({ collection: 'trial_preferences', timestamps: true })
export class TrialPreference {
  @Prop({ required: true })
  trial_preferences_name: string;

  @Prop({ required: true })
  image: string;
}

export const TrialPreferenceSchema =
  SchemaFactory.createForClass(TrialPreference);
