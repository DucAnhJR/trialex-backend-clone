import { ApiPublic } from '@/decorators/http.decorators';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { BannerResDto } from './dto/banner.res.dto';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiPublic({
    summary: 'Get banners',
    description: 'Retrieve the banners displayed in the app',
    type: BannerResDto,
    isArray: true,
  })
  getBanners() {
    return this.bannersService.getBanners();
  }
}
