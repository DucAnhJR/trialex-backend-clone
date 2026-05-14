import { ResponseDto } from '@/common/dto/response/response.dto';
import { ApiPublic } from '@/decorators/http.decorators';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SearchQueryDto } from './dto/search.query.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiPublic({
    summary: 'Global search',
    description:
      'Search discover.title, publications.title, trials.overview.name, trials.overview.full_name',
  })
  search(@Query() query: SearchQueryDto): Promise<ResponseDto<unknown[]>> {
    return this.searchService.search(query);
  }
}
