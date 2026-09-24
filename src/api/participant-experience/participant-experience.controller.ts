import { ParseObjectIdPipe } from '@/common/pipes/objectid.pipe';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateParticipantConfigurationDto } from './dto/create-participant-configuration.dto';
import {
  CompleteQuestionnaireDto,
  DeclineTrialOnboardingDto,
  SubmitNativeQuestionnaireDto,
  SubmitTrialOnboardingDto,
  UpdateCompletionPromptDto,
} from './dto/submit-trial-onboarding.dto';
import { ParticipantExperienceService } from './participant-experience.service';

@Controller('trials')
export class ParticipantExperienceController {
  constructor(private readonly service: ParticipantExperienceService) {}

  @Get(':trialId/participant-configuration')
  @ApiAuth({ summary: 'Get published participant configuration' })
  getConfiguration(@Param('trialId', ParseObjectIdPipe) trialId: string) {
    return this.service.getPublishedConfiguration(
      trialId as unknown as Types.ObjectId,
    );
  }

  @Post(':trialId/participant-configurations')
  @ApiAuth({ summary: 'Create trial participant configuration draft' })
  createDraft(
    @Param('trialId', ParseObjectIdPipe) trialId: string,
    @CurrentUser('id') actorId: Types.ObjectId,
    @Body() body: CreateParticipantConfigurationDto,
  ) {
    return this.service.createDraftConfiguration(
      trialId as unknown as Types.ObjectId,
      actorId,
      body,
    );
  }

  @Patch('participant-configurations/:configurationId/publish')
  @ApiAuth({ summary: 'Publish trial participant configuration' })
  publish(
    @Param('configurationId', ParseObjectIdPipe) id: string,
    @CurrentUser('id') actorId: Types.ObjectId,
  ) {
    return this.service.publishConfiguration(
      id as unknown as Types.ObjectId,
      actorId,
    );
  }

  @Post(':trialId/onboarding')
  @ApiAuth({ summary: 'Submit trial onboarding' })
  submit(
    @Param('trialId', ParseObjectIdPipe) trialId: string,
    @CurrentUser('id') userId: Types.ObjectId,
    @Body() dto: SubmitTrialOnboardingDto,
  ) {
    return this.service.submitOnboarding(
      trialId as unknown as Types.ObjectId,
      userId,
      dto,
    );
  }

  @Patch('enrolments/:trialRecordId/approve')
  @ApiAuth({ summary: 'Approve trial enrolment' })
  approve(
    @Param('trialRecordId', ParseObjectIdPipe) id: string,
    @CurrentUser('id') actorId: Types.ObjectId,
  ) {
    return this.service.approve(id as unknown as Types.ObjectId, actorId);
  }

  @Patch('enrolments/:trialRecordId/decline')
  @ApiAuth({ summary: 'Decline trial enrolment' })
  decline(
    @Param('trialRecordId', ParseObjectIdPipe) id: string,
    @CurrentUser('id') actorId: Types.ObjectId,
    @Body() dto: DeclineTrialOnboardingDto,
  ) {
    return this.service.decline(id as unknown as Types.ObjectId, actorId, dto);
  }

  @Get('enrolments/:trialRecordId/calendar')
  @ApiAuth({ summary: 'Get participant questionnaire calendar' })
  calendar(
    @Param('trialRecordId', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.service.calendar(id as unknown as Types.ObjectId, userId);
  }

  @Get('enrolments/calendar')
  @ApiAuth({ summary: 'Get all questionnaire dates for the current user' })
  myCalendar(@CurrentUser('id') userId: Types.ObjectId) {
    return this.service.calendarForUser(userId);
  }

  @Post('questionnaires/:instanceId/completion')
  @ApiAuth({ summary: 'Record questionnaire completion prompt response' })
  complete(
    @Param('instanceId', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: Types.ObjectId,
    @Body() dto: CompleteQuestionnaireDto,
  ) {
    return this.service.complete(id as unknown as Types.ObjectId, userId, dto);
  }

  @Patch('questionnaires/:instanceId/completion-prompt')
  @ApiAuth({ summary: 'Record questionnaire completion prompt state' })
  updateCompletionPrompt(
    @Param('instanceId', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: Types.ObjectId,
    @Body() dto: UpdateCompletionPromptDto,
  ) {
    return this.service.updateCompletionPrompt(
      id as unknown as Types.ObjectId,
      userId,
      dto,
    );
  }

  @Get('questionnaires/:instanceId')
  @ApiAuth({ summary: 'Get an owned questionnaire' })
  getQuestionnaire(
    @Param('instanceId', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.service.getQuestionnaire(
      id as unknown as Types.ObjectId,
      userId,
    );
  }

  @Post('questionnaires/:instanceId/submit')
  @ApiAuth({ summary: 'Submit an in-app questionnaire' })
  submitQuestionnaire(
    @Param('instanceId', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: Types.ObjectId,
    @Body() dto: SubmitNativeQuestionnaireDto,
  ) {
    return this.service.submitNativeQuestionnaire(
      id as unknown as Types.ObjectId,
      userId,
      dto,
    );
  }
}
