import { TrialStatus } from '@/database/enums/trials.enum';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { ApproveTrialEnrolmentDto } from '../participant-experience/dto/submit-trial-onboarding.dto';
import { ParticipantExperienceService } from '../participant-experience/participant-experience.service';
import {
  INTEREST_COPY_VERSION,
  RegisterInterestDto,
} from './dto/register-interest.dto';
import { TrialsRecordResDto } from './dto/trials-record.res.dto';
import { TrialsResDto } from './dto/trials.res.dto';
import { canAccessStudy } from './trial-access';
import { TrialsService } from './trials.service';

const acknowledgements = {
  copy_version: INTEREST_COPY_VERSION,
  trial_information_read: true,
  interest_is_not_enrolment: true,
  study_team_obtains_consent: true,
  share_contact_details: true,
};
const confirmation = {
  informed_consent_obtained: true,
  eligibility_confirmed: true,
  study_team_confirmed_at: '2025-01-01T00:00:00.000Z',
  study_team_confirmation_reference: 'Study team letter #1',
};
const userId = new Types.ObjectId();
const trialId = new Types.ObjectId();
const approved = {
  is_approved: true,
  is_active: true,
  informed_consent_obtained: true,
  eligibility_confirmed: true,
  trial_status: TrialStatus.IN_PROGRESS,
};
const makeService = (
  records: unknown,
  trial: unknown = {},
  user: unknown = {},
) =>
  new TrialsService(
    trial as never,
    records as never,
    user as never,
    {} as never,
    {} as never,
  );

