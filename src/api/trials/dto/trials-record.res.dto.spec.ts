import { plainToInstance } from 'class-transformer';
import { TrialsRecordResDto } from './trials-record.res.dto';

describe('TrialsRecordResDto', () => {
  it('serializes populated appointment documents as appointment IDs', () => {
    const dto = plainToInstance(
      TrialsRecordResDto,
      {
        appointments: [
          { _id: '6ab24166e95880fc6b785b37' },
          { _id: '6ab24166e95880fc6b785b38' },
        ],
      },
      { excludeExtraneousValues: true },
    );

    expect(dto.appointments).toEqual([
      '6ab24166e95880fc6b785b37',
      '6ab24166e95880fc6b785b38',
    ]);
  });
});
