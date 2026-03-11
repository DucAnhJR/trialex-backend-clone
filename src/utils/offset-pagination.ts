import { OffsetPaginationDto } from '@/common/dto/offset-pagination/offset-pagination.dto';
import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { Document, FilterQuery, Model } from 'mongoose';

export async function paginateWithModel<T extends Document, R = any>(
  model: Model<T>,
  filter: FilterQuery<T> = {},
  pageOptionsDto: PageOptionsDto,
  options?: Partial<{
    skipCount: boolean;
    takeAll: boolean;
    populate?: string | string[];
    select?: string;
  }>,
): Promise<[R[], OffsetPaginationDto]> {
  let query = model.find(filter);

  // Apply search if provided
  if (pageOptionsDto.q) {
    const searchFilter = {
      $or: [
        { name: { $regex: pageOptionsDto.q, $options: 'i' } },
        { description: { $regex: pageOptionsDto.q, $options: 'i' } },
      ],
    } as FilterQuery<T>;
    query = model.find({ $and: [filter, searchFilter] } as FilterQuery<T>);
  }

  // Apply population if provided
  if (options?.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach((path) => {
        query = query.populate(path);
      });
    } else {
      query = query.populate(options.populate);
    }
  }

  // Apply field selection if provided
  if (options?.select) {
    query = query.select(options.select);
  }

  // Apply sorting
  if (pageOptionsDto.sortBy) {
    const sortOrder = pageOptionsDto.order === 'DESC' ? -1 : 1;
    query = query.sort({ [pageOptionsDto.sortBy]: sortOrder });
  }

  if (!options?.takeAll) {
    query = query.skip(pageOptionsDto.offset).limit(pageOptionsDto.limit);
  }

  const entities = (await query.lean().exec()) as R[];

  let count = -1;

  if (!options?.skipCount) {
    const countFilter = pageOptionsDto.q
      ? ({
          $and: [
            filter,
            {
              $or: [
                { name: { $regex: pageOptionsDto.q, $options: 'i' } },
                { description: { $regex: pageOptionsDto.q, $options: 'i' } },
              ],
            },
          ],
        } as FilterQuery<T>)
      : filter;

    count = await model.countDocuments(countFilter).exec();
  }

  const metaDto = new OffsetPaginationDto(count, pageOptionsDto);

  return [entities, metaDto];
}
