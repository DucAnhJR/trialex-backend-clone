import { ResponseDto } from '@/common/dto/response/response.dto';
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model, Types } from 'mongoose';
import path from 'path';
import { User, UserDocument } from '../users/schemas/user.schema';
import { PersonalIdUploadDto } from './dto/upload.dto';
import { fileConfiguration } from './upload.config';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async handleProfilePhotoUpload(
    file: Express.Multer.File,
    userId: Types.ObjectId,
  ): Promise<ResponseDto<string>> {
    const filePath = file.path;

    const user = await this.userModel.findById(userId);

    if (!user) {
      this.logger.warn(`User with ID ${userId} not found.`);
      fs.unlinkSync(filePath);
      throw new Error('User not found');
    }

    this.logger.log(
      `Saving profile photo at: ${filePath} with data: ${JSON.stringify(user.information.first_name)}`,
    );

    const finalFilename = `${user._id}-${Date.now()}${path.extname(file.originalname)}`;
    if (
      finalFilename.includes('/') ||
      finalFilename.includes('\\') ||
      finalFilename.includes(':')
    ) {
      throw new BadRequestException('Invalid filename');
    }

    const finalPath = path.join(path.dirname(filePath), finalFilename);

    fs.renameSync(filePath, finalPath);

    const result = await this.userModel.updateOne(
      {
        _id: userId,
      },
      {
        $set: { profile_image_file: finalFilename },
      },
    );

    if (result.modifiedCount === 0) {
      fs.unlinkSync(finalPath);
      throw new BadRequestException('Failed to update user profile image');
    }

    return new ResponseDto<string>({
      data: finalFilename,
      message: 'Profile photo uploaded successfully',
    });
  }

  async handleSavedPersonalID(
    file: Express.Multer.File,
    body: PersonalIdUploadDto,
  ) {
    const filePath = file.path;

    this.logger.log(
      `Received personal ID upload at: ${filePath} with data: ${JSON.stringify(body)}`,
    );

    const user = await this.userModel.findOne({ email: body.email });

    if (!user) {
      this.logger.warn(`User with email ${body.email} not found.`);

      fs.unlinkSync(filePath);
      throw new BadGatewayException('User not found');
    }

    const finalFilename = `${user.email}-${Date.now()}${path.extname(file.originalname)}`;
    const finalFilePath = path.join(path.dirname(filePath), finalFilename);

    fs.renameSync(filePath, finalFilePath);

    this.logger.log(`Personal ID saved as: ${finalFilePath}`);

    const result = await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          document: {
            file_name: finalFilename,
            uploaded_at: new Date(),
            verified: false,
            id_type: body.idType,
            country_issue: body.countryIssue,
          },
        },
      },
    );

    if (!result.acknowledged) {
      // cleanup the uploaded file if DB update fails

      if (filePath && fs.existsSync(finalFilePath)) {
        fs.unlinkSync(finalFilePath);
      }
      throw new BadRequestException('Failed to update user document');
    }

    this.logger.log(`User document updated for user ID: ${user._id}`);

    return new ResponseDto<string>({
      data: finalFilename,
      message: 'Personal ID uploaded successfully',
    });
  }

  async getProfilePhoto(userId: Types.ObjectId) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new BadRequestException('Profile photo not found');
    }

    if (!user.profile_image_file) {
      throw new BadRequestException('Profile photo not set');
    }

    if (user.profile_image_file.startsWith('data:image/')) {
      return new ResponseDto<string>({
        data: user.profile_image_file,
        message: 'Profile photo retrieved successfully',
      });
    }

    const finalFilePath = path.join(
      process.cwd(),
      fileConfiguration.baseDir,
      fileConfiguration.subdirectories.profilePhoto.path,
      user.profile_image_file,
    );

    if (!fs.existsSync(finalFilePath)) {
      throw new BadRequestException('Profile photo file not found');
    }

    const fileContent = fs.readFileSync(finalFilePath);
    const base64Content = fileContent.toString('base64');
    const mimeType = `image/${path.extname(user.profile_image_file).substring(1)}`;
    const dataUrl = `data:${mimeType};base64,${base64Content}`;

    return new ResponseDto<string>({
      data: dataUrl,
      message: 'Profile photo retrieved successfully',
    });
  }
}
