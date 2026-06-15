import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportFaq, SupportFaqSchema } from './schemas/support-faq.schema';
import { Supports, SupportsSchema } from './schemas/supports.schema';
import { SupportsController } from './supports.controller';
import { SupportsService } from './supports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Supports.name,
        schema: SupportsSchema,
      },
      {
        name: SupportFaq.name,
        schema: SupportFaqSchema,
      },
    ]),
  ],
  controllers: [SupportsController],
  providers: [SupportsService],
  exports: [SupportsService],
})
export class SupportsModule {}
