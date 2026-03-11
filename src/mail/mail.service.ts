import { IForgotPasswordJob } from '@/common/interfaces/job.interface';
import { AllConfigType } from '@/config/config.type';
import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    private readonly mailerService: MailerService,
  ) {}

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
}
