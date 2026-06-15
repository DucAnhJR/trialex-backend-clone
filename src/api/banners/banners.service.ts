import { ResponseDto } from '@/common/dto/response/response.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import { BannerResDto } from './dto/banner.res.dto';
import { Banner, BannerDocument } from './schemas/banner.schema';

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
  ) {}

  async getBanners(): Promise<ResponseDto<BannerResDto[]>> {
    const banners = await this.bannerModel.find().sort({ _id: 1 }).lean();
    const formattedBanners = banners.map((banner) => ({
      ...banner,
      _id: banner._id.toString(),
    }));

    return new ResponseDto<BannerResDto[]>({
      data: plainToInstance(BannerResDto, formattedBanners, {
        excludeExtraneousValues: true,
      }),
      message: 'Banners fetched successfully',
    });
  }
}
