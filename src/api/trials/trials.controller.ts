import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { ParseObjectIdPipe } from '@/common/pipes/objectid.pipe';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { QueryTrialsRecord } from './dto/query-active-trials-record.dto';
import { UpdateReferralCodeDto } from './dto/referral-code.dto';
import { TrialsRecordResDto } from './dto/trials-record.res.dto';
import { TrialsResDto } from './dto/trials.res.dto';
import { UpdateTrialRecord } from './dto/update-trial-record.dto';
import { TrialsService } from './trials.service';

@ApiTags('Trials')
@Controller('trials')
export class TrialsController {
  constructor(private readonly trialsService: TrialsService) {}

  @Get('active')
  @ApiAuth({
    description: 'Get all active trials',
    summary: 'Get Active Trials',
    isPaginated: true,
    type: TrialsResDto,
  })
  async getAllActiveTrials(
    @Query() query: QueryTrialsRecord,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.trialsService.findAllMyActiveTrials(query, userId);
  }

  @Get(':trialRecordId/detail')
  @ApiAuth({
    description: 'Get trial record detail by ID',
    summary: 'Get Trial Record Detail',
    type: TrialsRecordResDto,
  })
  async getTrialRecordDetail(
    @Param('trialRecordId', ParseObjectIdPipe) trialRecordId: string,
  ) {
    return this.trialsService.findTrialRecordById(
      trialRecordId as unknown as Types.ObjectId,
    );
  }

  @Patch(':trialRecordId/record')
  @ApiAuth({
    description: 'Update trials record by ID',
    summary: 'Update Trials Record',
    type: TrialsRecordResDto,
  })
  async updateTrialsRecord(
    @Param('trialRecordId', ParseObjectIdPipe) trialRecordId: string,
    @Body() updateDto: UpdateTrialRecord,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.trialsService.updateTrialsRecord(
      trialRecordId as unknown as Types.ObjectId,
      updateDto,
      userId,
    );
  }

  @Patch(':trialRecordId/withdraw')
  @ApiAuth({
    description: 'Withdraw from trial by ID',
    summary: 'Withdraw from Trial',
    type: TrialsRecordResDto,
  })
  async withdrawFromTrial(
    @Param('trialRecordId', ParseObjectIdPipe) trialRecordId: string,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.trialsService.withdrawFromTrial(
      trialRecordId as unknown as Types.ObjectId,
      userId,
    );
  }

  // @Delete(':trialRecordId/record')
  // @ApiAuth({
  //   description: 'Update trials record by ID',
  //   summary: 'Update Trials Record',
  //   type: TrialsRecordResDto,
  // })
  // async deleteTrialsRecord(
  //   @Param('trialRecordId', ParseObjectIdPipe) trialRecordId: string,
  //   @Body() updateDto: UpdateTrialRecord,
  //   @CurrentUser('id') userId: Types.ObjectId,
  // ) {
  //   return this.trialsService.deleteTrialsRecord(
  //     trialRecordId as unknown as Types.ObjectId,
  //     updateDto,
  //     userId,
  //   );
  // }

  @Get('')
  @ApiAuth({
    description: 'Get all trials',
    summary: 'Get Trials',
    isPaginated: true,
    type: TrialsResDto,
  })
  async getAllTrials(@Query() query: PageOptionsDto) {
    return this.trialsService.findAll(query);
  }

  @Get(':id')
  @ApiAuth({
    description: 'Get trial by ID',
    summary: 'Get Trial',
    type: TrialsResDto,
  })
  async getTrialById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.trialsService.findById(id as unknown as Types.ObjectId);
  }

  @Get(':id/referral-code')
  @ApiAuth({
    description: 'Get trial referral code by ID',
    summary: 'Get Trial Referral Code',
    type: String,
  })
  async getTrialReferralCodeById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.trialsService.getTrialReferralCodeById(
      id as unknown as Types.ObjectId,
    );
  }

  @Post(':id/generate-referral-code')
  @ApiAuth({
    description: 'Generate trial referral code by ID',
    summary: 'Generate Trial Referral Code',
    type: String,
  })
  async generateTrialReferralCodeById(
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.trialsService.generateTrialReferralCodeById(
      id as unknown as Types.ObjectId,
    );
  }

  @Patch(':id/referral-code')
  @ApiAuth({
    description: 'Update trial referral code by ID',
    summary: 'Update Trial Referral Code',
    type: String,
  })
  async updateTrialReferralCodeById(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateDto: UpdateReferralCodeDto,
  ) {
    return this.trialsService.updateTrialReferralCodeById(
      id as unknown as Types.ObjectId,
      updateDto,
    );
  }

  @Post('redeem-referral')
  @ApiAuth({
    description: 'Redeem trial referral code',
    summary: 'Redeem Trial Referral Code',
    type: TrialsRecordResDto,
  })
  async redeemTrialReferralCode(
    @Body() updateDto: UpdateReferralCodeDto,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.trialsService.redeemTrialReferralCode(updateDto, userId);
  }

  @Delete(':id/referral-code')
  @ApiAuth({
    description: 'Delete trial referral code by ID',
    summary: 'Delete Trial Referral Code',
  })
  async deleteTrialReferralCodeById(
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.trialsService.deleteTrialReferralCodeById(
      id as unknown as Types.ObjectId,
    );
  }

  @Post(':id/signup')
  @ApiAuth({
    description: 'Sign up trial by ID',
    summary: 'Sign up Trial',
    type: TrialsRecordResDto,
  })
  async signUpTrial(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.trialsService.signUpTrials(
      id as unknown as Types.ObjectId,
      userId,
    );
  }

  @Patch(':id/approve')
  @ApiAuth({
    description: 'Approve trial by ID',
    summary: 'Approve Trial',
    type: TrialsRecordResDto,
  })
  async approveTrial(@Param('id', ParseObjectIdPipe) id: string) {
    return this.trialsService.approveTrial(id as unknown as Types.ObjectId);
  }

  @Patch(':id/decline')
  @ApiAuth({
    description: 'Decline trial by ID',
    summary: 'Decline Trial',
    type: TrialsRecordResDto,
  })
  async declineTrial(@Param('id', ParseObjectIdPipe) id: string) {
    return this.trialsService.declineTrial(id as unknown as Types.ObjectId);
  }

  // save trial
  @Patch(':id/saved')
  @ApiAuth({
    description: 'Save trial by ID',
    summary: 'Save Trial',
    type: TrialsResDto,
  })
  async saveTrial(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.trialsService.saveTrial(
      id as unknown as Types.ObjectId,
      userId,
    );
  }

  @Patch(':id/unsaved')
  @ApiAuth({
    description: 'Unsave trial by ID',
    summary: 'Unsave Trial',
    type: TrialsResDto,
  })
  async unsaveTrial(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.trialsService.unSaveTrial(
      id as unknown as Types.ObjectId,
      userId,
    );
  }

  @Get('user/saved')
  @ApiAuth({
    description: 'Get all saved trials for the current user',
    summary: 'Get User Saved Trials',
    isPaginated: true,
    type: TrialsResDto,
  })
  async getUserSavedTrials(
    @Query() query: PageOptionsDto,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.trialsService.getUserSavedTrials(query, userId);
  }
}
