import {
  About,
  Commitment,
  Contact,
  Ethical,
  Location,
  Overview,
  Participant,
  Result,
  StudyDesign,
  StudyProcedure,
  StudyTeamMember,
} from '@/api/trials/interfaces';
import { AuditResDto } from '@/common/dto/response/audit.dto';
import {
  BooleanField,
  ClassField,
  StringField,
} from '@/decorators/field.decorators';
import { Expose, Type } from 'class-transformer';

export class TrialsResDto extends AuditResDto {
  @ClassField(() => Overview)
  @Type(() => Overview)
  @Expose()
  overview: Overview;
  @ClassField(() => StudyDesign)
  @Type(() => StudyDesign)
  @Expose()
  study_design: StudyDesign;
  @ClassField(() => Participant)
  @Type(() => Participant)
  @Expose()
  participant: Participant;
  @ClassField(() => Location)
  @Type(() => Location)
  @Expose()
  location: Location;
  @ClassField(() => Commitment)
  @Type(() => Commitment)
  @Expose()
  commitment: Commitment;
  @ClassField(() => Contact, { isArray: true })
  @Type(() => Contact)
  @Expose()
  contact: Contact[];

  @ClassField(() => StudyTeamMember, { isArray: true })
  @Type(() => StudyTeamMember)
  @Expose()
  study_team: StudyTeamMember[];

  @StringField({ isArray: true })
  @Expose()
  benefits: string[];
  @StringField({ isArray: true }) @Expose() risks: string[];
  @StringField({ isArray: true }) @Expose() compensations: string[];

  @ClassField(() => StudyProcedure, { isArray: true })
  @Type(() => StudyProcedure)
  @Expose()
  study_procedures: StudyProcedure[];

  @ClassField(() => About, { isArray: true })
  @Type(() => About)
  @Expose()
  about: About[];

  @ClassField(() => Ethical)
  @Type(() => Ethical)
  @Expose()
  ethical: Ethical;
  @ClassField(() => Result)
  @Type(() => Result)
  @Expose()
  result: Result;

  @StringField({ nullable: true }) @Expose() logo: string;
  @StringField({ nullable: true }) @Expose() icon: string;
  @StringField({ nullable: true }) @Expose() video_url: string;
  @StringField({ nullable: true }) @Expose() referal_code: string;
  @StringField({ nullable: true }) @Expose() recruitment_status: string;
  @StringField({ nullable: true }) @Expose() trial_status: string;
  @BooleanField({ default: false }) @Expose() invite_only: boolean;
}
