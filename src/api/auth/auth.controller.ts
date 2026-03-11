import { BaseUserResDto } from '@/api/users/dto/base-user.res.dto';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth, ApiPublic } from '@/decorators/http.decorators';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { VerifyUserDto } from '../users/dto/verify-user.dto';
import { AuthService } from './auth.service';
import { CreateSmsDto } from './dto/create-sms.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshReqDto } from './dto/refresh.req.dto';
import { RefreshResDto } from './dto/refresh.res.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiPublic({
    summary: 'Login',
    description: 'Public endpoint for user login',
    type: BaseUserResDto,
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('reset-password')
  @ApiPublic({
    summary: 'Reset Password',
    description: 'Public endpoint to reset password',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('forgot-password')
  @ApiPublic({
    summary: 'Forgot Password',
    description: 'Public endpoint to initiate password reset',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotAndSendOtp(dto);
  }

  @Post('verify-otp')
  @ApiPublic({
    summary: 'Verify OTP',
    description: 'Public endpoint to verify OTP',
  })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtpUnified(dto);
  }

  @Post('refresh-token')
  @ApiPublic({
    summary: 'Refresh access token',
    description: 'Get new access token using refresh token',
    type: RefreshResDto,
  })
  async refreshToken(@Body() dto: RefreshReqDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('sign-up')
  @ApiPublic({
    summary: 'Sign Up',
    description: 'Public endpoint for user registration',
    type: BaseUserResDto,
  })
  async signUp(@Body() dto: LoginDto) {
    return this.authService.signUp(dto);
  }

  @Get('me')
  @ApiAuth({
    summary: 'Get Current User',
    description: 'Retrieve information about the currently authenticated user',
    type: BaseUserResDto,
  })
  getMe(@CurrentUser('id') userId: Types.ObjectId) {
    return this.authService.getMe(userId);
  }

  @Post('createSMS')
  @ApiPublic({
    summary: 'Create SMS',
    description: 'Public endpoint to create SMS',
  })
  async createSMS(@Body() dto: CreateSmsDto) {
    return this.authService.createSMS(dto.phoneNumber);
  }

  @Post('verify')
  @ApiPublic({
    summary: 'Verify User',
    description: 'Public endpoint to verify user',
  })
  async verifyUser(@Body() dto: VerifyUserDto) {
    return this.authService.verifyUser(dto);
  }
}
