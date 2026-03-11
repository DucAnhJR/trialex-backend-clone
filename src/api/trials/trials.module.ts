import {
  StudyTeamMembers,
  StudyTeamMembersSchema,
} from '@/api/study-team-members/schemas/study-team-members.schema';
import { User, UserSchema } from '@/api/users/schemas/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TrialsRecord,
  TrialsRecordSchema,
} from './schemas/trials-record.schema';
import { Trials, TrialsSchema } from './schemas/trials.schema';
import { TrialsController } from './trials.controller';
import { TrialsService } from './trials.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Trials.name,
        schema: TrialsSchema,
      },
      {
        name: TrialsRecord.name,
        schema: TrialsRecordSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: StudyTeamMembers.name,
        schema: StudyTeamMembersSchema,
      },
    ]),
  ],
  controllers: [TrialsController],
  providers: [TrialsService],
  exports: [TrialsService],
})
export class TrialsModule {}
