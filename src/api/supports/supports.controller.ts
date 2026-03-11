import { CurrentUser } from '@/decorators/current-user.decorator';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { CreateSupportsDto } from './dto/create-supports.dto';
import { SupportsService } from './supports.service';

@ApiTags('Supports')
@Controller('supports')
export class SupportsController {
  constructor(private readonly supportsService: SupportsService) {}

  @Post()
  createSupportRequest(
    @Body() createSupport: CreateSupportsDto,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.supportsService.createSupportRequest(createSupport, userId);
  }
}
