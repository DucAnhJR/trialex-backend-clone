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
import {
  TrialPreference,
  TrialPreferenceDocument,
} from '../users/schemas/trial-preference.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { MarkMilestoneCompletedDto } from './dto/mark-milestone-completed.dto';
import {
  LikeNoticeBoardDto,
  NoticeBoardActionDto,
} from './dto/notice-board-action.dto';
import { QueryTrialsRecord } from './dto/query-active-trials-record.dto';
import { UpdateReferralCodeDto } from './dto/referral-code.dto';
import { TrialsRecordResDto } from './dto/trials-record.res.dto';
import { TrialsResDto } from './dto/trials.res.dto';
import { UpdateTrialRecord } from './dto/update-trial-record.dto';
import { NoticeBoardItem } from './interfaces';
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
    @InjectModel(TrialPreference.name)
    private trialPreferenceModel: Model<TrialPreferenceDocument>,
  ) {}

  async getUserRecommendedTrials(
    userId: Types.ObjectId,
  ): Promise<ResponseDto<TrialsResDto[]>> {
    const user = await this.userModel.findById(userId).lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const preferenceIds = (user.trial_preferences || []).map((item) =>
      item.toString(),
    );

    if (preferenceIds.length === 0) {
      return new ResponseDto<TrialsResDto[]>({
        data: [],
        message: 'Retrieved recommended trials successfully',
      });
    }

    const preferences = await this.trialPreferenceModel
      .find({
        _id: { $in: preferenceIds.map((id) => new Types.ObjectId(id)) },
      })
      .lean();

    const names = preferences
      .map((item) => item.trial_preferences_name?.trim())
      .filter(Boolean);

    if (names.length === 0) {
      return new ResponseDto<TrialsResDto[]>({
        data: [],
        message: 'Retrieved recommended trials successfully',
      });
    }

    const fields = [
      'overview.medical_condition',
      'overview.theme',
      'overview.name',
      'overview.full_name',
      'overview.keywords',
      'overview.description.short',
      'overview.description.elaborated',
    ];

    const orClauses = names.flatMap((name) => {
      const regex = new RegExp(this.escapeRegex(name), 'i');
      return fields.map((field) => ({ [field]: regex }));
    });

    const filter: FilterQuery<Trials> = { $or: orClauses };

    const trials = await this.trialModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return new ResponseDto<TrialsResDto[]>({
      data: plainToInstance(TrialsResDto, trials, {
        excludeExtraneousValues: true,
      }),
      message: 'Retrieved recommended trials successfully',
    });
  }

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

    return new ResponseDto<TrialsRecordResDto>({
      data: plainToInstance(
        TrialsRecordResDto,
        this.toTrialRecordResponse(trialRecord),
        {
          excludeExtraneousValues: true,
        },
      ),
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
      trial_status: TrialStatus.IN_PROGRESS,
      sign_up_date: new Date(),
      total_milestones: this.getTotalMilestones(trial),
      total_milestones_completed: 0,
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
        trial_status: TrialStatus.IN_PROGRESS,
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
      total_milestones: this.getTotalMilestones(trials),
      total_milestones_completed: 0,
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
    const trial = await this.trialModel.findById(id);

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

  async likeNoticeBoard(
    userId: Types.ObjectId,
    dto: LikeNoticeBoardDto,
  ): Promise<ResponseDto<NoticeBoardItem>> {
    const trialId = new Types.ObjectId(dto.trialId);
    const noticeBoardId = new Types.ObjectId(dto.noticeBoardId);
    const userIdString = userId.toString();

    await this.validateNoticeBoardItem(trialId, noticeBoardId);

    if (dto.like) {
      await this.trialModel.updateOne(
        { _id: trialId },
        {
          $addToSet: {
            'notice_board.$[notice].likes': { userId: userIdString },
          },
          $inc: { 'notice_board.$[notice].like_count': 1 },
        },
        {
          arrayFilters: [
            {
              'notice._id': noticeBoardId,
              'notice.likes.userId': { $ne: userIdString },
            },
          ],
        },
      );
    } else {
      await this.trialModel.updateOne(
        { _id: trialId },
        {
          $pull: {
            'notice_board.$[notice].likes': { userId: userIdString },
          },
          $inc: { 'notice_board.$[notice].like_count': -1 },
        },
        {
          arrayFilters: [
            {
              'notice._id': noticeBoardId,
              'notice.likes.userId': userIdString,
            },
          ],
        },
      );
    }

    const noticeBoardItem = await this.getNoticeBoardItem(
      trialId,
      noticeBoardId,
    );

    return new ResponseDto<NoticeBoardItem>({
      data: plainToInstance(NoticeBoardItem, noticeBoardItem, {
        excludeExtraneousValues: true,
      }),
      message: dto.like ? 'Notice board liked' : 'Notice board unliked',
    });
  }

  async markReadNoticeBoard(
    userId: Types.ObjectId,
    dto: NoticeBoardActionDto,
  ): Promise<ResponseDto<NoticeBoardItem>> {
    const trialId = new Types.ObjectId(dto.trialId);
    const noticeBoardId = new Types.ObjectId(dto.noticeBoardId);
    const userIdString = userId.toString();

    await this.validateNoticeBoardItem(trialId, noticeBoardId);

    await this.trialModel.updateOne(
      { _id: trialId },
      {
        $addToSet: {
          'notice_board.$[notice].mark_reads': { userId: userIdString },
        },
      },
      {
        arrayFilters: [
          {
            'notice._id': noticeBoardId,
            'notice.mark_reads.userId': { $ne: userIdString },
          },
        ],
      },
    );

    const noticeBoardItem = await this.getNoticeBoardItem(
      trialId,
      noticeBoardId,
    );

    return new ResponseDto<NoticeBoardItem>({
      data: plainToInstance(NoticeBoardItem, noticeBoardItem, {
        excludeExtraneousValues: true,
      }),
      message: 'Notice board marked as read',
    });
  }

  async markMilestoneCompleted(
    dto: MarkMilestoneCompletedDto,
  ): Promise<ResponseDto<TrialsRecordResDto>> {
    const milestoneId = new Types.ObjectId(dto.milestone_id);
    const trialRecordId = new Types.ObjectId(dto.trial_record_id);

    const trialRecord = await this.trialsRecordModel.findById(trialRecordId);

    if (!trialRecord) {
      throw new BadRequestException('Trial record not found');
    }

    if (trialRecord.trial_status !== TrialStatus.IN_PROGRESS) {
      throw new BadRequestException('Trial record is not in progress');
    }

    const trial = await this.trialModel.findOne({
      'overview.milestones._id': milestoneId,
    });

    if (!trial) {
      throw new BadRequestException('Milestone not found');
    }

    if (trialRecord.trial_id.toString() !== trial._id.toString()) {
      throw new BadRequestException(
        'Milestone does not belong to the trial record trial',
      );
    }

    let updatedRecord = await this.trialsRecordModel.findByIdAndUpdate(
      trialRecordId,
      {
        $set: {
          total_milestones: this.getTotalMilestones(trial),
        },
        $addToSet: {
          milestones: milestoneId,
        },
      },
      { new: true },
    );

    if (updatedRecord) {
      updatedRecord = await this.trialsRecordModel.findByIdAndUpdate(
        trialRecordId,
        {
          $set: {
            total_milestones_completed: updatedRecord.milestones.length,
          },
        },
        { new: true },
      );
    }

    if (updatedRecord) {
      await this.userModel.updateOne(
        { _id: trialRecord.user_id, 'trial_records._id': trialRecord._id },
        {
          $set: {
            'trial_records.$': updatedRecord.toObject(),
          },
        },
      );
    }

    return new ResponseDto<TrialsRecordResDto>({
      data: plainToInstance(TrialsRecordResDto, updatedRecord, {
        excludeExtraneousValues: true,
      }),
      message: 'Milestone marked as completed successfully',
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
      // is_active: true,
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
        takeAll: true,
        populate: ['trial_id', 'appointments'],
      },
    );

    return new OffsetPaginatedDto<TrialsRecordResDto>({
      data: plainToInstance(
        TrialsRecordResDto,
        records.map((record) => this.toTrialRecordResponse(record)),
        {
          excludeExtraneousValues: true,
        },
      ),
      meta: metaDto,
      message: 'Retrieved active trials successfully',
    });
  }

  private toTrialRecordResponse(record: unknown) {
    const data =
      record &&
      typeof (record as { toObject?: unknown }).toObject === 'function'
        ? (record as { toObject: () => Record<string, unknown> }).toObject()
        : (record as Record<string, unknown>);
    const trial = data?.trial_id;
    const trialId =
      trial && typeof trial === 'object' && '_id' in trial
        ? (trial as { _id: unknown })._id
        : trial;
    const trialMilestones =
      trial &&
      typeof trial === 'object' &&
      'overview' in trial &&
      Array.isArray(
        (trial as { overview?: { milestones?: unknown[] } }).overview
          ?.milestones,
      )
        ? (trial as { overview: { milestones: unknown[] } }).overview.milestones
        : null;
    const completedMilestones = Array.isArray(data?.milestones)
      ? data.milestones
      : [];

    return {
      ...data,
      trial,
      trial_id: trialId,
      total_milestones: data?.total_milestones ?? trialMilestones?.length ?? 0,
      total_milestones_completed:
        data?.total_milestones_completed ?? completedMilestones.length,
    };
  }

  private getTotalMilestones(trial: TrialsDocument): number {
    return Array.isArray(trial.overview?.milestones)
      ? trial.overview.milestones.length
      : 0;
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

  private async validateNoticeBoardItem(
    trialId: Types.ObjectId,
    noticeBoardId: Types.ObjectId,
  ): Promise<void> {
    const exists = await this.trialModel.exists({
      _id: trialId,
      'notice_board._id': noticeBoardId,
    });

    if (!exists) {
      throw new BadRequestException('Notice board item not found');
    }
  }

  private async getNoticeBoardItem(
    trialId: Types.ObjectId,
    noticeBoardId: Types.ObjectId,
  ): Promise<NoticeBoardItem> {
    const trial = await this.trialModel
      .findOne(
        { _id: trialId, 'notice_board._id': noticeBoardId },
        { 'notice_board.$': 1 },
      )
      .lean();

    const noticeBoardItem = trial?.notice_board?.[0];

    if (!noticeBoardItem) {
      throw new BadRequestException('Notice board item not found');
    }

    return noticeBoardItem;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