describe('Registration of interest contract and access', () => {
  it.each([
    'trial_information_read',
    'interest_is_not_enrolment',
    'study_team_obtains_consent',
    'share_contact_details',
  ])(
    'rejects a missing or false %s, including direct service calls',
    async (key) => {
      for (const value of [undefined, false, 'true']) {
        const body = { ...acknowledgements, [key]: value };
        expect(
          await validate(plainToInstance(RegisterInterestDto, body)),
        ).not.toHaveLength(0);
        await expect(
          makeService({}).signUpTrials(
            trialId,
            userId,
            body as RegisterInterestDto,
          ),
        ).rejects.toThrow('Confirm all four');
      }
    },
  );
  it('rejects obsolete copy and approval without both confirmations', async () => {
    expect(
      await validate(
        plainToInstance(RegisterInterestDto, {
          ...acknowledgements,
          copy_version: 'old',
        }),
      ),
    ).not.toHaveLength(0);
    for (const key of ['informed_consent_obtained', 'eligibility_confirmed']) {
      expect(
        await validate(
          plainToInstance(ApproveTrialEnrolmentDto, {
            ...confirmation,
            [key]: false,
          }),
        ),
      ).not.toHaveLength(0);
    }
  });
  it('never treats interest, legacy approval or one confirmation as study access', () => {
    expect(canAccessStudy(approved)).toBe(true);
    for (const field of [
      'is_approved',
      'is_active',
      'informed_consent_obtained',
      'eligibility_confirmed',
    ]) {
      expect(canAccessStudy({ ...approved, [field]: false })).toBe(false);
      expect(canAccessStudy({ ...approved, [field]: undefined })).toBe(false);
    }
    for (const status of ['pending', 'declined', 'withdraw'])
      expect(canAccessStudy({ ...approved, trial_status: status })).toBe(false);
    expect(canAccessStudy({ ...approved, trial_status: 'completed' })).toBe(
      true,
    );
  });
  it('keeps public eligibility and recruitment contacts while removing study-page content and referral codes', () => {
    const trial = {
      participant: { elegibility: ['Age 18+'] },
      contact: [{ email: 'study@example.org' }],
      about: [{ thread_title: 'private' }],
      study_team: [{}],
      study_procedures: [{}],
      notice_board: [{}],
      faqs: [{}],
      referal_code: '123456',
    };
    const publicTrial = instanceToPlain(
      plainToInstance(TrialsResDto, trial, { excludeExtraneousValues: true }),
    );
    expect(publicTrial.participant.elegibility).toEqual(['Age 18+']);
    expect(publicTrial.contact[0].email).toBe('study@example.org');
    for (const key of [
      'about',
      'study_team',
      'study_procedures',
      'notice_board',
      'faqs',
    ])
      expect(publicTrial[key]).toEqual([]);
    expect(publicTrial).not.toHaveProperty('referal_code');
    const record = plainToInstance(
      TrialsRecordResDto,
      { ...approved, trial: { ...trial, __study_access: true } },
      { excludeExtraneousValues: true },
    );
    expect(record.can_access_study).toBe(true);
    expect(instanceToPlain(record).trial.about[0].thread_title).toBe('private');
  });
  it('stores four acknowledgements and an immutable contact outbox without granting access', async () => {
    const record = {
      _id: new Types.ObjectId(),
      toObject: () => ({ trial_status: 'pending', is_approved: false }),
    };
    const records = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockResolvedValue(record),
    };
    const user = {
      findById: jest.fn().mockResolvedValue({
        email: 'person@example.org',
        information: {
          first_name: 'Test',
          last_name: 'Person',
          phone_number: { callingCode: '+84', phone: '912345678' },
        },
      }),
      updateOne: jest.fn(),
    };
    const trial = {
      findById: jest.fn().mockResolvedValue({
        trial_status: 'Recruitment',
        recruitment_status: 'Actively recruiting',
        contact: [{ email: 'study@example.org' }],
      }),
    };
    const response = await makeService(records, trial, user).signUpTrials(
      trialId,
      userId,
      acknowledgements,
    );
    expect(response.data.can_access_study).toBe(false);
    expect(records.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        interest_registered_at: null,
        is_approved: false,
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          contact_sharing_status: 'pending',
          is_active: false,
          interest_contact: {
            name: 'Test Person',
            email: 'person@example.org',
            phone: '+84912345678',
          },
          interest_recipient: 'study@example.org',
          interest_copy_version: INTEREST_COPY_VERSION,
        }),
      }),
      expect.objectContaining({ upsert: true }),
    );
  });
  it.each([{ contact: [] }, { contact: [{ email: 'not-an-email' }] }])(
    'saves interest without a study email and keeps access locked: %j',
    async ({ contact }) => {
      const record = {
        _id: new Types.ObjectId(),
        toObject: () => ({
          trial_status: 'pending',
          contact_sharing_status: 'awaiting_contact',
          is_active: false,
          is_approved: false,
        }),
      };
      const records = {
        findOne: jest.fn().mockResolvedValue(null),
        findOneAndUpdate: jest.fn().mockResolvedValue(record),
      };
      const users = {
        findById: jest.fn().mockResolvedValue({
          email: 'person@example.org',
          information: {
            first_name: 'Test',
            last_name: 'Person',
            phone_number: { callingCode: '+84', phone: '912345678' },
          },
        }),
        updateOne: jest.fn(),
      };
      const trials = {
        findById: jest.fn().mockResolvedValue({
          trial_status: 'Recruitment',
          recruitment_status: 'Actively recruiting',
          contact,
        }),
      };
      const response = await makeService(records, trials, users).signUpTrials(
        trialId,
        userId,
        acknowledgements,
      );
      expect(response.success).toBe(true);
      expect(response.data.can_access_study).toBe(false);
      expect(response.data.contact_sharing_status).toBe('awaiting_contact');
      expect(records.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          $set: expect.objectContaining({
            interest_recipient: null,
            contact_sharing_status: 'awaiting_contact',
            is_active: false,
            interest_acknowledgements: expect.objectContaining({
              share_contact_details: true,
            }),
          }),
        }),
        expect.anything(),
      );
    },
  );

  it('lets a legacy pending applicant confirm the updated wording without losing submitted onboarding', async () => {
    const existing = {
      _id: new Types.ObjectId(),
      trial_status: TrialStatus.PENDING,
      is_approved: false,
      onboarding_status: 'pending_approval',
    };
    const record = { ...existing, toObject: () => existing };
    const records = {
      findOne: jest.fn().mockResolvedValue(existing),
      findOneAndUpdate: jest.fn().mockResolvedValue(record),
    };
    const user = {
      findById: jest.fn().mockResolvedValue({
        email: 'person@example.org',
        information: {
          first_name: 'Test',
          last_name: 'Person',
          phone_number: { callingCode: '+84', phone: '912345678' },
        },
      }),
      updateOne: jest.fn(),
    };
    const trial = {
      findById: jest.fn().mockResolvedValue({
        trial_status: 'Recruitment',
        recruitment_status: 'Stop recruitment',
        contact: [{ email: 'study@example.org' }],
      }),
    };
    await makeService(records, trial, user).signUpTrials(
      trialId,
      userId,
      acknowledgements,
    );
    const mutation = records.findOneAndUpdate.mock.calls[0][1];
    expect(mutation.$set).not.toHaveProperty('onboarding_status');
    expect(mutation.$set).not.toHaveProperty('onboarding_answers');
    expect(mutation.$set).toMatchObject({
      contact_sharing_status: 'pending',
      is_active: false,
    });
  });

  it('returns the same registration on retry and repairs the user record reference', async () => {
    const existing = {
      _id: new Types.ObjectId(),
      interest_registered_at: new Date(),
      toObject: () => ({ trial_status: 'pending' }),
    };
    const records = {
      findOne: jest.fn().mockResolvedValue(existing),
      findOneAndUpdate: jest.fn(),
    };
    const users = { updateOne: jest.fn() };
    await makeService(records, {}, users).signUpTrials(
      trialId,
      userId,
      acknowledgements,
    );
    expect(records.findOneAndUpdate).not.toHaveBeenCalled();
    expect(users.updateOne).toHaveBeenCalledWith(
      { _id: userId },
      { $addToSet: { trial_records: existing._id } },
    );
  });
  it('prevents participant state updates even when validation has been bypassed', async () => {
    const records = {
      findOne: jest.fn().mockResolvedValue({}),
      findOneAndUpdate: jest.fn(),
    };
    await expect(
      makeService(records).updateTrialsRecord(
        new Types.ObjectId(),
        { is_approved: true } as never,
        userId,
      ),
    ).rejects.toThrow('study-team approval');
    expect(records.findOneAndUpdate).not.toHaveBeenCalled();
  });
  it('resolves a referral without creating or activating an enrolment', async () => {
    const records = { create: jest.fn() };
    const trial = {
      findOne: jest.fn().mockResolvedValue({
        toObject: () => ({ _id: trialId, referal_code: '123456' }),
      }),
    };
    const user = { findById: jest.fn().mockResolvedValue({}) };
    const result = await makeService(
      records,
      trial,
      user,
    ).redeemTrialReferralCode({ referralCode: '123456' }, userId);
    expect(result.success).toBe(true);
    expect(records.create).not.toHaveBeenCalled();
  });
  it('requires prior interest before onboarding can create any record', async () => {
    const records = {
      findOne: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn(),
    };
    const service = new ParticipantExperienceService(
      {} as never,
      {} as never,
      records as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.submitOnboarding(trialId, userId, {})).rejects.toThrow(
      'Register your interest',
    );
    expect(records.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('Study-team approval gates', () => {
  function setup(record: any) {
    const records = {
      findById: jest.fn().mockResolvedValue(record),
      findOneAndUpdate: jest.fn().mockResolvedValue(null),
    };
    const users = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ role: 'admin' }),
        }),
      }),
    };
    const config = {
      findOne: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    };
    const service = new ParticipantExperienceService(
      users as never,
      {} as never,
      records as never,
      config as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { service, records };
  }
  const pending = {
    _id: new Types.ObjectId(),
    trial_id: trialId,
    user_id: userId,
    interest_registered_at: new Date(),
    contact_sharing_status: 'shared',
    onboarding_status: 'pending_approval',
    trial_status: TrialStatus.PENDING,
    is_approved: false,
    is_active: false,
    onboarding_answers: [
      { field_id: 'surgery_date', value: '2025-01-01' },
      { field_id: 'surgery_location', value: 'Test hospital' },
      { field_id: 'participant_id', value: 'P1' },
    ],
  };
  it.each(['informed_consent_obtained', 'eligibility_confirmed'])(
    'does not approve without %s',
    async (key) => {
      const { service, records } = setup({ ...pending });
      await expect(
        service.approve(pending._id, userId, { ...confirmation, [key]: false }),
      ).rejects.toThrow('both study-team');
      expect(records.findOneAndUpdate).not.toHaveBeenCalled();
    },
  );
  it('does not approve before contact delivery', async () => {
    const { service } = setup({
      ...pending,
      contact_sharing_status: 'pending',
    });
    await expect(
      service.approve(pending._id, userId, confirmation),
    ).rejects.toThrow('Contact details must be shared');
  });
  it('cannot restore access when withdrawal wins the approval race', async () => {
    const { service, records } = setup({ ...pending });
    await expect(
      service.approve(pending._id, userId, confirmation),
    ).rejects.toThrow('enrolment changed');
    expect(records.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ trial_status: 'pending', is_approved: false }),
      expect.objectContaining({
        $set: expect.objectContaining({
          informed_consent_obtained: true,
          eligibility_confirmed: true,
          approved_by: userId,
        }),
      }),
      { new: true },
    );
  });
  it('only exposes the staff review queue to administrators', async () => {
    const users = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ role: 'user' }),
        }),
      }),
    };
    await expect(
      makeService({}, {}, users).interestRequests(userId, {} as never),
    ).rejects.toThrow('Administrator access');
  });
});
