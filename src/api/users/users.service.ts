import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { PageOptionsDto } from '@/common/dto/cursor-pagination/page-options.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { ResponseDto } from '@/common/dto/response/response.dto';
import { buildPaginator } from '@/utils/cursor-pagination';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { merge } from 'lodash';
import { FilterQuery, Model, Types } from 'mongoose';
import { AppointmentsService } from '../appointments/appointments.service';
import {
  TrialsRecord,
  TrialsRecordDocument,
} from '../trials/schemas/trials-record.schema';
import { BaseUserResDto } from './dto/base-user.res.dto';
import { CreateUserInformationDto } from './dto/create-user-information.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { UpdateTrialsPreferencesDto } from './dto/update-trial-preferences.dto';
import { Information } from './interfaces/information.interface';
import { Notifications } from './interfaces/notifications.interface';
import { Security } from './interfaces/security.interface';
import { TrialPreferences } from './interfaces/trial-preferences.interface';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TrialsRecord.name)
    private trialsRecordModel: Model<TrialsRecordDocument>,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  async storePreferencesOptions() {}

  async findOne(id: Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async findAll(query: PageOptionsDto) {
    const paginator = buildPaginator<UserDocument>({
      model: this.userModel,
      query: {
        afterCursor: query.afterCursor,
        beforeCursor: query.beforeCursor,
        limit: query.limit,
        order: query.order,
      },
      paginationKeys: ['_id'],
    });

    const filter: FilterQuery<User> = {};

    if (query.q) {
      filter.$or = [
        { name: { $regex: query.q, $options: 'i' } },
        { email: { $regex: query.q, $options: 'i' } },
      ];
    }

    const { cursor, data, totalCount } = await paginator.paginate(filter);

    const metaDto = new CursorPaginationDto(
      totalCount,
      cursor.afterCursor,
      cursor.beforeCursor,
      query,
    );

    return new CursorPaginatedDto<BaseUserResDto>({
      data: plainToInstance(BaseUserResDto, data, {
        excludeExtraneousValues: true,
      }),
      meta: metaDto,
      message: 'User records retrieved successfully',
    });
  }

  async updatePersonalInfo(id: Types.ObjectId, body: UpdatePersonalInfoDto) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedInformation = merge({}, user.information || {}, body);

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { information: updatedInformation } },
      { new: true },
    );

    return new ResponseDto<BaseUserResDto>({
      data: plainToInstance(BaseUserResDto, updatedUser, {
        excludeExtraneousValues: true,
      }),
      message: 'Personal information updated successfully',
    });
  }

  async getInfomationById(
    id: Types.ObjectId,
  ): Promise<ResponseDto<Information>> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new ResponseDto<Information>({
      data: plainToInstance(Information, user.information, {
        excludeExtraneousValues: true,
      }),
      message: 'User information retrieved successfully',
    });
  }

  async deleteAccount(id: Types.ObjectId) {
    await this.appointmentsService.deleteManyByUserId(id);
    await this.trialsRecordModel.deleteMany({ user_id: id });
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return new ResponseDto<null>({
      data: null,
      message: 'User account deleted successfully',
    });
  }

  async getClientPreferencesByEmail(email: string) {}

  async getNotificationSettings(
    id: Types.ObjectId,
  ): Promise<ResponseDto<Notifications>> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new ResponseDto({
      data: plainToInstance(Notifications, user.notifications, {
        excludeExtraneousValues: true,
      }),
      message: 'User notification settings retrieved successfully',
    });
  }

  async getSecuritySettings(
    id: Types.ObjectId,
  ): Promise<ResponseDto<Security>> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return new ResponseDto({
      data: plainToInstance(Security, user.security, {
        excludeExtraneousValues: true,
      }),
      message: 'User security settings retrieved successfully',
    });
  }

  async updateSecuritySettings(
    id: Types.ObjectId,
    body: UpdateSecurityDto,
  ): Promise<ResponseDto<Security>> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedSecurity = merge({}, user.security || {}, body);

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { security: updatedSecurity } },
      { upsert: false, new: true, returnDocument: 'after' },
    );

    return new ResponseDto<Security>({
      data: plainToInstance(Security, updatedUser.security, {
        excludeExtraneousValues: true,
      }),
      message: 'User security settings updated successfully',
    });
  }

  async updateNotificationSettings(
    id: Types.ObjectId,
    body: UpdateNotificationSettingsDto,
  ): Promise<ResponseDto<Notifications>> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedNotifications = merge({}, user.notifications || {}, body);

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { notifications: updatedNotifications } },
      { upsert: false, new: true, returnDocument: 'after' },
    );

    return new ResponseDto<Notifications>({
      data: plainToInstance(Notifications, updatedUser.notifications, {
        excludeExtraneousValues: true,
      }),
      message: 'User notification settings updated successfully',
    });
  }

  async getTrialsPreferences(
    id: Types.ObjectId,
  ): Promise<ResponseDto<TrialPreferences[]>> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new ResponseDto<TrialPreferences[]>({
      data: user.trial_preferences || [],
      message: 'User trial preferences retrieved successfully',
    });
  }

  async updateTrialsPreferences(
    id: Types.ObjectId,
    preferences: UpdateTrialsPreferencesDto,
  ): Promise<ResponseDto<TrialPreferences[]>> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const trialPreferences = user.trial_preferences || [];
    const idx = trialPreferences.findIndex(
      (item: any) => item.title === preferences.trialPreference,
    );

    if (idx !== -1) {
      trialPreferences[idx].selected = preferences.selected;
    } else {
      trialPreferences.push({
        title: preferences.trialPreference,
        image: '',
        selected: preferences.selected,
      });
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { trial_preferences: trialPreferences } },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new BadRequestException('Failed to update trial preferences');
    }

    return new ResponseDto<TrialPreferences[]>({
      data: updatedUser.trial_preferences || [],
      message: 'User trial preferences updated successfully',
    });
  }

  async createUserInformation(
    id: Types.ObjectId,
    body: CreateUserInformationDto,
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { information: body } },
      { new: true },
    );
    return new ResponseDto<BaseUserResDto>({
      data: plainToInstance(BaseUserResDto, updateUser, {
        excludeExtraneousValues: true,
      }),
      message: 'User information updated successfully',
    });
  }
}
