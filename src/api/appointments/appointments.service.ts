import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { ResponseNoDataDto } from '@/common/dto/response/response-no-data.dto';
import { ResponseDto } from '@/common/dto/response/response.dto';
import { AppointmentStatus } from '@/database/enums/appointment';
import { TrialStatus } from '@/database/enums/trials.enum';
import { paginateWithModel } from '@/utils/offset-pagination';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { FilterQuery, Model, Types } from 'mongoose';
import { TrialsRecord } from '../trials/schemas/trials-record.schema';
import { AppointmentResDto } from './dto/appointment.res.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import {
  Appointment,
  AppointmentDocument,
} from './schemas/appointments.schema';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @InjectModel(TrialsRecord.name)
    private trialsRecord: Model<TrialsRecord>,
  ) {}

  async approve(id: Types.ObjectId): Promise<ResponseDto<AppointmentResDto>> {
    const appointment = await this.appointmentModel.findById(id);
    if (!appointment) {
      return new ResponseDto<AppointmentResDto>({
        data: null,
        success: false,
        message: 'Appointment not found',
      });
    }

    appointment.appointment_status = AppointmentStatus.CONFIRMED;
    await appointment.save();

    await this.attachToActiveTrialRecord(
      appointment.user_id,
      appointment.trial_id,
      appointment._id,
    );

    return new ResponseDto<AppointmentResDto>({
      data: plainToInstance(AppointmentResDto, appointment, {
        excludeExtraneousValues: true,
      }),
      message: 'Appointment approved successfully',
    });
  }

  async decline(id: Types.ObjectId): Promise<ResponseDto<AppointmentResDto>> {
    const appointment = await this.appointmentModel.findById(id);
    if (!appointment) {
      return new ResponseDto<AppointmentResDto>({
        data: null,
        success: false,
        message: 'Appointment not found',
      });
    }
    appointment.appointment_status = AppointmentStatus.CANCELLED;
    await appointment.save();
    return new ResponseDto<AppointmentResDto>({
      data: plainToInstance(AppointmentResDto, appointment, {
        excludeExtraneousValues: true,
      }),
      message: 'Appointment declined successfully',
    });
  }

  async createAppointment(
    user_id: Types.ObjectId,
    body: CreateAppointmentDto,
  ): Promise<ResponseDto<AppointmentResDto>> {
    const trialId = new Types.ObjectId(body.trial_id);
    // Appointments may be arranged while the participant is still awaiting
    // enrolment approval. Require an owned enrolment, but do not require it to
    // be active yet.
    const trialRecord = await this.findTrialRecord(user_id, trialId);
    if (!trialRecord) {
      return new ResponseDto<AppointmentResDto>({
        data: null,
        success: false,
        message: 'Trial enrolment not found',
      });
    }

    const appointment = await this.appointmentModel.create({
      ...body,
      user_id,
      appointment_status: AppointmentStatus.PENDING,
      is_active: true,
      sign_up_date: new Date(),
    });

    await this.trialsRecord.updateOne(
      { _id: trialRecord._id },
      { $addToSet: { appointments: appointment._id } },
    );

    return new ResponseDto<AppointmentResDto>({
      data: plainToInstance(AppointmentResDto, appointment.toObject(), {
        excludeExtraneousValues: true,
      }),
      message: 'Appointment created successfully',
    });
  }

  private async findTrialRecord(userId: Types.ObjectId, trialId: Types.ObjectId) {
    return this.trialsRecord.findOne({
      user_id: userId,
      trial_id: trialId,
    });
  }

  private async findActiveTrialRecord(
    userId: Types.ObjectId,
    trialId: Types.ObjectId,
  ) {
    return this.trialsRecord.findOne({
      user_id: userId,
      trial_id: trialId,
      is_approved: true,
      is_active: true,
      trial_status: TrialStatus.IN_PROGRESS,
    });
  }

  private async attachToActiveTrialRecord(
    userId: Types.ObjectId,
    trialId: Types.ObjectId,
    appointmentId: Types.ObjectId,
  ) {
    const trialRecord = await this.findActiveTrialRecord(userId, trialId);
    if (!trialRecord) return;

    await this.trialsRecord.updateOne(
      { _id: trialRecord._id },
      { $addToSet: { appointments: appointmentId } },
    );
  }

  async getAppointment(
    id: Types.ObjectId,
  ): Promise<ResponseDto<AppointmentResDto>> {
    const appointment = await this.appointmentModel
      .findById(id)
      .populate('user_id')
      .populate('trial_id')
      .lean();

    if (!appointment) {
      return new ResponseDto<AppointmentResDto>({
        data: null,
        success: false,
        message: 'Appointment not found',
      });
    }

    const data = {
      ...appointment,
      user_id: appointment.user_id?._id?.toString() ?? appointment.user_id,
      user: appointment.user_id,
      trial_id: appointment.trial_id?._id?.toString() ?? appointment.trial_id,
      trial: appointment.trial_id,
    };

    return new ResponseDto<AppointmentResDto>({
      data: plainToInstance(AppointmentResDto, data, {
        excludeExtraneousValues: true,
      }),
      message: 'Retrieved appointment successfully',
    });
  }

  async findAll(
    query: PageOptionsDto,
    userId: Types.ObjectId,
  ): Promise<OffsetPaginatedDto<AppointmentResDto>> {
    const filter: FilterQuery<AppointmentDocument> = { user_id: userId };

    const [appointments, metaDto] =
      await paginateWithModel<AppointmentDocument>(
        this.appointmentModel,
        filter,
        query,
        {
          skipCount: false,
          takeAll: false,
          populate: ['user_id', 'trial_id'],
        },
      );

    const mappedAppointments = appointments.map((appointment) => ({
      ...appointment,
      user_id: appointment.user_id?._id?.toString() ?? appointment.user_id,
      user: appointment.user_id,
      trial_id: appointment.trial_id?._id?.toString() ?? appointment.trial_id,
      trial: appointment.trial_id,
    }));

    return new OffsetPaginatedDto<AppointmentResDto>({
      data: plainToInstance(AppointmentResDto, mappedAppointments, {
        excludeExtraneousValues: true,
      }),
      meta: metaDto,
      message: 'Retrieved appointments successfully',
    });
  }

  async update(id: Types.ObjectId, body: UpdateAppointmentDto) {
    const appointment = await this.appointmentModel.findById(id);
    if (!appointment) {
      return new ResponseNoDataDto({
        success: false,
        message: 'Appointment not found',
      });
    }

    const prevStatus = appointment.appointment_status;

    const updated = await this.appointmentModel.findByIdAndUpdate(id, body, {
      new: true,
    });

    if (
      body.appointment_status === AppointmentStatus.COMPLETED &&
      prevStatus !== AppointmentStatus.COMPLETED
    ) {
      await this.trialsRecord.updateOne(
        { trial_id: appointment.trial_id, user_id: appointment.user_id },
        { $inc: { badges_earned: 1 } },
      );
    }

    if (
      body.appointment_status !== AppointmentStatus.COMPLETED &&
      prevStatus === AppointmentStatus.COMPLETED
    ) {
      await this.trialsRecord.updateOne(
        { trial_id: appointment.trial_id, user_id: appointment.user_id },
        { $inc: { badges_earned: -1 } },
      );
    }

    return new ResponseDto<AppointmentResDto>({
      data: plainToInstance(AppointmentResDto, updated, {
        excludeExtraneousValues: true,
      }),
      message: 'Appointment updated successfully',
    });
  }

  async deleteManyByUserId(userId: Types.ObjectId): Promise<void> {
    const appointments = await this.appointmentModel.find({ user_id: userId });
    for (const appointment of appointments) {
      await this.delete(appointment._id);
    }
  }

  async delete(appointmentId: Types.ObjectId): Promise<ResponseNoDataDto> {
    const appointment = await this.appointmentModel.findById(appointmentId);
    if (!appointment) {
      return new ResponseNoDataDto({
        success: false,
        message: 'Appointment not found',
      });
    }

    await this.appointmentModel.findByIdAndDelete(appointmentId);

    await this.trialsRecord.updateMany(
      { appointments: appointmentId },
      { $pull: { appointments: appointmentId } },
    );

    return new ResponseNoDataDto({
      message: 'Appointment deleted successfully',
    });
  }
}
