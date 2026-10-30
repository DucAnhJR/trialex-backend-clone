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
