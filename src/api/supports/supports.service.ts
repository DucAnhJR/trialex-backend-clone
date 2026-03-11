import { ResponseDto } from '@/common/dto/response/response.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model, Types } from 'mongoose';
import { CreateSupportsDto } from './dto/create-supports.dto';
import { SupportsResDto } from './dto/supports.res.dto';
import { Supports, SupportsDocument } from './schemas/supports.schema';

@Injectable()
export class SupportsService {
  constructor(
    @InjectModel(Supports.name) private supportsModel: Model<SupportsDocument>,
  ) {}

  async createSupportRequest(
    createSupportDto: CreateSupportsDto,
    userId: Types.ObjectId,
  ): Promise<ResponseDto<SupportsResDto>> {
    const createdSupport = await this.supportsModel.create({
      ...createSupportDto,
      requester_id: userId,
    });

    return new ResponseDto<SupportsResDto>({
      data: plainToInstance(SupportsResDto, createdSupport.toObject(), {
        excludeExtraneousValues: true,
      }),
      message: 'Support request created successfully',
    });
  }
}
