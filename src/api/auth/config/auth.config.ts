import validateConfig from '@/utils/validate-config';
import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import process from 'node:process';
import { AuthConfig } from './auth-config.type';

class AuthVariablesValidator {
  @IsString()
  @IsOptional()
  AUTH_JWT_SECRET: string;

  @IsString()
  @IsOptional()
  AUTH_JWT_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsOptional()
  AUTH_JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  AUTH_JWT_REFRESH_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsOptional()
  AUTH_FORGOT_SECRET: string;

  @IsString()
  @IsOptional()
  AUTH_FORGOT_TOKEN_EXPIRES_IN: string;

  @IsString()
  @IsOptional()
  AUTH_JWT_AUDIENCE: string;

  @IsString()
  @IsOptional()
  AUTH_JWT_ISSUER: string;

  @IsString()
  @IsOptional()
  AUTH_OTP_TTL: string;
}

export default registerAs<AuthConfig>('auth', () => {
  console.log('Loading auth configuration...');

  validateConfig(process.env, AuthVariablesValidator);

  return {
    jwtSecret: process.env.AUTH_JWT_SECRET || 'jwt-secret',
    jwtExpiresIn: process.env.AUTH_JWT_TOKEN_EXPIRES_IN || '15m',
    jwtRefreshSecret: process.env.AUTH_JWT_REFRESH_SECRET || '',
    jwtRefreshExpiresIn: process.env.AUTH_JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
    jwtAudience: process.env.AUTH_JWT_AUDIENCE || 'teasernews',
    jwtIssuer: process.env.AUTH_JWT_ISSUER || 'teasernews',
    forgotSecret: process.env.AUTH_FORGOT_SECRET || 'jwt-forgot-secret',
    forgotTokenExpiresIn: process.env.AUTH_FORGOT_TOKEN_EXPIRES_IN || '15m',
    otpTTL: process.env.AUTH_OTP_TTL || '5m',
  };
});
