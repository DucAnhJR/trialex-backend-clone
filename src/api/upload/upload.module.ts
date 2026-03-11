import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import * as fs from 'fs';
import path from 'path';
import { User, UserSchema } from '../users/schemas/user.schema';
import { fileConfiguration } from './upload.config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: () => {
        Object.values(fileConfiguration.subdirectories).forEach((subdir) => {
          const dir = path.join(
            process.cwd(),
            fileConfiguration.baseDir,
            subdir.path,
          );
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        });

        return {
          limits: {
            fileSize: 5 * 1024 * 1024,
          },
        };
      },
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
