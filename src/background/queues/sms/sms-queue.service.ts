import { IVerifySmsJob } from '@/common/interfaces/job.interface';
import { SmsService } from '@/sms/sms.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsQueueService {
  private readonly logger = new Logger(SmsQueueService.name);

  constructor(private readonly smsService: SmsService) {}

  async sendSmsVerification(data: IVerifySmsJob): Promise<void> {
    this.logger.debug(`Sending SMS verification to ${data.phoneNumber}`);
    await this.smsService.createVerification(data.phoneNumber, 'sms');
  }
}
