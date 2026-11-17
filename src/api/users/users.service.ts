import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { PageOptionsDto } from '@/common/dto/cursor-pagination/page-options.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { ResponseNoDataDto } from '@/common/dto/response/response-no-data.dto';
import { ResponseDto } from '@/common/dto/response/response.dto';
import { buildPaginator } from '@/utils/cursor-pagination';
import { hashPassword } from '@/utils/password.util';
import {
  BadRequestException,
  ConflictException,
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
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { UpdateTrialsPreferencesDto } from './dto/update-trial-preferences.dto';
import { HEALTH_THEMES } from './health-themes';
import { Information } from './interfaces/information.interface';
import { Notifications } from './interfaces/notifications.interface';
import { Security } from './interfaces/security.interface';
import { TrialPreferences } from './interfaces/trial-preferences.interface';
import { loadPreferenceCatalog } from './preference-catalog';
import {
  EDUCATION_OPTIONS,
  ETHNICITY_OPTIONS,
  GENDER_OPTIONS,
  OCCUPATION_OPTIONS,
  PARENTAL_STATUS_OPTIONS,
} from './profile-options';
import { TrialPreference } from './schemas/trial-preference.schema';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(TrialPreference.name)
    private trialPreferenceModel: Model<TrialPreference>,
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

    const current = user.information;
    for (const field of ['date_of_birth', 'sex'] as const) {
      if (body[field] === undefined) continue;
      const previous =
        field === 'date_of_birth'
          ? this.dateKey(current?.date_of_birth)
          : current?.sex;
      const requested =
        field === 'date_of_birth' ? this.dateKey(body.date_of_birth) : body.sex;
      if (requested !== previous) {
        throw new BadRequestException(
          `${field === 'sex' ? 'Sex assigned at birth' : 'Date of birth'} cannot be changed after registration.`,
        );
      }
    }
    const optionFields = {
      gender: GENDER_OPTIONS,
      ethnicity: ETHNICITY_OPTIONS,
      occupation: OCCUPATION_OPTIONS,
      parental_status: PARENTAL_STATUS_OPTIONS,
      education_level: EDUCATION_OPTIONS,
    };
    for (const [field, options] of Object.entries(optionFields)) {
      if (
        body[field] !== undefined &&
        body[field] !== current?.[field] &&
        !options.includes(body[field] as never)
      ) {
        throw new BadRequestException(`Invalid ${field} selection.`);
      }
    }
    const mutable = [
      'first_name',
      'last_name',
      'phone_number',
      'gender',
      'ethnicity',
      'occupation',
      'parental_status',
      'education_level',
      'nationality',
      'health_conditions',
      'methods_of_contact',
      'gender_description',
      'ethnicity_description',
      'occupation_description',
      'parental_status_description',
      'education_level_description',
    ];
    const update: Record<string, unknown> = {};
    for (const field of mutable) {
      if (body[field] !== undefined && body[field] !== null) {
        const value = body[field];
        update[`information.${field}`] =
          typeof value === 'string' ? value.trim() : value;
      }
    }
    for (const field of ['first_name', 'last_name']) {
      if (update[`information.${field}`] === '')
        throw new BadRequestException('Name cannot be blank.');
    }
    // Remove stale descriptions when the corresponding choice changes.
    for (const field of [
      'gender',
      'ethnicity',
      'occupation',
      'parental_status',
      'education_level',
    ]) {
      const value = update[`information.${field}`];
      if (
        value !== undefined &&
        ![
          'Prefer to self-describe',
          'Another gender identity',
          'Other',
          'Other ethnic group',
        ].includes(String(value))
      ) {
        update[`information.${field}_description`] = '';
      }
    }
    if (
      body.phone_number &&
      (['callingCode', 'cca2', 'phone'] as const).some(
        (field) => body.phone_number[field] !== current?.phone_number?.[field],
      )
    ) {
      update.phone_number_verified = false;
    }
    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const collision = await this.userModel.exists({
        _id: { $ne: id },
        email: { $regex: `^${escaped}$`, $options: 'i' },
      });
      if (collision) throw new ConflictException('Email already exists');
      update.email = email;
    }
    if (body.trial_preference_ids !== undefined) {
      const requested = body.trial_preference_ids;
      const found = await this.trialPreferenceModel
        .find({ _id: { $in: requested } })
        .lean();
      if (found.length !== requested.length)
        throw new BadRequestException('Invalid health interest selection.');
      update.trial_preferences = requested.map(
        (value) => new Types.ObjectId(value),
      );
    }
    if (!Object.keys(update).length)
      throw new BadRequestException('No editable profile fields supplied.');
    let updatedUser;
    try {
      updatedUser = await this.userModel.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true, runValidators: true },
      );
    } catch (error) {
      if ((error as { code?: number }).code === 11000)
        throw new ConflictException('Email already exists');
      throw error;
    }
    if (!updatedUser) throw new NotFoundException('User not found');

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

  async updatePassword(
    id: Types.ObjectId,
    body: UpdatePasswordDto,
  ): Promise<ResponseNoDataDto> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = await hashPassword(body.newPassword);
    await user.save();

    return new ResponseNoDataDto({
      message: 'User password updated successfully',
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

    const allOptions = await loadPreferenceCatalog(this.trialPreferenceModel);
    const options = allOptions.filter(
      (item) =>
        (HEALTH_THEMES as readonly string[]).includes(
          item.trial_preferences_name,
        ) ||
        (user.trial_preferences || []).some(
          (id) => id.toString() === item._id.toString(),
        ),
    );
    const selectedSet = new Set(
      (user.trial_preferences || []).map((item) => item.toString()),
    );

    options.sort((a, b) => {
      const order = (name: string) => {
        const index = (HEALTH_THEMES as readonly string[]).indexOf(name);
        return index < 0 ? HEALTH_THEMES.length : index;
      };
      return order(a.trial_preferences_name) - order(b.trial_preferences_name);
    });
    const data = options.map((item) => ({
      _id: item._id.toString(),
      trial_preferences_name: item.trial_preferences_name,
      image: item.image,
      selected: selectedSet.has(item._id.toString()),
    }));

    return new ResponseDto<TrialPreferences[]>({
      data,
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

    const preference = await this.trialPreferenceModel.findById(
      preferences.trialPreferenceId,
    );
    if (!preference) {
      throw new NotFoundException('Trial preference not found');
    }

    const update = preferences.selected
      ? {
          $addToSet: {
            trial_preferences: new Types.ObjectId(
              preferences.trialPreferenceId,
            ),
          },
        }
      : {
          $pull: {
            trial_preferences: new Types.ObjectId(
              preferences.trialPreferenceId,
            ),
          },
        };

    const updatedUser = await this.userModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      throw new BadRequestException('Failed to update trial preferences');
    }

    const options = await this.trialPreferenceModel.find().lean();
    const selectedSet = new Set(
      (updatedUser.trial_preferences || []).map((item) => item.toString()),
    );

    const data = options.map((item) => ({
      _id: item._id.toString(),
      trial_preferences_name: item.trial_preferences_name,
      image: item.image,
      selected: selectedSet.has(item._id.toString()),
    }));

    return new ResponseDto<TrialPreferences[]>({
      data,
      message: preferences.selected
        ? 'Trial preference selected successfully'
        : 'Trial preference unselected successfully',
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

    if (user.information?.date_of_birth) {
      return this.updatePersonalInfo(id, body);
    }
    // Only initialize once; a second concurrent initializer cannot overwrite DOB/sex.
    const updateUser = await this.userModel.findOneAndUpdate(
      { _id: id, 'information.date_of_birth': null },
      { $set: { information: body } },
      { new: true, runValidators: true },
    );
    if (!updateUser)
      throw new BadRequestException(
        'Profile already initialized. Reload before editing.',
      );
    return new ResponseDto<BaseUserResDto>({
      data: plainToInstance(BaseUserResDto, updateUser, {
        excludeExtraneousValues: true,
      }),
      message: 'User information updated successfully',
    });
  }

  private dateKey(value: unknown) {
    if (!value) return null;
    const date = new Date(value as string);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toISOString().slice(0, 10);
  }
}
