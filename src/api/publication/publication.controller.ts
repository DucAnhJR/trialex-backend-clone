import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { LikePublicationDto } from './dto/like-publication.dto';
import { PublicationResDto } from './dto/publication.res.dto';
import { PublicationService } from './publication.service';

@ApiTags('Publication')
@Controller('publication')
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  @Get('list')
  @ApiAuth({
    description: 'Retrieve a list of publications',
    type: PublicationResDto,
  })
  getPublicationList() {
    return this.publicationService.getPublicationList();
  }

  @Post('like')
  @ApiAuth({
    summary: 'Like or unlike a publication',
    description: 'Like or unlike a publication by ID',
    type: PublicationResDto,
  })
  async likePublication(
    @CurrentUser('id') userId: Types.ObjectId,
    @Body() dto: LikePublicationDto,
  ) {
    return this.publicationService.likePublication(userId, dto);
  }
}
