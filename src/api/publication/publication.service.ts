import { ResponseDto } from '@/common/dto/response/response.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model, Types } from 'mongoose';
import { LikePublicationDto } from './dto/like-publication.dto';
import { PublicationResDto } from './dto/publication.res.dto';
import { Publication, PublicationDocument } from './schemas/publication.schema';

@Injectable()
export class PublicationService {
  constructor(
    @InjectModel(Publication.name)
    private publicationModel: Model<PublicationDocument>,
  ) {}

  async getPublicationList(): Promise<ResponseDto<PublicationResDto[]>> {
    const publications = await this.publicationModel.find().lean();

    const formattedPublications = publications.map((pub) => ({
      ...pub,
      _id: pub._id?.toString(),
      title: pub.title || 'Untitled',
      authors: pub.authors || 'Unknown',
      image_path: pub.image_path || '',
      body: pub.body || 'No abstract available',
      likes: (pub.likes || []).map((id: any) => id?.toString()), // trả về mảng userId đã like
      type: pub.type || 'General',
    }));

    return new ResponseDto<PublicationResDto[]>({
      data: plainToInstance(PublicationResDto, formattedPublications, {
        excludeExtraneousValues: true,
      }),
      message: 'Publication list fetched successfully',
    });
  }

  async likePublication(
    userId: Types.ObjectId,
    dto: LikePublicationDto,
  ): Promise<ResponseDto<PublicationResDto>> {
    const { publicationId, like } = dto;

    const update = like
      ? { $addToSet: { likes: userId } }
      : { $pull: { likes: userId } };

    const publication = await this.publicationModel
      .findByIdAndUpdate(publicationId, update, { new: true })
      .lean();

    if (!publication) {
      throw new NotFoundException('Publication not found');
    }

    const formatted = {
      ...publication,
      _id: publication._id?.toString(),
      title: publication.title || 'Untitled',
      authors: publication.authors || 'Unknown',
      image_path: publication.image_path || '',
      body: publication.body || 'No abstract available',
      likes: (publication.likes || []).map((id: any) => id?.toString()),
      type: publication.type || 'General',
    };

    return new ResponseDto<PublicationResDto>({
      data: plainToInstance(PublicationResDto, formatted, {
        excludeExtraneousValues: true,
      }),
      message: like ? 'Publication liked' : 'Publication unliked',
    });
  }
}
