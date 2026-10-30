import { Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { EmailQueueService } from './email-queue.service';

const record = {
  _id: new Types.ObjectId(),
  trial_id: new Types.ObjectId(),
  interest_contact: {
    name: 'Test Person',
    email: 'person@example.org',
    phone: '+84912345678',
  },
  interest_recipient: 'study@example.org',
};
function setup(pendingRecords: unknown[] = [record]) {
  const records = {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(pendingRecords),
        }),
      }),
    }),
    exists: jest.fn().mockResolvedValue(true),
    updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
  };
  const mail = { sendTrialInterest: jest.fn() };
  const queue = { add: jest.fn() };
  const contactLookup = jest.fn().mockResolvedValue({ contact: [] });
  const trials = {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: contactLookup }),
    }),
  };
  return {
    records,
    mail,
    queue,
    trials,
    contactLookup,
    service: new EmailQueueService(
      mail as never,
      records as never,
      queue as never,
      trials as never,
    ),
  };
}
describe('Trial interest durable contact outbox', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('can pause dispatch without losing or sending pending requests', async () => {
    const previous = process.env.TRIAL_INTEREST_DISPATCH_ENABLED;
    process.env.TRIAL_INTEREST_DISPATCH_ENABLED = 'false';
    try {
      const { service, queue, records, mail } = setup();
      service.onModuleInit();
      await service.dispatchTrialInterests();
      expect(queue.add).not.toHaveBeenCalled();
      expect(records.find).not.toHaveBeenCalled();
      expect(mail.sendTrialInterest).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined)
        delete process.env.TRIAL_INTEREST_DISPATCH_ENABLED;
      else process.env.TRIAL_INTEREST_DISPATCH_ENABLED = previous;
    }
  });

  it('starts HTTP lifecycle without waiting for an unavailable Redis queue', () => {
    const { service, queue } = setup();
    queue.add.mockReturnValue(new Promise(() => {}));
    expect(service.onModuleInit()).toBeUndefined();
    service.onModuleDestroy();
  });

  it('handles the Redis quota error and retries without leaking authentication data', async () => {
    jest.useFakeTimers();
    const { service, queue } = setup();
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    queue.add.mockRejectedValueOnce(
      new Error(
        'ERR max requests limit exceeded with private authentication arguments',
      ),
    );
    expect(service.onModuleInit()).toBeUndefined();
    await Promise.resolve();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('pending requests are retained'),
    );
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('private authentication'),
    );
    await jest.advanceTimersByTimeAsync(60000);
    expect(queue.add).toHaveBeenCalledTimes(2);
    service.onModuleDestroy();
  });

  it('cancels retry on shutdown', async () => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const { service, queue } = setup();
    queue.add.mockRejectedValue(new Error('Redis unavailable'));
    service.onModuleInit();
    await Promise.resolve();
    service.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(120000);
    expect(queue.add).toHaveBeenCalledTimes(1);
  });
  it('schedules recovery without storing participant details in Redis jobs', async () => {
    const { service, queue } = setup();
    await service.onModuleInit();
    expect(queue.add).toHaveBeenCalledWith(
      'dispatch-trial-interest',
      {},
      expect.objectContaining({ repeat: { every: 60000 } }),
    );
  });
  it('marks shared only after successful delivery and shares only the contact snapshot', async () => {
    const { service, mail, records, trials } = setup();
    await service.dispatchTrialInterests();
    expect(trials.findById).not.toHaveBeenCalled();
    expect(mail.sendTrialInterest).toHaveBeenCalledWith({
      recordId: record._id.toString(),
      trialId: record.trial_id.toString(),
      trialName: record.trial_id.toString(),
      recipient: record.interest_recipient,
      contact: record.interest_contact,
    });
    expect(records.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: record._id }),
      {
        $set: {
          contact_sharing_status: 'shared',
          contact_shared_at: expect.any(Date),
        },
      },
    );
  });
  it('preserves pending delivery when SMTP fails, allowing a retry', async () => {
    const { service, mail, records } = setup();
    mail.sendTrialInterest.mockRejectedValue(new Error('SMTP down'));
    await expect(service.dispatchTrialInterests()).rejects.toThrow(
      'need retry',
    );
    expect(records.updateOne).not.toHaveBeenCalledWith(expect.anything(), {
      $set: expect.objectContaining({ contact_sharing_status: 'shared' }),
    });
  });
  it('keeps a request waiting when the study has no email, without sending or failing', async () => {
    const { service, records, mail } = setup([
      { ...record, interest_recipient: undefined },
    ]);
    await expect(service.dispatchTrialInterests()).resolves.toBeUndefined();
    expect(mail.sendTrialInterest).not.toHaveBeenCalled();
    expect(records.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: record._id }),
      { $set: { contact_sharing_status: 'awaiting_contact' } },
    );
    expect(records.updateOne).not.toHaveBeenCalledWith(expect.anything(), {
      $set: expect.objectContaining({ contact_sharing_status: 'shared' }),
    });
  });

  it('resumes delivery after a missing study email is configured and saves the destination', async () => {
    const { service, records, mail, contactLookup } = setup([
      { ...record, interest_recipient: undefined },
    ]);
    contactLookup.mockResolvedValue({
      contact: [{ email: 'coordinator@example.org' }],
    });
    await service.dispatchTrialInterests();
    expect(records.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        interest_recipient: null,
        trial_status: 'pending',
      }),
      {
        $set: {
          interest_recipient: 'coordinator@example.org',
          contact_sharing_status: 'pending',
        },
      },
    );
    expect(mail.sendTrialInterest).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: 'coordinator@example.org' }),
    );
    expect(records.updateOne).toHaveBeenCalledWith(expect.anything(), {
      $set: {
        contact_sharing_status: 'shared',
        contact_shared_at: expect.any(Date),
      },
    });
  });

  it('does not send if the request changes while resolving a missing recipient', async () => {
    const { service, records, mail, contactLookup } = setup([
      { ...record, interest_recipient: undefined },
    ]);
    contactLookup.mockResolvedValue({
      contact: [{ email: 'coordinator@example.org' }],
    });
    records.updateOne
      .mockResolvedValueOnce({ matchedCount: 1 })
      .mockResolvedValueOnce({ matchedCount: 0 });
    await service.dispatchTrialInterests();
    expect(mail.sendTrialInterest).not.toHaveBeenCalled();
  });

  it('does not share after the request was withdrawn or declined before delivery', async () => {
    const { service, mail, records } = setup();
    records.exists.mockResolvedValue(false);
    await service.dispatchTrialInterests();
    expect(mail.sendTrialInterest).not.toHaveBeenCalled();
  });
});
