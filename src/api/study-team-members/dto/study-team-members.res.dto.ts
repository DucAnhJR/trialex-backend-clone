import { AuditResDto } from '@/common/dto/response/audit.dto';
import { EmailField, StringField } from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';
import { IsPhoneNumber } from 'class-validator';

export class StudyTeamMembersResDto extends AuditResDto {
  @StringField({
    description: 'Name of the study team member',
    example: 'Dr. Jane Smith',
    maxLength: 100,
  })
  @Expose()
  name: string;

  @StringField({
    description: 'Position of the study team member',
    example: 'Principal Investigator',
    maxLength: 100,
  })
  @Expose()
  position: string;

  @StringField({
    description: 'Biography of the study team member',
    example:
      'Dr. Jane Smith has over 20 years of experience in clinical research...',
    maxLength: 1000,
    nullable: true,
  })
  @Expose()
  biography: string;

  @EmailField({
    description: 'Email of the study team member',
    example: 'jane.smith@example.com',
    maxLength: 100,
  })
  @Expose()
  email: string;

  @StringField({
    description: 'Phone number of the study team member',
    example: '+1234567890',
    maxLength: 15,
    nullable: true,
  })
  @IsPhoneNumber()
  @Expose()
  phone: string;

  @StringField({
    description: 'University of the study team member',
    example: 'Harvard University',
    maxLength: 100,
    nullable: true,
  })
  @Expose()
  university: string;

  @StringField({
    description: 'Profile image URL of the study team member',
    example: '/images/study-team/jane-smith.png',
    nullable: true,
  })
  @Expose()
  profileImage: string;
}
