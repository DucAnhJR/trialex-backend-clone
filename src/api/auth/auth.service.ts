import { BaseUserResDto } from '@/api/users/dto/base-user.res.dto';
import { User, UserDocument } from '@/api/users/schemas/user.schema';
import { ResponseNoDataDto } from '@/common/dto/response/response-no-data.dto';
import { ResponseDto } from '@/common/dto/response/response.dto';
import {
  IEmailJob,
  IForgotPasswordJob,
} from '@/common/interfaces/job.interface';
import { OTP_VERIFIED_FLAG_TTL } from '@/constants/app.constant';
import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { SmsService } from '@/sms/sms.service';
import { createCacheKey } from '@/utils/cache.util';
import { hashPassword, verifyPassword } from '@/utils/password.util';
import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtVerifyOptions } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Cache } from 'cache-manager';
import { plainToInstance } from 'class-transformer';
import crypto from 'crypto';
import { Model, Types } from 'mongoose';
import ms from 'ms';
import { ChatService } from '../chat/chat.service';
import { VerifyUserDto } from '../users/dto/verify-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshReqDto } from './dto/refresh.req.dto';
import { RefreshResDto } from './dto/refresh.res.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignInResDto } from './dto/signin.res.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Session } from './schemas/session.schema';
import { Token } from './types';
import { JwtPayloadType } from './types/jwt-payload.type';
import { JwtRefreshPayloadType } from './types/jwt-refresh-payload.type';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    private readonly jwtService: JwtService,
    private configService: ConfigService,
    @InjectQueue(QueueName.SMS)
    private readonly smsQueue: Queue,
    private readonly smsService: SmsService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectQueue(QueueName.EMAIL)
    private readonly emailQueue: Queue<IEmailJob, any, string>,
    private readonly chatService: ChatService,
  ) {}

  async verifyOtpUnified(dto: VerifyOtpDto): Promise<ResponseNoDataDto> {
    const { method, otp, email, phone_number } = dto;

    const filter =
      method === 'email'
        ? { email }
        : { 'information.phone_number': phone_number };

    const user = await this.userModel.findOne(filter);
    if (!user) throw new ValidationException(ErrorCode.E003);

    if (method === 'email') {
      const cachedOtp = await this.cacheManager.store.get<string>(
        createCacheKey(CacheKey.FORGOT_PASSWORD_OTP, user.id),
      );
      if (!cachedOtp || cachedOtp !== otp) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }
    } else if (method === 'sms') {
      const isValid = await this.smsService.createVerificationCheck(
        phone_number,
        otp,
      );
      if (!isValid) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }
    }

    await this.cacheManager.store.set(
      createCacheKey(CacheKey.OTP_VERIFIED, user.id),
      true,
      ms(OTP_VERIFIED_FLAG_TTL),
    );

    return new ResponseNoDataDto({ message: 'OTP verified successfully' });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<ResponseNoDataDto> {
    const { method, email, phone_number, newPassword } = dto;

    const filter =
      method === 'email'
        ? { email }
        : { 'information.phone_number': phone_number };

    const user = await this.userModel.findOne(filter);
    if (!user) throw new ValidationException(ErrorCode.E003);

    const isOtpVerified = await this.cacheManager.store.get<boolean>(
      createCacheKey(CacheKey.OTP_VERIFIED, user.id),
    );
    if (!isOtpVerified) {
      throw new UnauthorizedException('OTP not verified or expired');
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    await this.cacheManager.store.del(
      createCacheKey(CacheKey.OTP_VERIFIED, user.id),
    );

    return new ResponseNoDataDto({ message: 'Password reset successfully' });
  }

  async forgotAndSendOtp(dto: ForgotPasswordDto): Promise<ResponseNoDataDto> {
    const filter =
      dto.method === 'email'
        ? { email: dto.email }
        : { 'information.phone_number': dto.phone_number };

    const user = await this.userModel.findOne(filter);
    if (user) {
      const otp = crypto.randomInt(10000, 99999).toString();
      const TTL = '10m';
      await this.cacheManager.store.set(
        createCacheKey(CacheKey.FORGOT_PASSWORD_OTP, user.id),
        otp,
        ms(TTL),
      );

      if (dto.method === 'email') {
        await this.emailQueue.add(
          JobName.EMAIL_FORGOT_PASSWORD,
          { email: user.email, otp } as IForgotPasswordJob,
          { attempts: 3, backoff: { type: 'exponential', delay: 60000 } },
        );
      } else if (dto.method === 'sms') {
        await this.smsQueue.add(
          JobName.SMS_VERIFICATION,
          {
            phoneNumber: dto.phone_number,
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 60000 },
          },
        );
      }
    }

    return new ResponseNoDataDto({
      message: `If the ${dto.method} is registered, an OTP has been sent to it`,
    });
  }

  async createSMS(phoneNumber: string): Promise<ResponseNoDataDto> {
    await this.smsQueue.add(JobName.SMS_VERIFICATION, {
      phoneNumber,
    });

    return new ResponseNoDataDto({
      message: 'SMS sent successfully',
    });
  }

  async verifyUser(dto: VerifyUserDto): Promise<ResponseNoDataDto> {
    const { email, phoneNumber, code } = dto;

    const user = await this.userModel.findOne({ email });

    if (!user) {
      return new ResponseNoDataDto({
        success: false,
        message: 'Verification Failed: User not found',
      });
    }

    const isValid = await this.smsService.createVerificationCheck(
      phoneNumber,
      code,
    );

    if (!isValid) {
      return new ResponseNoDataDto({
        success: false,
        message: 'Verification Failed: Invalid code',
      });
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      user._id,
      {
        $set: {
          phone_number_verified: true,
        },
      },
      { new: true },
    );

    if (updatedUser && !updatedUser.phone_number_verified) {
      return new ResponseNoDataDto({
        success: false,
        message: 'Verification Failed: Could not update user',
      });
    }

    return new ResponseNoDataDto({
      message: 'User verified successfully',
    });
  }

  async signUp(dto: LoginDto): Promise<ResponseDto<BaseUserResDto>> {
    const { email, password } = dto;

    const existingUser = await this.userModel.findOne({ email }).lean();

    if (existingUser) {
      return new ResponseDto<BaseUserResDto>({
        data: null,
        success: false,
        message: 'Email already in use',
      });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await this.userModel.create({
      email,
      password: hashedPassword,
    });

    return new ResponseDto<BaseUserResDto>({
      data: plainToInstance(BaseUserResDto, newUser, {
        excludeExtraneousValues: true,
      }),
      message: 'User registered successfully',
    });
  }

  async refreshToken(dto: RefreshReqDto): Promise<ResponseDto<RefreshResDto>> {
    const { sessionId, hash } = this.verifyRefreshToken(dto.refreshToken);

    const oldSession = await this.sessionModel
      .findOne({ _id: sessionId })
      .lean();

    if (!oldSession || oldSession.hash !== hash) {
      throw new UnauthorizedException('Invalid session');
    }

    const user = await this.userModel.findOne({ _id: oldSession.userId });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newHash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const newSession = await this.sessionModel.create({
      userId: user._id,
      hash: newHash,
    });

    await this.sessionModel.deleteOne({ _id: oldSession._id, hash });

    const token = await this.generateJwt({
      user,
      sessionId: newSession._id,
      hash: newSession.hash,
    });

    return new ResponseDto<RefreshResDto>({
      data: plainToInstance(RefreshResDto, token, {
        excludeExtraneousValues: true,
      }),
      message: 'Token refreshed successfully',
    });
  }

  async login(dto: LoginDto): Promise<ResponseDto<SignInResDto>> {
    const { email, password } = dto;

    const user = await this.userModel.findOne({ email });

    if (!user) {
      return new ResponseDto<SignInResDto>({
        data: null,
        success: false,
        message: 'Email not found',
      });
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return new ResponseDto<SignInResDto>({
        data: null,
        success: false,
        message: 'Invalid email or password',
      });
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionModel.create({
      userId: user._id,
      hash,
    });

    const token = await this.generateJwt({
      user,
      sessionId: session._id,
      hash,
    });

    const userDto = plainToInstance(BaseUserResDto, user, {
      excludeExtraneousValues: true,
    });

    const tokenGetStream = this.chatService.createToken(user._id);

    return new ResponseDto<SignInResDto>({
      data: {
        ...token,
        user: userDto,
        streamToken: tokenGetStream,
      },
      message: 'Login successful',
    });
  }

  async getMe(userId: Types.ObjectId): Promise<ResponseDto<BaseUserResDto>> {
    const user = await this.userModel.findOne({ _id: userId }).lean();

    if (!user) {
      return new ResponseDto<BaseUserResDto>({
        data: null,
        success: false,
        message: 'User not found',
      });
    }

    return new ResponseDto<BaseUserResDto>({
      data: plainToInstance(BaseUserResDto, user, {
        excludeExtraneousValues: true,
      }),
      message: 'Retrieved user successfully',
    });
  }

  async generateJwt(data: {
    user: UserDocument;
    sessionId: Types.ObjectId;
    hash: string;
  }): Promise<Token> {
    const tokenExpiresIn = this.configService.getOrThrow('auth.jwtExpiresIn', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const [accessToken, refreshToken] = await Promise.all([
      await this.jwtService.signAsync(
        {
          id: data.user.id,
          email: data.user.email,
          typ: 'access',
          sessionId: data.sessionId,
        },
        {
          algorithm: 'RS256',
          audience: 'access',
          expiresIn: tokenExpiresIn,
        },
      ),
      await this.jwtService.signAsync(
        {
          typ: 'refresh',
          sessionId: data.sessionId,
          hash: data.hash,
        },
        {
          algorithm: 'RS256',
          audience: 'refresh',
          expiresIn: this.configService.getOrThrow('auth.jwtRefreshExpiresIn', {
            infer: true,
          }),
        },
      ),
    ]);

    return { accessToken, refreshToken, tokenExpires: +tokenExpires } as Token;
  }

  async verifyAccessToken(token: string): Promise<JwtPayloadType> {
    let payload: JwtPayloadType;

    try {
      const options: JwtVerifyOptions = {
        algorithms: ['RS256'],
        audience: 'access',
      };
      payload = this.jwtService.verify(token, options);

      if (payload.typ !== 'access') {
        throw new UnauthorizedException('TokenInvalid');
      }
    } catch {
      throw new UnauthorizedException('TokenInvalid');
    }

    const session = await this.sessionModel.findOne({
      _id: payload.sessionId,
    });

    if (!session) {
      throw new UnauthorizedException('Session invalid or expired');
    }

    return payload;
  }

  private verifyRefreshToken(token: string): JwtRefreshPayloadType {
    try {
      const options: JwtVerifyOptions = {
        algorithms: ['RS256'],
        audience: 'refresh',
      };
      const payload = this.jwtService.verify<JwtRefreshPayloadType>(
        token,
        options,
      );
      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException('TokenInvalid');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('TokenInvalid');
    }
  }
}
