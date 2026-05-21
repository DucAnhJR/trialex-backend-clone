import { PageOptionsDto } from '@/common/dto/cursor-pagination/page-options.dto';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { BaseUserResDto } from './dto/base-user.res.dto';
import { CreateUserInformationDto } from './dto/create-user-information.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';
import { UpdateTrialsPreferencesDto } from './dto/update-trial-preferences.dto';
import { Information } from './interfaces/information.interface';
import { Notifications } from './interfaces/notifications.interface';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiAuth({
    summary: 'Retrieve all users',
    description: 'Fetches a list of all users in the system.',
    type: BaseUserResDto,
    isPaginated: true,
    paginationType: 'cursor',
  })
  findAll(@Query() query: PageOptionsDto) {
    return this.usersService.findAll(query);
  }

  @Post('info')
  @ApiAuth({
    summary: 'Create new user information',
    description: 'Creates new information for the current user.',
    type: BaseUserResDto,
  })
  createUserInfo(
    @CurrentUser('id') id: Types.ObjectId,
    @Body() body: CreateUserInformationDto,
  ) {
    return this.usersService.createUserInformation(id, body);
  }

  @Put('personal-info')
  @ApiAuth({
    summary: 'Update personal information',
    description: 'Allows a user to update their personal information.',
    type: BaseUserResDto,
  })
  updatePersonalInfo(
    @Body() body: UpdatePersonalInfoDto,
    @CurrentUser('id') id: Types.ObjectId,
  ) {
    return this.usersService.updatePersonalInfo(id, body);
  }

  @Get('personal-info/:id')
  @ApiAuth({
    summary: 'Get personal information by ID',
    description: 'Fetches personal information of a user by their ID.',
    type: Information,
  })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  getPersonalInfoById(@CurrentUser('id') id: Types.ObjectId) {
    return this.usersService.getInfomationById(id);
  }

  @Delete('account')
  @ApiAuth({
    summary: 'Delete user account',
    description: 'Deletes the account of the current user.',
  })
  deleteAccount(@CurrentUser('id') id: Types.ObjectId) {
    return this.usersService.deleteAccount(id);
  }

  @Get('client-preferences/:email')
  @ApiAuth({
    summary: 'Get client preferences by email',
    description: 'Fetches client preferences of a user by their email.',
  })
  getClientPreferencesByEmail(@Query('email') email: string) {
    return this.usersService.getClientPreferencesByEmail(email);
  }

  @Get('notification')
  @ApiAuth({
    summary: 'Get user notification settings',
    description: 'Fetches the notification settings of the current user.',
    type: Notifications,
  })
  getNotificationSettings(@CurrentUser('id') id: Types.ObjectId) {
    return this.usersService.getNotificationSettings(id);
  }

  @Get('security')
  @ApiAuth({
    summary: 'Get user security settings',
    description: 'Fetches the security settings of the current user.',
  })
  getSecuritySettings(@CurrentUser('id') id: Types.ObjectId) {
    return this.usersService.getSecuritySettings(id);
  }

  @Patch('security')
  @ApiAuth({
    summary: 'Update user security settings',
    description: 'Allows a user to update their security settings.',
  })
  updateSecuritySettings(
    @CurrentUser('id') id: Types.ObjectId,
    @Body() body: UpdateSecurityDto,
  ) {
    return this.usersService.updateSecuritySettings(id, body);
  }

  @Patch('password')
  @ApiAuth({
    summary: 'Update user password',
    description: 'Allows the current user to update their login password.',
  })
  updatePassword(
    @CurrentUser('id') id: Types.ObjectId,
    @Body() body: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(id, body);
  }

  @Patch('notification')
  @ApiAuth({
    summary: 'Update user notification settings',
    description: 'Allows a user to update their notification settings.',
    type: Notifications,
  })
  updateNotificationSettings(
    @CurrentUser('id') id: Types.ObjectId,
    @Body() body: UpdateNotificationSettingsDto,
  ) {
    return this.usersService.updateNotificationSettings(id, body);
  }

  @Get('trials-preferences')
  @ApiAuth({
    summary: 'Get user trial preferences',
    description:
      'Fetches the trial preferences options and selected status of the current user.',
  })
  getTrialsPreferences(@CurrentUser('id') id: Types.ObjectId) {
    return this.usersService.getTrialsPreferences(id);
  }

  @Post('trials-preferences')
  @ApiAuth({
    summary: 'Select or unselect a trial preference',
    description:
      'Adds/removes a trial preference id in user.trial_preferences of the current user.',
  })
  updateTrialsPreferences(
    @CurrentUser('id') id: Types.ObjectId,
    @Body() preferences: UpdateTrialsPreferencesDto,
  ) {
    return this.usersService.updateTrialsPreferences(id, preferences);
  }

  // @Post('store-preferences-options')
  // @ApiAuth({
  //   summary: 'Store user preferences options',
  //   description: 'Stores various preference options for the user.',
  // })
  // storePreferencesOptions(
  //   @CurrentUser('id') id: Types.ObjectId,
  //   @Body() preferences: { [key: string]: any },
  // ) {
  //   return this.usersService.storePreferencesOptions(id, preferences);
  // }
}
