import { SexEnum } from '@/database/enums/sex.enum';
import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { model, Types } from 'mongoose';
import { BaseUserResDto } from './dto/base-user.res.dto';
import { CreateUserInformationDto } from './dto/create-user-information.dto';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';

const id = new Types.ObjectId();
const theme = new Types.ObjectId();
const information = {
  first_name: 'Alex',
  last_name: 'Smith',
  date_of_birth: '1990-01-01',
  sex: SexEnum.FEMALE,
  phone_number: { callingCode: '44', cca2: 'GB', phone: '12345678' },
  gender: 'Woman',
  ethnicity: 'Prefer not to say',
  occupation: 'Student',
  parental_status: 'Not a parent',
  education_level: 'Undergraduate degree',
};
function fixture() {
  const user = {
    _id: id,
    email: 'old@example.org',
    information,
    trial_preferences: [],
  };
  const users = {
    findById: jest.fn().mockResolvedValue(user),
    exists: jest.fn().mockResolvedValue(null),
    findByIdAndUpdate: jest.fn().mockResolvedValue(user),
    findOneAndUpdate: jest.fn().mockResolvedValue(user),
  };
  const preferences = {
    find: jest
      .fn()
      .mockReturnValue({ lean: jest.fn().mockResolvedValue([{ _id: theme }]) }),
  };
  const service = new UsersService(
    users as never,
    preferences as never,
    {} as never,
    {} as never,
  );
  return { service, users, preferences, user };
}

describe('Customer profile contract', () => {
  it('accepts the flat HTTP request including optional blank conditions and exposes new fields in the response', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    const body = await pipe.transform(
      {
        first_name: 'Alex',
        email: 'new@example.org',
        health_conditions: '',
        methods_of_contact: ['Email', 'Letter'],
        trial_preference_ids: [theme.toString()],
      },
      { type: 'body', metatype: UpdatePersonalInfoDto },
    );
    expect(body.health_conditions).toBe('');
    expect(body.methods_of_contact).toEqual(['Email', 'Letter']);
    const { service, users } = fixture();
    users.findByIdAndUpdate.mockResolvedValue({
      _id: id,
      email: 'new@example.org',
      information: {
        ...information,
        health_conditions: '',
        methods_of_contact: body.methods_of_contact,
      },
      trial_preferences: [theme],
    });
    const response = await service.updatePersonalInfo(id, body);
    expect(users.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      {
        $set: expect.objectContaining({
          email: 'new@example.org',
          'information.health_conditions': '',
          'information.methods_of_contact': ['Email', 'Letter'],
          trial_preferences: [theme],
        }),
      },
      expect.objectContaining({ runValidators: true }),
    );
    expect(response.data.email).toBe('new@example.org');
    expect(response.data.information.methods_of_contact).toEqual([
      'Email',
      'Letter',
    ]);
    expect(response.data.trial_preferences).toEqual([theme.toString()]);
  });

  it('does not silently succeed with the former nested request contract', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    const body = await pipe.transform(
      { userInfo: { first_name: 'New' }, id: id.toString() },
      { type: 'body', metatype: UpdatePersonalInfoDto },
    );
    const { service, users } = fixture();
    await expect(service.updatePersonalInfo(id, body)).rejects.toThrow(
      'No editable',
    );
    expect(users.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it.each([{ sex: SexEnum.MALE }, { date_of_birth: '2000-01-01' }])(
    'rejects immutable changes through PUT and POST info: %o',
    async (body) => {
      const { service, users } = fixture();
      await expect(
        service.updatePersonalInfo(id, body as never),
      ).rejects.toThrow('cannot be changed');
      await expect(
        service.createUserInformation(id, { ...information, ...body } as never),
      ).rejects.toThrow('cannot be changed');
      expect(users.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(users.findOneAndUpdate).not.toHaveBeenCalled();
    },
  );

  it('allows unchanged immutable values from older clients without overwriting them', async () => {
    const { service, users } = fixture();
    await service.updatePersonalInfo(id, {
      first_name: 'New name',
      date_of_birth: new Date('1990-01-01'),
      sex: SexEnum.FEMALE,
    });
    const update = users.findByIdAndUpdate.mock.calls[0][1].$set;
    expect(update['information.first_name']).toBe('New name');
    expect(update).not.toHaveProperty('information.date_of_birth');
    expect(update).not.toHaveProperty('information.sex');
  });

  it('initializes immutable fields once using a compare-and-set', async () => {
    const { service, users, user } = fixture();
    users.findById.mockResolvedValue({ ...user, information: {} });
    await service.createUserInformation(id, information as never);
    expect(users.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: id, 'information.date_of_birth': null },
      expect.anything(),
      expect.anything(),
    );
    users.findOneAndUpdate.mockResolvedValue(null);
    await expect(
      service.createUserInformation(id, information as never),
    ).rejects.toThrow('already initialized');
  });

  it('rejects duplicate account email without reporting a successful save', async () => {
    const { service, users } = fixture();
    users.exists.mockResolvedValue({ _id: new Types.ObjectId() });
    await expect(
      service.updatePersonalInfo(id, { email: 'other@example.org' }),
    ).rejects.toThrow('Email already exists');
    expect(users.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('does not reset phone verification merely because JSON property order changed', async () => {
    const { service, users } = fixture();
    await service.updatePersonalInfo(id, {
      phone_number: { phone: '12345678', cca2: 'GB', callingCode: '44' },
    });
    expect(users.findByIdAndUpdate.mock.calls[0][1].$set).not.toHaveProperty(
      'phone_number_verified',
    );
  });

  it('preserves unspecified fields and replaces cleared arrays rather than deep-merging them', async () => {
    const { service, users, preferences } = fixture();
    preferences.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    await service.updatePersonalInfo(id, {
      health_conditions: '',
      methods_of_contact: [],
      trial_preference_ids: [],
    });
    expect(users.findByIdAndUpdate.mock.calls[0][1].$set).toEqual({
      'information.health_conditions': '',
      'information.methods_of_contact': [],
      trial_preferences: [],
    });
  });

  it('validates exact contact methods, unknown category IDs and registration options', async () => {
    expect(
      await validate(
        plainToInstance(UpdatePersonalInfoDto, { methods_of_contact: ['SMS'] }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CreateUserInformationDto, {
          ...information,
          occupation: 'Artist',
        }),
      ),
    ).not.toHaveLength(0);
    const { service, preferences } = fixture();
    preferences.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
    await expect(
      service.updatePersonalInfo(id, {
        trial_preference_ids: [theme.toString()],
      }),
    ).rejects.toThrow('Invalid health interest');
  });

  it('retains registration nationality and preference data through the actual Mongoose schema and response serializer', () => {
    const UserModel = model('CustomerProfileSchemaTest', UserSchema);
    const stored = new UserModel({
      email: 'test@example.org',
      password: 'hashed',
      information: {
        ...information,
        nationality: 'American',
        health_conditions: 'An unlisted condition',
        methods_of_contact: ['Email'],
        gender_description: 'Optional description',
      },
    }).toObject();
    expect(stored.information.nationality).toBe('American');
    expect(stored.information.health_conditions).toBe('An unlisted condition');
    expect(stored.information.methods_of_contact).toEqual(['Email']);
    const dto = plainToInstance(BaseUserResDto, stored, {
      excludeExtraneousValues: true,
    });
    expect(dto.information.nationality).toBe('American');
    expect(dto.information.methods_of_contact).toEqual(['Email']);
  });
});
