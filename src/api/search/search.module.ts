import { Discover, DiscoverSchema } from '@/api/discover/schemas/discover.schema';
import {
  Publication,
  PublicationSchema,
} from '@/api/publication/schemas/publication.schema';
import { Trials, TrialsSchema } from '@/api/trials/schemas/trials.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Discover.name, schema: DiscoverSchema },
      { name: Publication.name, schema: PublicationSchema },
      { name: Trials.name, schema: TrialsSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
