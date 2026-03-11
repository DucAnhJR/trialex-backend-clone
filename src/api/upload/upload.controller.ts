import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { diskStorage } from 'multer';
import path from 'path';
import { PersonalIdUploadDto } from './dto/upload.dto';
import { fileConfiguration } from './upload.config';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('profile-photo')
  @ApiAuth({
    summary: 'Upload Profile Photo',
  })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = path.join(
            process.cwd(),
            fileConfiguration.baseDir,
            fileConfiguration.subdirectories.profilePhoto.path,
          );
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const pattern =
            fileConfiguration.subdirectories.profilePhoto.namingPattern;
          const filename = pattern
            .replace('[timestamp]', Date.now().toString())
            .replace('[originalname]', file.originalname);
          cb(null, filename);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (file.mimetype.match(/^image\/(jpeg|jpg|png)$/)) {
          callback(null, true);
        } else {
          callback(new Error('Only JPG/JPEG/PNG files are allowed!'), false);
        }
      },
      limits: {
        fileSize: fileConfiguration.subdirectories.profilePhoto.maxSize,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadProfilePhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: Types.ObjectId,
  ) {
    return this.uploadService.handleProfilePhotoUpload(file, userId);
  }

  @Post('personal-id')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadPath = path.join(
            process.cwd(),
            fileConfiguration.baseDir,
            fileConfiguration.subdirectories.personalId.path,
          );
          cb(null, uploadPath);
        },
        filename: (_req, file, cb) => {
          const pattern =
            fileConfiguration.subdirectories.personalId.namingPattern;
          const filename = pattern
            .replace('[timestamp]', Date.now().toString())
            .replace('[originalname]', file.originalname);
          cb(null, filename);
        },
      }),
      fileFilter: (_req, file, callback) => {
        if (
          fileConfiguration.subdirectories.personalId.allowedTypes.includes(
            file.mimetype,
          )
        ) {
          callback(null, true);
        } else {
          callback(new Error('Only JPG/JPEG/PNG files are allowed!'), false);
        }
      },
      limits: {
        fileSize: fileConfiguration.subdirectories.personalId.maxSize,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
        idType: {
          type: 'string',
          example: 'passport',
        },
        email: {
          type: 'string',
          example: 'user@example.com',
        },
        countryIssue: {
          type: 'string',
          example: 'Vietnam',
        },
      },
      required: ['photo', 'idType', 'email', 'countryIssue'],
    },
  })
  @ApiPublic({
    summary: 'Upload Personal ID',
  })
  uploadPersonalID(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: PersonalIdUploadDto,
  ) {
    return this.uploadService.handleSavedPersonalID(file, body);
  }

  @Get('profile-photo')
  @ApiAuth({
    summary: 'Get Profile Photo',
  })
  getProfilePhoto(@CurrentUser('id') userId: Types.ObjectId) {
    return this.uploadService.getProfilePhoto(userId);
  }
}
