import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiPublic } from '@/decorators/http.decorators';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { CreateSupportsDto } from './dto/create-supports.dto';
import { SupportFaqResDto } from './dto/support-faq.res.dto';
import { SupportsService } from './supports.service';

@ApiTags('Supports')
@Controller('supports')
export class SupportsController {
  constructor(private readonly supportsService: SupportsService) {}

  @Get()
  @ApiPublic({
    summary: 'Get support FAQs',
    description: 'Retrieve support FAQ threads and their questions',
    type: SupportFaqResDto,
    isArray: true,
  })
  getSupportFaqs() {
    return this.supportsService.getSupportFaqs();
  }

  @Post()
  createSupportRequest(
    @Body() createSupport: CreateSupportsDto,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.supportsService.createSupportRequest(createSupport, userId);
  }
}
