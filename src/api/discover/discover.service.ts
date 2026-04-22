import { ResponseDto } from '@/common/dto/response/response.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model, Types } from 'mongoose';
import { DiscoverResDto } from './dto/discover.res.dto';
import { LikeDiscoverDto } from './dto/like-discover.dto';
import { Discover, DiscoverDocument } from './schemas/discover.schema';

@Injectable()
export class DiscoverService {
  constructor(
    @InjectModel(Discover.name) private discoverModel: Model<DiscoverDocument>,
  ) {}

  async getDiscoverList(): Promise<ResponseDto<DiscoverResDto[]>> {
    const discoverList = await this.discoverModel
      .find()
      .sort({ createdAt: -1 })
      .lean();

    const formattedDiscoverList = discoverList.map((item) => ({
      ...item,
      _id: item._id?.toString(),
      type: item.type || 'Clinical trials',
      author: item.author || 'Unknown',
      context: item.context || '',
      title: item.title || 'Untitled',
      image: item.image || '',
      link: item.link || '',
      like: (item.like || []).map((id: any) => id?.toString()),
    }));

    return new ResponseDto<DiscoverResDto[]>({
      data: plainToInstance(DiscoverResDto, formattedDiscoverList, {
        excludeExtraneousValues: true,
      }),
      message: 'Discover list fetched successfully',
    });
  }

  async likeDiscover(
    userId: Types.ObjectId,
    dto: LikeDiscoverDto,
  ): Promise<ResponseDto<DiscoverResDto>> {
    const { discoverId, like } = dto;

    const update = like
      ? { $addToSet: { like: userId } }
      : { $pull: { like: userId } };

    const discover = await this.discoverModel
      .findByIdAndUpdate(discoverId, update, { new: true })
      .lean();

    if (!discover) {
      throw new NotFoundException('Discover not found');
    }

    const formatted = {
      ...discover,
      _id: discover._id?.toString(),
      type: discover.type || 'Clinical trials',
      author: discover.author || 'Unknown',
      context: discover.context || '',
      title: discover.title || 'Untitled',
      image: discover.image || '',
      link: discover.link || '',
      like: (discover.like || []).map((id: any) => id?.toString()),
    };

    return new ResponseDto<DiscoverResDto>({
      data: plainToInstance(DiscoverResDto, formatted, {
        excludeExtraneousValues: true,
      }),
      message: like ? 'Discover liked' : 'Discover unliked',
    });
  }
}