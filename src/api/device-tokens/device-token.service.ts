import { ResponseNoDataDto } from '@/common/dto/response/response-no-data.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SaveDeviceTokenReqDto } from './dto/save-device-token.req.dto';
import {
  DeviceToken,
  DeviceTokenDocument,
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
    const { token } = body;

    const existingToken = await this.deviceToken.findOne({
      userId: new Types.ObjectId(userId),
      token,
    });

    if (existingToken) {
      await this.deviceToken.findByIdAndUpdate(existingToken._id, {
        token,
      });
    } else {
      await this.deviceToken.create({
        userId: new Types.ObjectId(userId),
        token,
      });
    }

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
}
