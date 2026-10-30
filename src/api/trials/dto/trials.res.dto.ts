import {
  About,
  Commitment,
  Contact,
  Ethical,
  Location,
  NoticeBoardItem,
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
import { Expose, Transform, Type } from 'class-transformer';

export class FaqItem {
  @StringField({
    description: 'FAQ question',
    example: 'What is an ACL injury?',
    nullable: true,
  })
  @Expose()
  question: string;

  @StringField({
    description: 'FAQ answer',
    example:
      'Anterior cruciate ligament - ACL is 1 of 4 main ligaments of the knee and connects the tibia (shin bone) and the femur (thigh bone).',
    nullable: true,
  })
  @Expose()
  answer: string;
}

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
  @Transform(({ obj, value }) => (obj.__study_access === true ? value : []), {
    toClassOnly: true,
  })
  study_team: StudyTeamMember[];

  @StringField({ isArray: true })
  @Expose()
  benefits: string[];
  @StringField({ isArray: true }) @Expose() risks: string[];
  @StringField({ isArray: true }) @Expose() compensations: string[];

  @ClassField(() => StudyProcedure, { isArray: true })
  @Type(() => StudyProcedure)
  @Expose()
  @Transform(({ obj, value }) => (obj.__study_access === true ? value : []), {
    toClassOnly: true,
  })
  study_procedures: StudyProcedure[];

  @ClassField(() => About, { isArray: true })
  @Type(() => About)
  @Expose()
  @Transform(({ obj, value }) => (obj.__study_access === true ? value : []), {
    toClassOnly: true,
  })
  about: About[];

  @ClassField(() => NoticeBoardItem, { isArray: true })
  @Type(() => NoticeBoardItem)
  @Expose()
  @Transform(({ obj, value }) => (obj.__study_access === true ? value : []), {
    toClassOnly: true,
  })
  notice_board: NoticeBoardItem[];

  @ClassField(() => FaqItem, { isArray: true })
  @Type(() => FaqItem)
  @Expose()
  @Transform(({ obj, value }) => (obj.__study_access === true ? value : []), {
    toClassOnly: true,
  })
  faqs: FaqItem[];

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
  // Referral codes are resolved server-side, never exposed in the public catalogue.
  @StringField({ nullable: true }) @Expose() recruitment_status: string;
  @StringField({ nullable: true }) @Expose() trial_status: string;
  @BooleanField({ default: false }) @Expose() invite_only: boolean;
}
