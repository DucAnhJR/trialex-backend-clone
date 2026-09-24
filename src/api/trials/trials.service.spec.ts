import { TrialStatus } from '@/database/enums/trials.enum';
import { Types } from 'mongoose';
import { TrialsService } from './trials.service';

describe('TrialsService referenced enrolments', () => {
  it('updates milestone progress only in TrialsRecord', async () => {
    const userId = new Types.ObjectId();
    const trialId = new Types.ObjectId();
    const recordId = new Types.ObjectId();
    const milestoneId = new Types.ObjectId();
    const trialRecord = {
      _id: recordId,
      user_id: userId,
      trial_id: trialId,
      trial_status: TrialStatus.IN_PROGRESS,
    };
    const updatedRecord = {
      ...trialRecord,
      milestones: [milestoneId],
      total_milestones: 1,
      total_milestones_completed: 1,
    };
    const trialModel = {
      findOne: jest.fn().mockResolvedValue({
        _id: trialId,
        overview: { milestones: [{ _id: milestoneId }] },
      }),
    };
    const trialsRecordModel = {
      findById: jest.fn().mockResolvedValue(trialRecord),
      findByIdAndUpdate: jest
        .fn()
        .mockResolvedValueOnce({
          ...updatedRecord,
          total_milestones_completed: 0,
        })
        .mockResolvedValueOnce(updatedRecord),
    };
    const userModel = { updateOne: jest.fn() };
    const service = new TrialsService(
      trialModel as never,
      trialsRecordModel as never,
      userModel as never,
      {} as never,
      {} as never,
    );

    const response = await service.markMilestoneCompleted({
      trial_record_id: recordId.toString(),
      milestone_id: milestoneId.toString(),
    });

    expect(response.success).toBe(true);
    expect(trialsRecordModel.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    expect(userModel.updateOne).not.toHaveBeenCalled();
  });
});
