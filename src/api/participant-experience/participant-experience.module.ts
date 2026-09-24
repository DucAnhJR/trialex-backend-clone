import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { QueueName } from '@/constants/job.constant';
import { NotificationsModule } from '@/api/notification/notifications.module';
import { User, UserSchema } from '@/api/users/schemas/user.schema';
import { Trials, TrialsSchema } from '@/api/trials/schemas/trials.schema';
import { TrialsRecord, TrialsRecordSchema } from '@/api/trials/schemas/trials-record.schema';
import { ParticipantExperienceController } from './participant-experience.controller';
import { ParticipantExperienceService } from './participant-experience.service';
import { QuestionnaireInstance, QuestionnaireInstanceSchema } from './schemas/questionnaire-instance.schema';
import { TrialParticipantConfiguration, TrialParticipantConfigurationSchema } from './schemas/trial-participant-configuration.schema';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({ name: QueueName.NOTIFICATION }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Trials.name, schema: TrialsSchema },
      { name: TrialsRecord.name, schema: TrialsRecordSchema },
      { name: TrialParticipantConfiguration.name, schema: TrialParticipantConfigurationSchema },
      { name: QuestionnaireInstance.name, schema: QuestionnaireInstanceSchema },
    ]),
  ],
  controllers: [ParticipantExperienceController],
  providers: [ParticipantExperienceService],
  exports: [ParticipantExperienceService],
})
export class ParticipantExperienceModule {}
