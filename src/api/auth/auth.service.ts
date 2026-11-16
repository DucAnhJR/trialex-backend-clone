import { BaseUserResDto } from '@/api/users/dto/base-user.res.dto';
import { User, UserDocument } from '@/api/users/schemas/user.schema';
import { ResponseNoDataDto } from '@/common/dto/response/response-no-data.dto';
import { ResponseDto } from '@/common/dto/response/response.dto';
import { OTP_VERIFIED_FLAG_TTL } from '@/constants/app.constant';
import { CacheKey } from '@/constants/cache.constant';
import { ErrorCode } from '@/constants/error-code.constant';
import { JobName, QueueName } from '@/constants/job.constant';
import { ValidationException } from '@/exceptions/validation.exception';
import { MailService } from '@/mail/mail.service';
import { SmsService } from '@/sms/sms.service';
import { createCacheKey } from '@/utils/cache.util';
import { hashPassword, verifyPassword } from '@/utils/password.util';
import { InjectQueue } from '@nestjs/bullmq';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
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
import { SignUpDto } from './dto/sign-up.dto';
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
    private readonly mailService: MailService,
    private readonly chatService: ChatService,
  ) {}

  private recoveryDigest(value: string, key: string): string {
    return crypto.createHmac('sha256', key).update(value).digest('hex');
  }

  private async sendEmailRecovery(email: string): Promise<ResponseNoDataDto> {
    if (!email?.trim()) throw new BadRequestException('Email is required');
    const user = await this.userModel.findOne({
      email: email?.trim().toLowerCase(),
    });
    const generic = new ResponseNoDataDto({
      message: 'If the email is registered, an OTP has been sent to it',
    });
    if (!user) return generic;
    const now = new Date();
    const otp = crypto.randomInt(10000, 100000).toString();
    const otpHash = await hashPassword(otp);
    const claimed = await this.userModel.findOneAndUpdate(
      {
        _id: user._id,
        $or: [
          { 'passwordRecovery.resendAfter': { $exists: false } },
          { 'passwordRecovery.resendAfter': { $lte: now } },
        ],
      },
      {
        $set: {
          passwordRecovery: {
            otpHash,
            expiresAt: new Date(now.getTime() + 600000),
            resendAfter: new Date(now.getTime() + 30000),
            attemptsLeft: 5,
          },
        },
      },
    );
    if (!claimed)
      throw new HttpException(
        'Please wait 30 seconds before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    try {
      await this.mailService.sendEmailForgotPassword({
        email: user.email,
        otp,
      });
    } catch {
      await this.userModel.updateOne(
        { _id: user._id, 'passwordRecovery.otpHash': otpHash },
        { $unset: { passwordRecovery: 1 } },
      );
      throw new ServiceUnavailableException(
        'Unable to send verification email. Please try again later.',
      );
    }
    return generic;
  }

  private async verifyEmailRecovery(
    email: string,
    otp: string,
  ): Promise<ResponseDto<{ resetToken: string }>> {
    if (!email?.trim())
      throw new UnauthorizedException('Invalid or expired OTP');
    // Consume an attempt atomically so parallel requests cannot bypass the limit.
    const user = await this.userModel
      .findOneAndUpdate(
        {
          email: email?.trim().toLowerCase(),
          'passwordRecovery.expiresAt': { $gt: new Date() },
          'passwordRecovery.attemptsLeft': { $gt: 0 },
          'passwordRecovery.otpHash': { $exists: true },
        },
        { $inc: { 'passwordRecovery.attemptsLeft': -1 } },
      )
      .select('+passwordRecovery');
    const digest = user?.passwordRecovery?.otpHash;
    if (
      !user ||
      !digest ||
      !/^\d{5}$/.test(otp) ||
      !(await verifyPassword(otp, digest))
    ) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const result = await this.userModel.updateOne(
      {
        _id: user._id,
        'passwordRecovery.otpHash': digest,
        'passwordRecovery.expiresAt': { $gt: new Date() },
      },
      {
        $set: {
          'passwordRecovery.tokenHash': this.recoveryDigest(
            resetToken,
            user.password,
          ),
          'passwordRecovery.verifiedUntil': new Date(Date.now() + 300000),
        },
        $unset: {
          'passwordRecovery.otpHash': 1,
          'passwordRecovery.expiresAt': 1,
          'passwordRecovery.attemptsLeft': 1,
        },
      },
    );
    if (result.modifiedCount !== 1)
      throw new UnauthorizedException('Invalid or expired OTP');
    return new ResponseDto({
      data: { resetToken },
      message: 'OTP verified successfully',
    });
  }

  private async resetEmailPassword(
    dto: ResetPasswordDto,
  ): Promise<ResponseNoDataDto> {
    if (
      !dto.email?.trim() ||
      !dto.resetToken ||
      !/^[a-f0-9]{64}$/.test(dto.resetToken)
    )
      throw new UnauthorizedException('OTP not verified or expired');
    const user = await this.userModel.findOne({
      email: dto.email?.trim().toLowerCase(),
    });
    if (!user) throw new UnauthorizedException('OTP not verified or expired');
    const password = await hashPassword(dto.newPassword);
    // Update the password and consume the token in the same MongoDB operation.
    const result = await this.userModel.updateOne(
      {
        _id: user._id,
        password: user.password,
        'passwordRecovery.tokenHash': this.recoveryDigest(
          dto.resetToken,
          user.password,
        ),
        'passwordRecovery.verifiedUntil': { $gt: new Date() },
      },
      { $set: { password }, $unset: { passwordRecovery: 1 } },
    );
    if (result.modifiedCount !== 1)
      throw new UnauthorizedException('OTP not verified or expired');
    return new ResponseNoDataDto({ message: 'Password reset successfully' });
  }

  async verifyOtpUnified(
    dto: VerifyOtpDto,
  ): Promise<ResponseNoDataDto | ResponseDto<{ resetToken: string }>> {
    if (dto.method === 'email')
      return this.verifyEmailRecovery(dto.email, dto.otp);
    const { otp, phone_number } = dto;

    const filter = { 'information.phone_number': phone_number };

    const user = await this.userModel.findOne(filter);
    if (!user) throw new ValidationException(ErrorCode.E003);

    const isValid = await this.smsService.createVerificationCheck(
      phone_number,
      otp,
    );
    if (!isValid) throw new UnauthorizedException('Invalid or expired OTP');

    await this.cacheManager.store.set(
      createCacheKey(CacheKey.OTP_VERIFIED, user.id),
      true,
      ms(OTP_VERIFIED_FLAG_TTL),
    );

    return new ResponseNoDataDto({ message: 'OTP verified successfully' });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<ResponseNoDataDto> {
    if (dto.method === 'email') return this.resetEmailPassword(dto);
    const { phone_number, newPassword } = dto;

    const filter = { 'information.phone_number': phone_number };

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
    if (dto.method === 'email') return this.sendEmailRecovery(dto.email);
    const filter = { 'information.phone_number': dto.phone_number };

    const user = await this.userModel.findOne(filter);
    if (user) {
      const otp = crypto.randomInt(10000, 99999).toString();
      const TTL = '10m';
      await this.cacheManager.store.set(
        createCacheKey(CacheKey.FORGOT_PASSWORD_OTP, user.id),
        otp,
        ms(TTL),
      );

      await this.smsQueue.add(
        JobName.SMS_VERIFICATION,
        { phoneNumber: dto.phone_number },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
        },
      );
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

  async checkEmail(email: string): Promise<ResponseDto<{ exists: boolean }>> {
    const normalizedEmail = email.trim().toLowerCase();
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exists = !!(await this.userModel.exists({
      email: { $regex: `^${escapedEmail}$`, $options: 'i' },
    }));
    return new ResponseDto({
      data: { exists },
      message: 'Email checked successfully',
    });
  }

  async signUp(dto: SignUpDto): Promise<ResponseDto<BaseUserResDto>> {
    const { email, password, information } = dto;

    const existingUser = await this.userModel.findOne({ email }).lean();

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await this.userModel.create({
      email,
      password: hashedPassword,
      information,
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

    const user = await this.userModel.findOne({ email }).populate({
      path: 'trial_records',
      select:
        '_id trial_id is_approved is_active informed_consent_obtained eligibility_confirmed interest_registered_at contact_sharing_status contact_shared_at createdAt updatedAt has_questionnaire_schedule trial_status onboarding_status sign_up_date approval_date',
    });

    if (!user) {
      return new ResponseDto<SignInResDto>({
        data: null,
        success: false,
        message: 'Invalid email or password',
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
    // The app must be able to restore a pending enrolment after a reload. Only
    // populate the safe state needed by the participant UI; onboarding answers
    // and other sensitive record data remain excluded.
    const user = await this.userModel
      .findOne({ _id: userId })
      .populate({
        path: 'trial_records',
        select:
          '_id trial_id is_approved is_active informed_consent_obtained eligibility_confirmed interest_registered_at contact_sharing_status contact_shared_at createdAt updatedAt has_questionnaire_schedule trial_status onboarding_status sign_up_date approval_date',
      })
      .lean();

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
