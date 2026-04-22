import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscoverController } from './discover.controller';
import { DiscoverService } from './discover.service';
import { Discover, DiscoverSchema } from './schemas/discover.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Discover.name,
        schema: DiscoverSchema,
      },
    ]),
  ],
  controllers: [DiscoverController],
  providers: [DiscoverService],
})
export class DiscoverModule {}