import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublicationController } from './publication.controller';
import { PublicationService } from './publication.service';
import { Publication, PublicationSchema } from './schemas/publication.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Publication.name,
        schema: PublicationSchema,
      },
    ]),
  ],
  controllers: [PublicationController],
  providers: [PublicationService],
  exports: [PublicationService],
})
export class PublicationModule {}
