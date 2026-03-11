import validateConfig from '@/utils/validate-config';
import { registerAs } from '@nestjs/config';
import { IsString, ValidateIf } from 'class-validator';
import { DatabaseConfig } from './database-config.type';

class EnvironmentVariablesValidator {
  @ValidateIf((envValues) => envValues.DATABASE_URL)
  @IsString()
  DATABASE_URL: string;

  @ValidateIf((envValues) => envValues.DATABASE_TLS_ENABLED)
  @IsString()
  DATABASE_TLS_ENABLED: string;

  @ValidateIf((envValues) => envValues.DATABASE_SSL_ENABLED)
  @IsString()
  DATABASE_SSL_ENABLED: string;
}

export default registerAs<DatabaseConfig>('database', () => {
  console.info(`Register DatabaseConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    url: process.env.DATABASE_URL,
    tlsEnabled: process.env.DATABASE_TLS_ENABLED === 'true',
    sslEnabled: process.env.DATABASE_SSL_ENABLED === 'true',
  };
});
