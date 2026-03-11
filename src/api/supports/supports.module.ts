import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
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
    ]),
  ],
  controllers: [SupportsController],
  providers: [SupportsService],
  exports: [SupportsService],
})
export class SupportsModule {}
