import { plainToInstance } from 'class-transformer';
import { AppointmentResDto } from './appointment.res.dto';

describe('AppointmentResDto', () => {
  it('exposes the appointment ID in API responses', () => {
    const dto = plainToInstance(
      AppointmentResDto,
      { _id: '6ab24166e95880fc6b785b37' },
      { excludeExtraneousValues: true },
    );

    expect(dto._id).toBe('6ab24166e95880fc6b785b37');
  });
});
