import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { DiscoverResDto } from './dto/discover.res.dto';
import { LikeDiscoverDto } from './dto/like-discover.dto';
import { DiscoverService } from './discover.service';

@ApiTags('Discover')
@Controller('discover')
export class DiscoverController {
  constructor(private readonly discoverService: DiscoverService) {}

  @Get()
  @ApiPublic({
    summary: 'Get discover list',
    description: 'Retrieve discover articles and sample cards',
    type: DiscoverResDto,
    isArray: true,
  })
  getDiscoverList() {
    return this.discoverService.getDiscoverList();
  }

  @Post('like')
  @ApiAuth({
    summary: 'Like or unlike a discover item',
    description: 'Like or unlike a discover item by ID',
    type: DiscoverResDto,
  })
  async likeDiscover(
    @CurrentUser('id') userId: Types.ObjectId,
    @Body() dto: LikeDiscoverDto,
  ) {
    return this.discoverService.likeDiscover(userId, dto);
  }
}