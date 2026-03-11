import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Body, Controller, Post } from '@nestjs/common';
import { Types } from 'mongoose';
import { DeviceTokenService } from './device-token.service';
import { SaveDeviceTokenReqDto } from './dto/save-device-token.req.dto';

@Controller('device-tokens')
export class DeviceTokenController {
  constructor(private readonly deviceTokenService: DeviceTokenService) {}

  @Post()
  @ApiAuth({
    summary: 'Save device token',
    description: 'Saves a device token for push notifications.',
  })
  saveDeviceTokens(
    @Body() body: SaveDeviceTokenReqDto,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.deviceTokenService.saveDeviceTokens(body, userId);
  }
}
