import { Information } from '@/api/users/interfaces/information.interface';
import { Notifications } from '@/api/users/interfaces/notifications.interface';
import { Security } from '@/api/users/interfaces/security.interface';
import { SexEnum } from '@/database/enums/sex.enum';
import { UserRole } from '@/database/enums/user.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Document } from '../interfaces/document.interface';
import { TrialPreferences } from '../interfaces/trial-preferences.interface';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: Information,
    default: () => ({
      first_name: null,
      last_name: null,
      date_of_birth: null,
      phone_number: null,
      sex: SexEnum.MALE,
      gender: null,
      ethnicity: null,
      occupation: null,
      parental_status: null,
      education_level: null,
    }),
  })
  information: Information;

  @Prop({
    type: Notifications,
    default: () => ({
      push: true,
      email: true,
      sms: true,
      vibrate: true,
    }),
  })
  notifications: Notifications;

  @Prop({ default: null })
  profile_image_file: string;

  @Prop({
    type: Document,
    default: null,
  })
  document: Document;

  @Prop({ default: false })
  phone_number_verified: boolean;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Prop({ type: [Types.ObjectId], ref: 'TrialsRecord', default: [] })
  trial_records: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Trials', default: [] })
  saved_trials: Types.ObjectId[];

  @Prop({
    type: Security,
    default: () => ({
      push: true,
      email: true,
      sms: true,
      vibrate: true,
    }),
  })
  security: Security;

  @Prop({ type: [Object], default: [] })
  trial_preferences: TrialPreferences[];
}

export const UserSchema = SchemaFactory.createForClass(User);
