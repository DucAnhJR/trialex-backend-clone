import { StudyTeamMembersResDto } from '@/api/study-team-members/dto/study-team-members.res.dto';
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
import { AuditResDto } from '@/common/dto/response/audit.dto';
import { ClassField, StringField } from '@/decorators/field.decorators';
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
  @ClassField(() => Contact)
  @Type(() => Contact)
  @Expose()
  contact: Contact;

  @ClassField(() => StudyTeamMembersResDto, { isArray: true })
  @Expose()
  study_team: StudyTeamMembersResDto[];

  @StringField({ isArray: true })
  @Expose()
  benefits: string[];
  @StringField({ isArray: true }) @Expose() risks: string[];
  @StringField({ isArray: true }) @Expose() compensations: string[];

  @ClassField(() => Ethical)
  @Type(() => Ethical)
  @Expose()
  ethical: Ethical;
  @ClassField(() => Result)
  @Type(() => Result)
  @Expose()
  result: Result;

  @StringField({ nullable: true }) @Expose() logo: string;
  @StringField({ nullable: true }) @Expose() referal_code: string;
}
