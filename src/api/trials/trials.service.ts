import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ResponseNoDataDto } from '@/common/dto/response/response-no-data.dto';
import { ResponseDto } from '@/common/dto/response/response.dto';
import { ErrorCode } from '@/constants/error-code.constant';
import { TrialStatus } from '@/database/enums/trials.enum';
import { ValidationException } from '@/exceptions/validation.exception';
import { paginateWithModel } from '@/utils/offset-pagination';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import * as crypto from 'crypto';
import { merge } from 'lodash';
import { FilterQuery, Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { QueryTrialsRecord } from './dto/query-active-trials-record.dto';
import { UpdateReferralCodeDto } from './dto/referral-code.dto';
import { TrialsRecordResDto } from './dto/trials-record.res.dto';
import { TrialsResDto } from './dto/trials.res.dto';
import { UpdateTrialRecord } from './dto/update-trial-record.dto';
import {
  TrialsRecord,
  TrialsRecordDocument,
} from './schemas/trials-record.schema';
import { Trials, TrialsDocument } from './schemas/trials.schema';

@Injectable()
export class TrialsService {
  constructor(
    @InjectModel(Trials.name) private trialModel: Model<TrialsDocument>,
    @InjectModel(TrialsRecord.name)
    private trialsRecordModel: Model<TrialsRecordDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async findTrialRecordById(
    id: Types.ObjectId,
  ): Promise<ResponseDto<TrialsRecordResDto>> {
    const trialRecord = await this.trialsRecordModel
      .findById(id)
      .populate('trial_id')
      .populate('appointments');
    if (!trialRecord) {
      return new ResponseDto<TrialsRecordResDto>({
        data: null,
        success: false,
        message: 'Trial record not found',
      });
    }

    const data = {
      ...trialRecord.toObject(),
      trial: trialRecord.trial_id,
      trial_id: trialRecord.trial_id?._id?.toString() ?? trialRecord.trial_id,
    };

    return new ResponseDto<TrialsRecordResDto>({
      data: plainToInstance(TrialsRecordResDto, data, {
        excludeExtraneousValues: true,
      }),
      message: 'Retrieved trial record successfully',
    });
  }

  async withdrawFromTrial(
    trialRecordId: Types.ObjectId,
    userId: Types.ObjectId,
  ) {
    const existingRecord = await this.trialsRecordModel.findOne({
      _id: trialRecordId,
      user_id: userId,
    });

    if (!existingRecord) {
      throw new BadRequestException('Trial record not found');
    }

    await this.trialsRecordModel.updateOne(
      { _id: trialRecordId, user_id: userId },
      { trial_status: TrialStatus.WITHDRAW },
    );

    return new ResponseNoDataDto({
      message: 'Withdrawn from trial successfully',
    });
  }

  async updateTrialsRecord(
    id: Types.ObjectId,
    updateDto: UpdateTrialRecord,
    _userId: Types.ObjectId,
  ): Promise<ResponseDto<TrialsRecordResDto>> {
    const existingRecord = await this.trialsRecordModel.findById(id);

    if (!existingRecord) {
      throw new BadRequestException('Trial record not found');
    }

    // Merge the existing record with the update DTO
    const updatedData = merge(existingRecord.toObject(), updateDto);

    const updatedRecord = await this.trialsRecordModel.findByIdAndUpdate(
      id,
      updatedData,
      { new: true },
    );

    return new ResponseDto<TrialsRecordResDto>({
      data: plainToInstance(TrialsRecordResDto, updatedRecord, {
        excludeExtraneousValues: true,
      }),
      message: 'Trial record updated successfully',
    });
  }

  async redeemTrialReferralCode(
    redeem: UpdateReferralCodeDto,
    userId: Types.ObjectId,
  ): Promise<ResponseNoDataDto> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      return new ResponseNoDataDto({
        success: false,
        message: 'User not found',
      });
    }

    const trial = await this.trialModel.findOne({
      referal_code: redeem.referralCode,
    });

    if (!trial) {
      return new ResponseNoDataDto({
        success: false,
        message: 'Invalid referral code',
      });
    }

    const existed = await this.trialsRecordModel.findOne({
      user_id: userId,
      trial_id: trial._id,
    });

    if (existed) {
      throw new BadRequestException('You have already redeemed this trial');
    }

    await this.trialsRecordModel.create({
      user_id: userId,
      trial_id: trial._id,
      is_approved: true,
      is_active: true,
      trial_status: TrialStatus.PENDING,
      sign_up_date: new Date(),
    });

    return new ResponseNoDataDto({
      message: 'Referral code redeemed successfully',
    });
  }

  async updateTrialReferralCodeById(
    id: Types.ObjectId,
    updateDto: UpdateReferralCodeDto,
  ): Promise<ResponseDto<string>> {
    const trial = await this.trialModel.findById(id);
    if (!trial) {
      return new ResponseDto<string>({
        data: null,
        success: false,
        message: 'Trial not found',
      });
    }

    trial.referal_code = updateDto.referralCode;
    await trial.save();

    return new ResponseDto<string>({
      data: trial.referal_code,
      message: 'Updated referral code successfully',
    });
  }

  async generateTrialReferralCodeById(
    id: Types.ObjectId,
  ): Promise<ResponseDto<string>> {
    const trial = await this.trialModel.findById(id);

    if (!trial) {
      return new ResponseDto<string>({
        data: null,
        success: false,
        message: 'Trial not found',
      });
    }

    const referralCode = this.generateReferralCode();
    trial.referal_code = referralCode;
    await trial.save();
    return new ResponseDto<string>({
      data: referralCode,
      message: 'Generated referral code successfully',
    });
  }

  async getTrialReferralCodeById(
    id: Types.ObjectId,
  ): Promise<ResponseDto<string>> {
    console.log('id', id);

    const trial = await this.trialModel.findById(id);

    console.log('trial', trial);

    if (!trial) {
      return new ResponseDto<string>({
        data: null,
        success: false,
        message: 'Trial not found',
      });
    }

    return new ResponseDto<string>({
      data: trial.referal_code || null,
      message: 'Retrieved referral code successfully',
    });
  }

  async deleteTrialReferralCodeById(
    id: Types.ObjectId,
  ): Promise<ResponseNoDataDto> {
    const trial = await this.trialModel.findById(id);

    if (!trial) {
      return new ResponseNoDataDto({
        success: false,
        message: 'Trial not found',
      });
    }

    trial.referal_code = null;
    await trial.save();
    return new ResponseNoDataDto({
      message: 'Deleted referral code successfully',
    });
  }

  async getUserSavedTrials(
    query: PageOptionsDto,
    userId: Types.ObjectId,
  ): Promise<OffsetPaginatedDto<TrialsResDto>> {
    const user = await this.userModel.findById(userId).populate('saved_trials');
    if (!user) {
      throw new ValidationException(ErrorCode.E003);
    }

    const savedTrialIds = user.saved_trials || [];

    const filter: FilterQuery<Trials> = {
      _id: { $in: savedTrialIds },
    };

    if (query.q) {
      filter.$or = [
        { 'overview.name': { $regex: query.q, $options: 'i' } },
        {
          'overview.description.elaborated': { $regex: query.q, $options: 'i' },
        },
      ];
    }

    const [trials, metaDto] = await paginateWithModel<TrialsDocument>(
      this.trialModel,
      filter,
      query,
      {
        skipCount: false,
        takeAll: false,
        populate: ['study_team'],
      },
    );

    return new OffsetPaginatedDto<TrialsResDto>({
      data: plainToInstance(TrialsResDto, trials, {
        excludeExtraneousValues: true,
      }),
      meta: metaDto,
      message: 'Retrieved saved trials successfully',
    });
  }

  async saveTrial(
    trialId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ResponseNoDataDto> {
    const validationResult = await this.validateTrialAndUser(trialId, userId);
    if (!validationResult.isValid) {
      return validationResult.response;
    }

    const { user } = validationResult;
    user.saved_trials = user.saved_trials || [];

    if (user.saved_trials.includes(trialId)) {
      return new ResponseNoDataDto({
        success: false,
        message: 'Trial already saved',
      });
    }

    user.saved_trials.push(trialId);
    await user.save();

    return new ResponseNoDataDto({
      message: 'Trial saved successfully',
    });
  }

  async unSaveTrial(
    trialId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ResponseNoDataDto> {
    const validationResult = await this.validateTrialAndUser(trialId, userId);
    if (!validationResult.isValid) {
      return validationResult.response;
    }

    const { user } = validationResult;
    user.saved_trials = user.saved_trials || [];

    if (!user.saved_trials.includes(trialId)) {
      return new ResponseNoDataDto({
        success: false,
        message: 'Trial not saved',
      });
    }

    user.saved_trials = user.saved_trials.filter(
      (id) => id.toString() !== trialId.toString(),
    );
    await user.save();

    return new ResponseNoDataDto({
      message: 'Trial removed successfully',
    });
  }

  async approveTrial(
    id: Types.ObjectId,
  ): Promise<ResponseDto<TrialsRecordResDto>> {
    const existingTrials = await this.trialsRecordModel.findById(id);
    if (!existingTrials) {
      return new ResponseDto<TrialsRecordResDto>({
        data: null,
        success: false,
        message: 'Signup trial not found',
      });
    }

    const trial = await this.trialsRecordModel.findByIdAndUpdate(
      id,
      {
        is_approved: true,
        approval_date: new Date(),
        is_active: true,
      },
      { new: true },
    );

    if (trial) {
      const updatedTrialRecord = trial.toObject();

      await this.userModel.updateOne(
        { _id: trial.user_id, 'trial_records._id': trial._id },
        { $set: { 'trial_records.$': updatedTrialRecord } },
      );
    }

    return new ResponseDto<TrialsRecordResDto>({
      data: plainToInstance(TrialsRecordResDto, trial, {
        excludeExtraneousValues: true,
      }),
      message: 'Trial approved successfully',
    });
  }

  async declineTrial(
    id: Types.ObjectId,
  ): Promise<ResponseDto<TrialsRecordResDto>> {
    const existingTrials = await this.trialsRecordModel.findById(id);
    if (!existingTrials) {
      return new ResponseDto<TrialsRecordResDto>({
        data: null,
        success: false,
        message: 'Signup trial not found',
      });
    }

    const trial = await this.trialsRecordModel.findByIdAndUpdate(
      id,
      {
        is_approved: false,
        is_active: false,
      },
      { new: true },
    );

    if (trial) {
      const updatedTrialRecord = trial.toObject();

      await this.userModel.updateOne(
        { _id: trial.user_id, 'trial_records._id': trial._id },
        { $set: { 'trial_records.$': updatedTrialRecord } },
      );
    }

    return new ResponseDto<TrialsRecordResDto>({
      data: plainToInstance(TrialsRecordResDto, trial, {
        excludeExtraneousValues: true,
      }),
      message: 'Signup trial declined successfully',
    });
  }

  async signUpTrials(
    trialId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<ResponseDto<TrialsRecordResDto>> {
    const existingRecord = await this.trialsRecordModel.findOne({
      trial_id: trialId,
      user_id: userId,
    });

    if (existingRecord) {
      return new ResponseDto<TrialsRecordResDto>({
        data: null,
        success: false,
        message: 'User already signed up for this trial',
      });
    }

    const trials = await this.trialModel.findById(trialId);
    if (!trials) {
      return new ResponseDto<TrialsRecordResDto>({
        data: null,
        success: false,
        message: 'Trial not found',
      });
    }

    const trialRecord = await this.trialsRecordModel.create({
      trial_id: trialId,
      user_id: userId,
    });

    const trialRecordObj = trialRecord.toObject();

    await this.userModel.findByIdAndUpdate(userId, {
      $push: { trial_records: trialRecordObj },
    });

    return new ResponseDto<TrialsRecordResDto>({
      data: plainToInstance(TrialsRecordResDto, trialRecord, {
        excludeExtraneousValues: true,
      }),
      message: 'Signed up for trial successfully',
    });
  }

  async findById(id: Types.ObjectId): Promise<ResponseDto<TrialsResDto>> {
    const trial = await this.trialModel.findById(id).populate('study_team');

    if (!trial) {
      return new ResponseDto<TrialsResDto>({
        data: null,
        success: false,
        message: 'Trial not found',
      });
    }

    return new ResponseDto<TrialsResDto>({
      data: plainToInstance(TrialsResDto, trial, {
        excludeExtraneousValues: true,
      }),
      message: 'Retrieved trial successfully',
    });
  }

  async findAll(
    query: PageOptionsDto,
  ): Promise<OffsetPaginatedDto<TrialsResDto>> {
    const filter: FilterQuery<Trials> = {};

    if (query.q) {
      filter.$or = [
        { 'overview.name': { $regex: query.q, $options: 'i' } },
        {
          'overview.description.elaborated': { $regex: query.q, $options: 'i' },
        },
      ];
    }

    const [trials, metaDto] = await paginateWithModel<TrialsDocument>(
      this.trialModel,
      filter,
      query,
      {
        skipCount: false,
        takeAll: false,
        populate: ['study_team'],
      },
    );

    console.log('trials', trials);

    return new OffsetPaginatedDto<TrialsResDto>({
      data: plainToInstance(TrialsResDto, trials, {
        excludeExtraneousValues: true,
      }),
      meta: metaDto,
      message: 'Retrieved trials successfully',
    });
  }

  async findAllMyActiveTrials(
    query: QueryTrialsRecord,
    userId: Types.ObjectId,
  ): Promise<OffsetPaginatedDto<TrialsRecordResDto>> {
    const filter: FilterQuery<TrialsRecord> = {
      user_id: userId,
      is_active: true,
      is_approved: true,
    };

    if (query.q) {
      filter.$or = [
        { 'trial_id.overview.name': { $regex: query.q, $options: 'i' } },
        {
          'trial_id.overview.description.elaborated': {
            $regex: query.q,
            $options: 'i',
          },
        },
      ];
    }

    if (query.status) {
      filter.trial_status = query.status;
    }

    const [records, metaDto] = await paginateWithModel<TrialsRecordDocument>(
      this.trialsRecordModel,
      filter,
      query,
      {
        skipCount: false,
        takeAll: false,
        populate: ['trial_id', 'appointments'],
      },
    );

    return new OffsetPaginatedDto<TrialsRecordResDto>({
      data: plainToInstance(TrialsRecordResDto, records, {
        excludeExtraneousValues: true,
      }),
      meta: metaDto,
      message: 'Retrieved active trials successfully',
    });
  }

  private async validateTrialAndUser(
    trialId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<{
    isValid: boolean;
    response?: ResponseNoDataDto;
    user?: UserDocument;
  }> {
    const trial = await this.trialModel.findById(trialId);
    if (!trial) {
      return {
        isValid: false,
        response: new ResponseNoDataDto({
          success: false,
          message: 'Trial not found',
        }),
      };
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      return {
        isValid: false,
        response: new ResponseNoDataDto({
          success: false,
          message: 'User not found',
        }),
      };
    }

    return { isValid: true, user };
  }

  private generateReferralCode(): string {
    const buf = crypto.randomBytes(4);
    const num = buf.readUInt32BE() % 1000000;
    return num.toString().padStart(6, '0');
  }
}
