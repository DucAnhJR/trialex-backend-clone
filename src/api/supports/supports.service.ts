import { ResponseDto } from '@/common/dto/response/response.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model, Types } from 'mongoose';
import { CreateSupportsDto } from './dto/create-supports.dto';
import { SupportFaqResDto } from './dto/support-faq.res.dto';
import { SupportsResDto } from './dto/supports.res.dto';
import { SupportFaq, SupportFaqDocument } from './schemas/support-faq.schema';
import { Supports, SupportsDocument } from './schemas/supports.schema';

@Injectable()
export class SupportsService {
  constructor(
    @InjectModel(Supports.name) private supportsModel: Model<SupportsDocument>,
    @InjectModel(SupportFaq.name)
    private supportFaqModel: Model<SupportFaqDocument>,
  ) {}

  async getSupportFaqs(): Promise<ResponseDto<SupportFaqResDto[]>> {
    const supportFaqs = await this.supportFaqModel
      .find()
      .sort({ _id: 1 })
      .lean();
    const formattedSupportFaqs = supportFaqs.map((supportFaq) => ({
      ...supportFaq,
      _id: supportFaq._id.toString(),
    }));

    return new ResponseDto<SupportFaqResDto[]>({
      data: plainToInstance(SupportFaqResDto, formattedSupportFaqs, {
        excludeExtraneousValues: true,
      }),
      message: 'Support FAQs fetched successfully',
    });
  }

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
