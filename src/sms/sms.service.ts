import { AllConfigType } from '@/config/config.type';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import TwilioClient from 'twilio/lib/rest/Twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilio: TwilioClient;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const accountSid = this.configService.getOrThrow('sms.accountSid', {
      infer: true,
    });
    const authToken = this.configService.getOrThrow('sms.authToken', {
      infer: true,
    });

    if (!accountSid || !authToken) {
      throw new Error('Twilio accountSid and authToken must be provided');
    }

    this.twilio = twilio(accountSid, authToken);
  }

  async createVerification(target: string, channel = 'sms') {
    const serviceSid = this.configService.get('sms.verifyServiceSid', {
      infer: true,
    });

    try {
      const verification = await this.twilio.verify.v2
        .services(serviceSid)
        .verifications.create({
          to: target,
          channel,
        });

      this.logger.debug(
        `Twilio Verify sent: sid=${verification.sid}, to=${this.maskPhone(target)}, channel=${channel}`,
      );
      return verification;
    } catch (error) {
      this.logger.error(
        `TWILIO VERIFICATION ERROR: ${error.message}`,
        error.stack,
        'SmsService',
      );
      throw error;
    }
  }

  async createVerificationCheck(
    target: string,
    code: string,
  ): Promise<boolean> {
    const serviceSid = this.configService.getOrThrow('sms.verifyServiceSid', {
      infer: true,
    });
    try {
      const verificationCheck = await this.twilio.verify.v2
        .services(serviceSid)
        .verificationChecks.create({ to: target, code });
      this.logger.debug(
        `Twilio Verify check: sid=${verificationCheck.sid}, to=${this.maskPhone(target)}, status=${verificationCheck.status}`,
      );
      return verificationCheck.status === 'approved';
    } catch (error) {
      const maskedTarget = this.maskPhone(target);
      const sanitizedMessage =
        typeof error?.message === 'string'
          ? error.message.replace(/\d/g, '*')
          : 'Unknown Twilio verification error';
      this.logger.error(
        `TWILIO VERIFICATION CHECK ERROR for ${maskedTarget}: ${sanitizedMessage}`,
        error.stack,
        'SmsService',
      );
      throw error;
    }
  }

  private maskPhone(input: string): string {
    if (!input) return '';
    const digits = input.replace(/\D/g, '');
    return digits.length <= 4
      ? '****'
      : `${input.slice(0, 2)}****${input.slice(-2)}`;
  }
}
