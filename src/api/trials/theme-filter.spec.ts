import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { themePattern } from './theme-filter';
import { QueryTrialsDto } from './dto/query-trials.dto';
import { TrialsService } from './trials.service';

describe('Customer health-theme filter', () => {
  it('accepts plural customer labels against existing singular Disease labels without inferring medical classification', () => {
    expect(
      themePattern('Cardiovascular Diseases').test('Cardiovascular Disease'),
    ).toBe(true);
    expect(themePattern('Cancer').test('Cancer Types')).toBe(true);
    expect(themePattern('Cancer').test('Noncancerous')).toBe(false);
    expect(themePattern('Dermatological').test('Acne')).toBe(false);
  });
  it('validates comma-separated category IDs and rejects invalid IDs', async () => {
    const ids = [
      new Types.ObjectId().toString(),
      new Types.ObjectId().toString(),
    ];
    const query = plainToInstance(QueryTrialsDto, {
      theme_ids: ids.join(','),
      page: 2,
    });
    expect(query.theme_ids).toEqual(ids);
    expect(await validate(query)).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(QueryTrialsDto, { theme_ids: 'not-an-id' }),
      ),
    ).not.toHaveLength(0);
  });
  it('applies category filtering before pagination and counts matching trials', async () => {
    const id = new Types.ObjectId();
    const cursor = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    const trials = {
      find: jest.fn().mockReturnValue(cursor),
      countDocuments: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    };
    const preferences = {
      find: jest
        .fn()
        .mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue([{ _id: id, trial_preferences_name: 'Cancer' }]),
        }),
    };
    const service = new TrialsService(
      trials as never,
      {} as never,
      {} as never,
      preferences as never,
      {} as never,
    );
    await service.findAll(
      plainToInstance(QueryTrialsDto, {
        theme_ids: id.toString(),
        page: 2,
        limit: 20,
      }),
    );
    const filter = trials.find.mock.calls[0][0];
    const pattern = filter.$and[0].$or[0]['overview.theme'];
    expect(pattern.test('Cancer')).toBe(true);
    expect(pattern.test('Neurological Diseases')).toBe(false);
    expect(trials.countDocuments).toHaveBeenCalledWith(filter);
    expect(cursor.skip).toHaveBeenCalledWith(20);
  });
});
