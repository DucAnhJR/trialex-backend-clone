jest.mock('../../sms/sms.service', () => ({ SmsService: class {} }));
jest.mock('../chat/chat.service', () => ({ ChatService: class {} }));
jest.mock('@nestjs/jwt', () => ({ JwtService: class {} }));
import { hashPassword, verifyPassword } from '../../utils/password.util';
import { AuthService } from './auth.service';

function read(obj: any, path: string) {
  return path.split('.').reduce((value, key) => value?.[key], obj);
}
function matches(obj: any, filter: any): boolean {
  return Object.entries(filter).every(([key, value]: [string, any]) => {
    if (key === '$or') return value.some((item: any) => matches(obj, item));
    const actual = read(obj, key);
    if (value && typeof value === 'object') {
      if ('$gt' in value) return actual > value.$gt;
      if ('$lte' in value) return actual <= value.$lte;
      if ('$exists' in value) return (actual !== undefined) === value.$exists;
    }
    return actual === value;
  });
}
function update(obj: any, operation: any) {
  for (const [op, fields] of Object.entries(operation) as any) {
    for (const [path, value] of Object.entries(fields)) {
      const keys = path.split('.');
      const key = keys.pop()!;
      const parent = keys.reduce((p, k) => p[k] ?? (p[k] = {}), obj);
      if (op === '$set') parent[key] = value;
      if (op === '$unset') delete parent[key];
      if (op === '$inc') parent[key] += value;
    }
  }
}
async function setup(found = true) {
  const user: any = {
    _id: 'user-id',
    id: 'user-id',
    email: 'person@example.org',
    password: await hashPassword('OriginalPassword123!'),
  };
  const users = {
    findOne: jest.fn(async (filter) =>
      found && matches(user, filter) ? structuredClone(user) : null,
    ),
    exists: jest.fn(async () => (found ? { _id: user._id } : null)),
    findOneAndUpdate: jest.fn((filter, operation) => {
      const previous =
        found && matches(user, filter) ? structuredClone(user) : null;
      if (previous) update(user, operation);
      const result = Promise.resolve(previous) as any;
      result.select = () => result;
      return result;
    }),
    updateOne: jest.fn(async (filter, operation) => {
      if (!found || !matches(user, filter)) return { modifiedCount: 0 };
      update(user, operation);
      return { modifiedCount: 1 };
    }),
  };
  const cache = {
    store: {
      set: jest.fn(() => {
        throw new Error('Redis quota exceeded');
      }),
      get: jest.fn(() => {
        throw new Error('Redis quota exceeded');
      }),
      del: jest.fn(),
    },
  };
  const mail = { sendEmailForgotPassword: jest.fn(async (_data: any) => {}) };
  const service = new AuthService(
    users as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    cache as never,
    mail as never,
    {} as never,
  );
  const request = { email: user.email, method: 'email' as const };
  return { user, users, cache, mail, service, request };
}

