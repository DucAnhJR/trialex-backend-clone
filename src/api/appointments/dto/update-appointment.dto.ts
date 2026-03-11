import { AppointmentStatus } from '@/database/enums/appointment';
import { EnumFieldOptional } from '@/decorators/field.decorators';
import { PartialType } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @EnumFieldOptional(() => AppointmentStatus, {
    description: 'Status of the appointment',
    example: AppointmentStatus.PENDING,
  })
  appointment_status?: AppointmentStatus;
}
