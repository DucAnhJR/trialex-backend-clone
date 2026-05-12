import {
  Commitment,
  Contact,
  Ethical,
  Location,
  Overview,
  Participant,
  Result,
  StudyDesign,
} from '@/api/trials/interfaces';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TrialsDocument = HydratedDocument<Trials>;

@Schema({ timestamps: true })
export class Trials {
  @Prop({
    type: Overview,
    default: () => ({
      id: null,
      name: null,
      full_name: null,
      start_date: null,
      end_date: null,
      purpose: null,
      medical_condition: null,
      milestones: [],
      description: { short: null, elaborated: null },
      theme: null,
      keywords: [],
      pis_urls: [],
    }),
  })
  overview: Overview;
  @Prop({
    type: StudyDesign,
    default: () => ({
      types: [],
      phase: null,
      treatment_type: null,
      control: null,
      schedule: null,
      number_of_visits: null,
    }),
  })
  study_design: StudyDesign;
  @Prop({
    type: Participant,
    default: () => ({
      elegibility: [],
      exclusions: [],
      number: null,
      demographics: null,
    }),
  })
  participant: Participant;
  @Prop({
    type: Location,
    default: () => ({
      sites: null,
      postcodes: [],
      number: null,
      proximity: null,
      site_codes: [],
      is_multisite: false,
    }),
  })
  location: Location;

  @Prop({
    type: Commitment,
    default: () => ({
      duration: null,
      time_commitment: null,
      mode: null,
    }),
  })
  commitment: Commitment;

  @Prop({
    type: Contact,
    default: () => ({
      principal_investigator: null,
      sponsor: null,
      email: null,
      phone: null,
      contact_name: null,
      website: null,
    }),
  })
  contact: Contact;

  @Prop({ type: [String], default: [] })
  benefits: string[];
  @Prop({ type: [String], default: [] })
  risks: string[];
  @Prop({ type: [String], default: [] })
  compensations: string[];

  @Prop({
    type: Ethical,
    default: () => ({
      consent: null,
      approval: null,
      approval_id: null,
    }),
  })
  ethical: Ethical;
  @Prop({
    type: Result,
    default: () => ({
      outcome: null,
      post_trial_update: null,
      publication_url: null,
    }),
  })
  result: Result;

  @Prop({ type: [Types.ObjectId], ref: 'StudyTeamMembers', default: [] })
  study_team: Types.ObjectId[];

  @Prop({ default: '' })
  logo: string;

  @Prop({ default: '' })
  icon: string;

  @Prop({ type: String, unique: true, sparse: true, match: /^\d{6}$/ })
  referal_code: string;

  @Prop({ type: String, default: null })
  trial_status: string;

  @Prop({ type: String, default: null })
  recruitment_status: string;

  @Prop({ type: Boolean, default: false })
  invite_only: boolean;

  @Prop({
    type: [{ question: String, answer: String }],
    default: [],
  })
  faqs: { question: string; answer: string }[];
}

export const TrialsSchema = SchemaFactory.createForClass(Trials);
