import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StudyTeamMembersDocument = HydratedDocument<StudyTeamMembers>;

@Schema({ timestamps: true, collection: 'study_team_members' })
export class StudyTeamMembers {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  position: string;

  @Prop({ default: '' })
  biography: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  university: string;

  @Prop({ default: '' })
  profileImage: string;
}

export const StudyTeamMembersSchema =
  SchemaFactory.createForClass(StudyTeamMembers);
