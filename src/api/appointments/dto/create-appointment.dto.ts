import { DateField, StringField } from '@/decorators/field.decorators';
import { IsMongoId } from 'class-validator';

export class CreateAppointmentDto {
  @StringField({
    description: 'ID of the trial associated with the appointment',
  })
  @IsMongoId()
  trial_id: string;

  @DateField({
    description: 'Date of the appointment',
    example: '2023-01-01T00:00:00Z',
    nullable: true,
  })
  appointment_date: string;

  @StringField({
    description: 'Location of the appointment',
  })
  appointment_location: string;
}
