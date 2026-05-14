import { ResponseDto } from '@/common/dto/response/response.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';
import {
  Discover,
  DiscoverDocument,
} from '../discover/schemas/discover.schema';
import {
  Publication,
  PublicationDocument,
} from '../publication/schemas/publication.schema';
import { TrialsResDto } from '../trials/dto/trials.res.dto';
import { Trials, TrialsDocument } from '../trials/schemas/trials.schema';
import { SearchQueryDto } from './dto/search.query.dto';

type SearchItemType = 'discover' | 'publications' | 'trials';

interface SearchItem {
  id: string;
  type: SearchItemType;
  title: string;
  item: Record<string, unknown>;
}

interface SearchTrialItem extends Omit<SearchItem, 'type' | 'item'> {
  type: 'trials';
  item: TrialsResDto;
}

type SearchResultItem = SearchItem | SearchTrialItem;

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Discover.name) private discoverModel: Model<DiscoverDocument>,
    @InjectModel(Publication.name)
    private publicationModel: Model<PublicationDocument>,
    @InjectModel(Trials.name) private trialModel: Model<TrialsDocument>,
  ) {}

  async search(
    query: SearchQueryDto,
  ): Promise<ResponseDto<SearchResultItem[]>> {
    const keyword = (query.q || '').trim();
    const limit = Math.min(Math.max(query.limit || 20, 1), 50);

    if (!keyword) {
      return new ResponseDto<SearchResultItem[]>({
        data: [],
        message: 'Search result fetched successfully',
      });
    }

    const regex = new RegExp(this.escapeRegExp(keyword), 'i');

    const [discovers, publications, trials] = await Promise.all([
      this.discoverModel
        .find({ title: regex })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      this.publicationModel
        .find({ title: regex })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      this.trialModel
        .find({
          $or: [{ 'overview.name': regex }, { 'overview.full_name': regex }],
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const discoverItems: SearchItem[] = discovers.map((doc) => ({
      id: doc._id.toString(),
      type: 'discover',
      title: doc.title || 'Untitled',
      item: {
        ...doc,
        _id: doc._id.toString(),
      },
    }));

    const publicationItems: SearchItem[] = publications.map((doc) => ({
      id: doc._id.toString(),
      type: 'publications',
      title: doc.title || 'Untitled',
      item: {
        ...doc,
        _id: doc._id.toString(),
      },
    }));

    const trialItems: SearchTrialItem[] = trials.map((doc) => ({
      id: doc._id.toString(),
      type: 'trials',
      title: doc.overview?.name || doc.overview?.full_name || 'Untitled',
      item: plainToInstance(TrialsResDto, {
        ...doc,
        _id: doc._id.toString(),
      }),
    }));

    return new ResponseDto<SearchResultItem[]>({
      data: [...discoverItems, ...publicationItems, ...trialItems],
      message: 'Search result fetched successfully',
    });
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
