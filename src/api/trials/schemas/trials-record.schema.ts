import { Appointment } from '@/api/appointments/schemas/appointments.schema';
import { User } from '@/api/users/schemas/user.schema';
import { TrialStatus } from '@/database/enums/trials.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Document,
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';
import { Trials } from './trials.schema';

@Schema({ timestamps: true, collection: 'trials_records' })
export class TrialsRecord extends Document {
  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: User.name,
    index: true,
  })
  user_id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    ref: Trials.name,
    index: true,
  })
  trial_id: Types.ObjectId;

  @Prop({ default: false })
  is_approved: boolean;

  @Prop({ type: Date, default: null })
  sign_up_date?: Date;

  @Prop({ type: Date, default: null })
  approval_date?: Date;

  @Prop({ type: Types.ObjectId, default: null })
  configuration_id?: Types.ObjectId;

  @Prop({ type: Number, default: null })
  configuration_version?: number;

  @Prop({ type: Boolean, default: false })
  has_questionnaire_schedule: boolean;

  @Prop({
    type: [
      {
        field_id: String,
        value: MongooseSchema.Types.Mixed,
        submitted_at: Date,
      },
    ],
    default: [],
  })
  onboarding_answers: {
    field_id: string;
    value: unknown;
    submitted_at: Date;
  }[];

  @Prop({
    type: String,
    enum: [
      'draft',
      'submitted',
      'pending_approval',
      'approved',
      'declined',
      'withdrawn',
    ],
    default: null,
    index: true,
  })
  onboarding_status?: string;

  @Prop({ type: String, default: null, select: false })
  onboarding_idempotency_key?: string;

  @Prop({ type: Types.ObjectId, default: null })
  approved_by?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  declined_by?: Types.ObjectId;

  @Prop({ type: Date, default: null })
  declined_at?: Date;

  @Prop({ type: String, default: null, maxlength: 500 })
  decision_note?: string;

  @Prop({ type: Date, default: null })
  anchor_date?: Date;

  @Prop({ type: String, default: null })
  anchor_timezone?: string;

  @Prop({ default: false })
  is_active: boolean;

  @Prop({
    default: TrialStatus.PENDING,
    enum: TrialStatus,
    index: true,
    type: String,
  })
  trial_status: TrialStatus;

  @Prop({
    type: [{ type: Types.ObjectId, ref: Appointment.name }],
    default: [],
  })
  appointments: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], default: [] })
  milestones: Types.ObjectId[];

  @Prop({ type: Number, default: 0, min: 0 })
  total_milestones: number;

  @Prop({ type: Number, default: 0, min: 0 })
  total_milestones_completed: number;

  @Prop({ type: Number, default: 0, min: 0 })
  number_of_badges: number;
}

export const TrialsRecordSchema = SchemaFactory.createForClass(TrialsRecord);
export type TrialsRecordDocument = HydratedDocument<TrialsRecord>;

// Enforce the one-enrolment-per-participant-per-trial invariant at the database
// layer. Deployments must run the duplicate-record audit before this index syncs.
TrialsRecordSchema.index(
  { user_id: 1, trial_id: 1 },
  { unique: true, name: 'unique_user_trial' },
);

TrialsRecordSchema.pre<TrialsRecordDocument>('save', function (next) {
  if (this.isNew && !this.sign_up_date) {
    this.sign_up_date = new Date();
  }
  next();
});