describe('MongoDB email password recovery', () => {
  it('completes delivery, verification and reset with Redis unavailable; OTP and token are single use', async () => {
    const { service, request, user, mail, cache } = await setup();
    await expect(service.forgotAndSendOtp(request)).resolves.toMatchObject({
      success: true,
    });
    const otp = mail.sendEmailForgotPassword.mock.calls[0][0].otp;
    expect(otp).toMatch(/^\d{5}$/);
    expect(user.passwordRecovery.otpHash).not.toBe(otp);
    const verified: any = await service.verifyOtpUnified({ ...request, otp });
    const resetToken = verified.data.resetToken;
    expect(resetToken).toHaveLength(64);
    expect(user.passwordRecovery.tokenHash).not.toBe(resetToken);
    await expect(service.verifyOtpUnified({ ...request, otp })).rejects.toThrow(
      'Invalid or expired OTP',
    );
    await expect(
      service.resetPassword({
        ...request,
        resetToken,
        newPassword: 'UpdatedPassword123!',
      }),
    ).resolves.toMatchObject({ success: true });
    expect(await verifyPassword('UpdatedPassword123!', user.password)).toBe(
      true,
    );
    expect(user.passwordRecovery).toBeUndefined();
    await expect(
      service.resetPassword({
        ...request,
        resetToken,
        newPassword: 'AnotherPassword123!',
      }),
    ).rejects.toThrow('OTP not verified');
    expect(cache.store.set).not.toHaveBeenCalled();
    expect(cache.store.get).not.toHaveBeenCalled();
  });

  it('rejects expired OTPs even though their MongoDB data still exists', async () => {
    const { service, request, user, mail } = await setup();
    await service.forgotAndSendOtp(request);
    user.passwordRecovery.expiresAt = new Date(Date.now() - 1);
    await expect(
      service.verifyOtpUnified({
        ...request,
        otp: mail.sendEmailForgotPassword.mock.calls[0][0].otp,
      }),
    ).rejects.toThrow('Invalid or expired OTP');
  });

  it('locks verification after five wrong attempts', async () => {
    const { service, request, mail } = await setup();
    await service.forgotAndSendOtp(request);
    for (let i = 0; i < 5; i++)
      await expect(
        service.verifyOtpUnified({ ...request, otp: '00000' }),
      ).rejects.toThrow('Invalid or expired OTP');
    await expect(
      service.verifyOtpUnified({
        ...request,
        otp: mail.sendEmailForgotPassword.mock.calls[0][0].otp,
      }),
    ).rejects.toThrow('Invalid or expired OTP');
  });

  it('limits resends and invalidates the previous token after a new request', async () => {
    const { service, request, user, mail } = await setup();
    await service.forgotAndSendOtp(request);
    await expect(service.forgotAndSendOtp(request)).rejects.toMatchObject({
      status: 429,
    });
    const verified: any = await service.verifyOtpUnified({
      ...request,
      otp: mail.sendEmailForgotPassword.mock.calls[0][0].otp,
    });
    user.passwordRecovery.resendAfter = new Date(Date.now() - 1);
    await service.forgotAndSendOtp(request);
    await expect(
      service.resetPassword({
        ...request,
        resetToken: verified.data.resetToken,
        newPassword: 'UpdatedPassword123!',
      }),
    ).rejects.toThrow('OTP not verified');
  });

  it('rejects missing, incorrect and expired reset tokens', async () => {
    const { service, request, user, mail } = await setup();
    await service.forgotAndSendOtp(request);
    const verified: any = await service.verifyOtpUnified({
      ...request,
      otp: mail.sendEmailForgotPassword.mock.calls[0][0].otp,
    });
    await expect(
      service.resetPassword({ ...request, newPassword: 'UpdatedPassword123!' }),
    ).rejects.toThrow('OTP not verified');
    await expect(
      service.resetPassword({
        ...request,
        resetToken: 'a'.repeat(64),
        newPassword: 'UpdatedPassword123!',
      }),
    ).rejects.toThrow('OTP not verified');
    user.passwordRecovery.verifiedUntil = new Date(Date.now() - 1);
    await expect(
      service.resetPassword({
        ...request,
        resetToken: verified.data.resetToken,
        newPassword: 'UpdatedPassword123!',
      }),
    ).rejects.toThrow('OTP not verified');
  });

  it('allows only one concurrent reset with the same token', async () => {
    const { service, request, mail } = await setup();
    await service.forgotAndSendOtp(request);
    const verified: any = await service.verifyOtpUnified({
      ...request,
      otp: mail.sendEmailForgotPassword.mock.calls[0][0].otp,
    });
    const result = await Promise.allSettled([
      service.resetPassword({
        ...request,
        resetToken: verified.data.resetToken,
        newPassword: 'UpdatedPassword123!',
      }),
      service.resetPassword({
        ...request,
        resetToken: verified.data.resetToken,
        newPassword: 'OtherPassword123!',
      }),
    ]);
    expect(result.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(result.filter((item) => item.status === 'rejected')).toHaveLength(1);
  });

  it('reports mail rejection and removes the unsent challenge', async () => {
    const { service, request, user, mail } = await setup();
    mail.sendEmailForgotPassword.mockRejectedValue(new Error('SMTP rejected'));
    await expect(service.forgotAndSendOtp(request)).rejects.toMatchObject({
      status: 503,
    });
    expect(user.passwordRecovery).toBeUndefined();
  });

  it('does not send mail for an unknown email', async () => {
    const { service, request, mail } = await setup(false);
    await expect(service.forgotAndSendOtp(request)).resolves.toMatchObject({
      success: true,
    });
    expect(mail.sendEmailForgotPassword).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'preserves registration email checking (exists=%s)',
    async (found) => {
      const { service } = await setup(found);
      await expect(
        service.checkEmail('person@example.org'),
      ).resolves.toMatchObject({ data: { exists: found } });
    },
  );
});
