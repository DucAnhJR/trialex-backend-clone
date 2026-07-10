import { ResponseNoDataDto } from '@/common/dto/response/response-no-data.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SaveDeviceTokenReqDto } from './dto/save-device-token.req.dto';
import {
  DeviceToken,
  DeviceTokenDocument,
  DeviceTokenProvider,
} from './schemas/device-tokens.schema';

@Injectable()
export class DeviceTokenService {
  constructor(
    @InjectModel(DeviceToken.name)
    private deviceToken: Model<DeviceTokenDocument>,
  ) {}

  async saveDeviceTokens(
    body: SaveDeviceTokenReqDto,
    userId: Types.ObjectId,
  ): Promise<ResponseNoDataDto> {
    const {
      token,
      provider = DeviceTokenProvider.EXPO,
      platform,
      appVersion,
      deviceId,
    } = body;

    await this.deviceToken.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        token,
        provider,
      },
      {
        $set: {
          token,
          provider,
          platform,
          appVersion,
          deviceId,
          active: true,
          lastSeenAt: new Date(),
        },
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
        },
      },
      { new: true, upsert: true },
    );

    return new ResponseNoDataDto({
      message: 'Device token saved successfully',
    });
  }

  async removeToken(userId: Types.ObjectId, token: string): Promise<void> {
    await this.deviceToken.deleteOne({
      userId: new Types.ObjectId(userId),
      token,
    });
  }

  async deactivateToken(
    userId: Types.ObjectId,
    token: string,
    provider?: DeviceTokenProvider,
  ): Promise<void> {
    await this.deviceToken.updateOne(
      {
        userId: new Types.ObjectId(userId),
        token,
        ...(provider ? { provider } : {}),
      },
      {
        $set: {
          active: false,
        },
      },
    );
  }
}
