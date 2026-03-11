import { TrialsRecordResDto } from '@/api/trials/dto/trials-record.res.dto';
import { AuditResDto } from '@/common/dto/response/audit.dto';
import { UserRole } from '@/database/enums/user.enum';
import {
  ClassField,
  EnumField,
  StringField,
} from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';
import { Document } from '../interfaces/document.interface';
import { Information } from '../interfaces/information.interface';
import { Notifications } from '../interfaces/notifications.interface';

export class BaseUserResDto extends AuditResDto {
  @StringField({ example: 'user@example.com' })
  @Expose()
  email: string;

  @ClassField(() => Information)
  @Expose()
  information: Information;

  @ClassField(() => Notifications)
  @Expose()
  notifications: Notifications;

  @StringField({
    example: 'https://example.com/profile.jpg',
    description: 'URL of the profile image',
  })
  @Expose()
  profile_image_file: string;

  @StringField({ example: '+1234567890', description: 'Phone number' })
  @Expose()
  phone_number_verified: boolean;

  @ClassField(() => TrialsRecordResDto, { isArray: true })
  @Expose()
  trial_records: TrialsRecordResDto[];

  @StringField({
    example: '["trial1", "trial2"]',
    description: 'List of saved trial IDs',
  })
  @Expose()
  saved_trials: string[];

  @ClassField(() => Document, {
    description: 'User identification document details',
  })
  @Expose()
  document: Document;

  @EnumField(() => UserRole, { description: 'Role of the user' })
  @Expose()
  role: UserRole;

  @StringField({
    example: 'stream-token-xyz',
    description: 'Stream chat authentication token',
  })
  @Expose()
  streamToken: string;
}
