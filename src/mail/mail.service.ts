import { IForgotPasswordJob } from '@/common/interfaces/job.interface';
import { AllConfigType } from '@/config/config.type';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { readFile } from 'fs/promises';
import Handlebars from 'handlebars';
import { join } from 'path';

@Injectable()
export class MailService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly mailerService: MailerService,
  ) {}

  async sendTrialInterest(data: {
    recordId: string;
    trialId: string;
    trialName: string;
    recipient: string;
    contact: { name: string; email: string; phone: string };
  }) {
    // Plain text avoids interpreting participant input as email HTML.
    await this.mailerService.sendMail({
      to: data.recipient,
      subject: `TrialeX: expression of interest – ${data.trialName.replace(/[\r\n]/g, ' ')}`,
      messageId: `<trial-interest-${data.recordId}@trialex>`,
      text: [
        'A participant has asked the study team to contact them about this trial.',
        `Trial: ${data.trialName}`,
        `Trial ID: ${data.trialId}`,
        `Request ID: ${data.recordId}`,
        `Name: ${data.contact.name}`,
        `Email: ${data.contact.email}`,
        `Phone: ${data.contact.phone}`,
        '',
        'This is an expression of interest only, not enrolment or informed consent.',
        'Please contact the participant, assess eligibility, obtain informed consent,',
        'and provide your confirmation to the TrialeX administrator before study access is enabled.',
      ].join('\n'),
    });
  }

  async sendEmailVerification(email: string, token: string) {
    const url = `${this.configService.get('app.url', { infer: true })}/api/v1/auth/verify/email?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Email Verification',
      template: 'email-verification',
      context: {
        email: email,
        url,
      },
    });
  }

  async sendEmailForgotPassword(data: IForgotPasswordJob) {
    // Resend SMTP credentials already contain its API key. Use HTTPS for
    // recovery mail so deployments do not depend on outbound SMTP ports.
    const host = this.configService.get('mail.host', { infer: true });
    if (host?.trim().toLowerCase() === 'smtp.resend.com') {
      await this.sendRecoveryViaResend(data);
      return;
    }

    await this.mailerService.sendMail({
      to: data.email,
      subject: 'Reset Password',
      template: 'forgot-password',
      context: {
        email: data.email,
        otp: data.otp,
        year: new Date().getFullYear(),
      },
    });
  }

  private async sendRecoveryViaResend(data: IForgotPasswordJob) {
    const apiKey = this.configService.get('mail.password', { infer: true });
    const sender = this.configService.get('mail.defaultEmail', { infer: true });
    if (!apiKey || !sender) {
      throw Object.assign(new Error('Resend mail configuration is missing'), {
        code: 'MAIL_CONFIG_ERROR',
      });
    }
    const name = this.configService.get('mail.defaultName', { infer: true });
    const template = await readFile(
      join(__dirname, 'templates', 'forgot-password.hbs'),
      'utf8',
    );
    const html = Handlebars.compile(template, { strict: true })({
      email: data.email,
      otp: data.otp,
      year: new Date().getFullYear(),
    });
    try {
      const response = await axios.post<{ id?: string }>(
        'https://api.resend.com/emails',
        {
          from: name ? `${name.replace(/[\r\n"]/g, '')} <${sender}>` : sender,
          to: [data.email],
          subject: 'Reset Password',
          html,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 15000,
          maxRedirects: 0,
        },
      );
      if (!response.data?.id) {
        throw new Error('Invalid email delivery response');
      }
    } catch (error: unknown) {
      // Axios errors include the Authorization header and message body (OTP).
      // Never pass them to the exception logger or API response.
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;
      const networkCode = axios.isAxiosError(error) ? error.code : undefined;
      const safeCodes = [
        'ETIMEDOUT',
        'ECONNABORTED',
        'ENOTFOUND',
        'ECONNREFUSED',
        'EAI_AGAIN',
      ];
      throw Object.assign(new Error('Resend email delivery failed'), {
        code:
          networkCode && safeCodes.includes(networkCode)
            ? networkCode
            : 'RESEND_API_ERROR',
        responseCode: status,
      });
    }
  }
}
