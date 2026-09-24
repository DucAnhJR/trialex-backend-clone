import { Types } from 'mongoose';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService with referenced trial records', () => {
  const userId = new Types.ObjectId();
  const trialId = new Types.ObjectId();
  const appointmentId = new Types.ObjectId();
  const body = {
    trial_id: trialId.toString(),
    appointment_date: '2026-10-01T09:00:00.000Z',
    appointment_location: 'Clinic',
  };

  it('stores the appointment only on the TrialsRecord document', async () => {
    const appointmentModel = {
      create: jest.fn().mockResolvedValue({
        _id: appointmentId,
        toObject: () => ({ _id: appointmentId }),
      }),
    };
    const trialsRecordModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    const service = new AppointmentsService(
      appointmentModel as never,
      trialsRecordModel as never,
    );

    const response = await service.createAppointment(userId, body);

    expect(response.success).toBe(true);
    expect(response.data?._id).toBe(appointmentId.toString());
    expect(trialsRecordModel.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId) },
      { $addToSet: { appointments: appointmentId } },
    );
  });

  it('allows an appointment for a pending enrolment', async () => {
    const pendingRecordId = new Types.ObjectId();
    const appointmentModel = {
      create: jest.fn().mockResolvedValue({
        _id: appointmentId,
        toObject: () => ({ _id: appointmentId }),
      }),
    };
    const trialsRecordModel = {
      findOne: jest.fn().mockResolvedValue({
        _id: pendingRecordId,
        onboarding_status: 'pending_approval',
        is_approved: false,
        is_active: false,
      }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    const service = new AppointmentsService(
      appointmentModel as never,
      trialsRecordModel as never,
    );

    const response = await service.createAppointment(userId, body);

    expect(response.success).toBe(true);
    expect(trialsRecordModel.findOne).toHaveBeenCalledWith({
      user_id: userId,
      trial_id: trialId,
    });
    expect(trialsRecordModel.updateOne).toHaveBeenCalledWith(
      { _id: pendingRecordId },
      { $addToSet: { appointments: appointmentId } },
    );
  });

  it('does not create an orphan appointment without a trial enrolment', async () => {
    const appointmentModel = { create: jest.fn() };
    const trialsRecordModel = {
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn(),
    };
    const service = new AppointmentsService(
      appointmentModel as never,
      trialsRecordModel as never,
    );

    const response = await service.createAppointment(userId, body);

    expect(response.success).toBe(false);
    expect(response.message).toBe('Trial enrolment not found');
    expect(appointmentModel.create).not.toHaveBeenCalled();
    expect(trialsRecordModel.updateOne).not.toHaveBeenCalled();
  });

  it('attaches an approved appointment to the participant active trial record', async () => {
    const appointment = {
      _id: appointmentId,
      user_id: userId,
      trial_id: trialId,
      appointment_status: 'pending',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const appointmentModel = {
      findById: jest.fn().mockResolvedValue(appointment),
    };
    const trialsRecordModel = {
      findOne: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    const service = new AppointmentsService(
      appointmentModel as never,
      trialsRecordModel as never,
    );

    await service.approve(appointmentId);

    expect(appointment.save).toHaveBeenCalledTimes(1);
    expect(trialsRecordModel.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId) },
      { $addToSet: { appointments: appointmentId } },
    );
  });
});
