import { registerAs } from '@nestjs/config';

import { IsNotEmpty, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { SmsConfig } from './sms-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  ACCOUNT_SID: string;

  @IsString()
  @IsNotEmpty()
  ACCOUNT_AUTH_TOKEN: string;

  @IsString()
  @IsNotEmpty()
  VERIFY_SERVICE_SID: string;
}

export default registerAs<SmsConfig>('sms', () => {
  console.info(`Register SmsConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    accountSid: process.env.ACCOUNT_SID,
    authToken: process.env.ACCOUNT_AUTH_TOKEN,
    verifyServiceSid: process.env.VERIFY_SERVICE_SID,
  };
});
