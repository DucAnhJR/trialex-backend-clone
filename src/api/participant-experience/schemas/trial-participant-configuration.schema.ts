import { Trials } from '@/api/trials/schemas/trials.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TrialParticipantConfigurationDocument =
  HydratedDocument<TrialParticipantConfiguration>;

@Schema({ timestamps: true, collection: 'trial_participant_configurations' })
export class TrialParticipantConfiguration {
  @Prop({ type: Types.ObjectId, ref: Trials.name, required: true, index: true })
  trial_id: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  version: number;

  @Prop({
    enum: ['draft', 'published', 'retired'],
    default: 'draft',
    index: true,
  })
  status: 'draft' | 'published' | 'retired';

  @Prop({ type: Object, required: true })
  onboarding: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  schedule: Record<string, unknown>;

  @Prop({ type: Object, default: () => ({ required: true }) })
  approval: Record<string, unknown>;

  @Prop({ type: Object, default: () => ({ enabled: false }) })
  completion_prompt: Record<string, unknown>;

  @Prop({ type: Date, default: null })
  published_at?: Date;

  // Identifies configurations created by the reviewed provisioning script.
  // It makes that script idempotent without affecting participant snapshots.
  @Prop({ type: String, default: null })
  provisioning_key?: string;
}

export const TrialParticipantConfigurationSchema = SchemaFactory.createForClass(
  TrialParticipantConfiguration,
);
TrialParticipantConfigurationSchema.index(
  { trial_id: 1, version: 1 },
  { unique: true },
);
TrialParticipantConfigurationSchema.index(
  { trial_id: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'published' },
    name: 'one_published_configuration_per_trial',
  },
);
