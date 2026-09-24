import { TrialStatus } from '@/database/enums/trials.enum';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { BaseUserResDto } from '../users/dto/base-user.res.dto';

describe('Current-user enrolment response', () => {
  it('preserves populated pending-enrolment state needed after an app reload', () => {
    const userId = new Types.ObjectId();
    const recordId = new Types.ObjectId();
    const trialId = new Types.ObjectId();
    const user = {
      _id: userId,
      email: 'participant@example.com',
      trial_records: [
        {
          _id: recordId,
          trial_id: trialId,
          is_approved: false,
          is_active: false,
          has_questionnaire_schedule: false,
          trial_status: TrialStatus.PENDING,
          onboarding_status: 'pending_approval',
          sign_up_date: new Date('2026-09-22T00:00:00.000Z'),
          approval_date: null,
        },
      ],
    };

    const response = plainToInstance(BaseUserResDto, user, {
      excludeExtraneousValues: true,
    });

    expect(response.trial_records).toEqual([
      expect.objectContaining({
        _id: recordId.toString(),
        trial_id: trialId.toString(),
        trial_status: TrialStatus.PENDING,
        onboarding_status: 'pending_approval',
        is_approved: false,
        is_active: false,
      }),
    ]);
  });
});
