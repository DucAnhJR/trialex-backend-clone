import { Appointment } from '@/api/appointments/schemas/appointments.schema';
import { User } from '@/api/users/schemas/user.schema';
import { TrialStatus } from '@/database/enums/trials.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';
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

  @Prop({ type: Number, default: 0, min: 0 })
  number_of_badges: number;
}

export const TrialsRecordSchema = SchemaFactory.createForClass(TrialsRecord);
export type TrialsRecordDocument = HydratedDocument<TrialsRecord>;

TrialsRecordSchema.pre<TrialsRecordDocument>('save', function (next) {
  if (this.isNew && !this.sign_up_date) {
    this.sign_up_date = new Date();
  }
  next();
});
