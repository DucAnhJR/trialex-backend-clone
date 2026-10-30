import {
  TrialsRecord,
  TrialsRecordDocument,
} from '@/api/trials/schemas/trials-record.schema';
import { Trials, TrialsDocument } from '@/api/trials/schemas/trials.schema';
import {
  IForgotPasswordJob,
  IVerifyEmailJob,
} from '@/common/interfaces/job.interface';
import { JobName, QueueName } from '@/constants/job.constant';
import { MailService } from '@/mail/mail.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { isEmail } from 'class-validator';
import { Model } from 'mongoose';

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);

  private registrationRetry?: ReturnType<typeof setTimeout>;
  private destroyed = false;

  constructor(
    private readonly mailService: MailService,
    @InjectModel(TrialsRecord.name)
    private readonly records: Model<TrialsRecordDocument>,
    @InjectQueue(QueueName.EMAIL) private readonly queue: Queue,
    @InjectModel(Trials.name) private readonly trials: Model<TrialsDocument>,
  ) {}

  onModuleInit() {
    // Queue availability must never prevent the HTTP API from starting.
    // Pending contact requests remain in the MongoDB outbox during an outage.
    if (process.env.TRIAL_INTEREST_DISPATCH_ENABLED === 'false') return;
    void this.registerDispatcher();
  }

  onModuleDestroy() {
    this.destroyed = true;
    if (this.registrationRetry) clearTimeout(this.registrationRetry);
  }

  private async registerDispatcher(): Promise<void> {
    try {
      await this.queue.add(
        JobName.DISPATCH_TRIAL_INTEREST,
        {},
        {
          jobId: 'trial-interest-outbox',
          repeat: { every: 60000 },
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    } catch {
      // Redis errors can contain authentication arguments. Log no raw exception.
      this.logger.warn(
        'Trial-interest dispatcher unavailable; pending requests are retained. Retrying in 60 seconds.',
      );
      if (!this.destroyed) {
        this.registrationRetry = setTimeout(() => {
          void this.registerDispatcher();
        }, 60000);
        this.registrationRetry.unref();
      }
    }
  }

  async dispatchTrialInterests(): Promise<void> {
    if (process.env.TRIAL_INTEREST_DISPATCH_ENABLED === 'false') return;
    const pending = await this.records
      .find({
        contact_sharing_status: { $in: ['pending', 'awaiting_contact'] },
        trial_status: 'pending',
        interest_registered_at: { $ne: null },
      })
      .select('+interest_contact +interest_recipient')
      .sort({ contact_delivery_attempted_at: 1 })
      .limit(100);
    let failures = 0;
    for (const record of pending) {
      try {
        // Recheck withdrawal/decline immediately before delivery.
        const stillPending = await this.records.exists({
          _id: record._id,
          contact_sharing_status: { $in: ['pending', 'awaiting_contact'] },
          trial_status: 'pending',
        });
        if (!stillPending) continue;
        await this.records.updateOne(
          { _id: record._id },
          { $set: { contact_delivery_attempted_at: new Date() } },
        );
        if (!record.interest_contact)
          throw new Error('Incomplete contact snapshot');
        let recipient = record.interest_recipient;
        if (!recipient || !isEmail(recipient)) {
          // Resolve a missing recipient only after the trial has been configured.
          // Never invent a destination or replace a previously valid snapshot.
          const trial = await this.trials
            .findById(record.trial_id)
            .select('contact')
            .lean();
          recipient = trial?.contact?.find((contact) =>
            isEmail(contact.email || ''),
          )?.email;
          if (!recipient) {
            await this.records.updateOne(
              {
                _id: record._id,
                trial_status: 'pending',
                contact_sharing_status: {
                  $in: ['pending', 'awaiting_contact'],
                },
              },
              { $set: { contact_sharing_status: 'awaiting_contact' } },
            );
            continue;
          }
          const claimed = await this.records.updateOne(
            {
              _id: record._id,
              trial_status: 'pending',
              interest_recipient: record.interest_recipient || null,
              contact_sharing_status: { $in: ['pending', 'awaiting_contact'] },
            },
            {
              $set: {
                interest_recipient: recipient,
                contact_sharing_status: 'pending',
              },
            },
          );
          // A concurrent withdrawal or recipient resolution wins over this attempt.
          if (claimed.matchedCount !== 1) continue;
        }
        await this.mailService.sendTrialInterest({
          recordId: record._id.toString(),
          trialId: record.trial_id.toString(),
          trialName: record.interest_trial_name || record.trial_id.toString(),
          recipient,
          contact: record.interest_contact,
        });
        await this.records.updateOne(
          { _id: record._id, contact_shared_at: null },
          {
            $set: {
              contact_sharing_status: 'shared',
              contact_shared_at: new Date(),
            },
          },
        );
      } catch {
        // No contact details or transport errors containing recipients in logs.
        this.logger.error(
          `Trial interest delivery failed for record ${record._id}`,
        );
        failures += 1;
      }
    }
    if (failures)
      throw new Error(`${failures} trial interest deliveries need retry`);
  }

  async sendEmailVerification(data: IVerifyEmailJob): Promise<void> {
    this.logger.debug(`Sending email verification to ${data.email}`);
    await this.mailService.sendEmailVerification(data.email, data.token);
  }

  async sendEmailForgotPassword(data: IForgotPasswordJob): Promise<void> {
    this.logger.debug(`Sending forgot password email to ${data.email}`);
    await this.mailService.sendEmailForgotPassword(data);
  }
}
