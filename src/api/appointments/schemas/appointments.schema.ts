import { Trials } from '@/api/trials/schemas/trials.schema';
import { User } from '@/api/users/schemas/user.schema';
import { AppointmentStatus } from '@/database/enums/appointment';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Trials.name, required: true })
  trial_id: Types.ObjectId;

  @Prop({ type: Date, default: null })
  sign_up_date: Date;

  @Prop({
    type: String,
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  appointment_status: AppointmentStatus;

  @Prop({ type: Date, default: null })
  appointment_date: Date;

  @Prop({ default: '' })
  appointment_location: string;

  @Prop({ default: false })
  is_active: boolean;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
export type AppointmentDocument = HydratedDocument<Appointment>;
