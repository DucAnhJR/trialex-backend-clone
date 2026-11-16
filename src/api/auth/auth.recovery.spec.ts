jest.mock('../../sms/sms.service', () => ({ SmsService: class {} }));
jest.mock('../chat/chat.service', () => ({ ChatService: class {} }));
jest.mock('@nestjs/jwt', () => ({ JwtService: class {} }));
import { ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from './auth.service';

function setup(found = true) {
  const user = { id: 'test-user', email: 'person@example.org' };
  const users = {
    findOne: jest.fn().mockResolvedValue(found ? user : null),
    exists: jest.fn().mockResolvedValue(found ? { _id: 'test-user' } : null),
  };
  const cache = { store: { set: jest.fn(), del: jest.fn() } };
  const mail = {
    sendEmailForgotPassword: jest.fn().mockResolvedValue(undefined),
  };
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
  return { service, mail, cache, users };
}

describe('Password recovery email delivery', () => {
  it('waits for SMTP acceptance instead of queueing behind bulk mail', async () => {
    const { service, mail, cache } = setup();
    let accept: () => void = () => {};
    mail.sendEmailForgotPassword.mockReturnValue(
      new Promise<void>((resolve) => {
        accept = resolve;
      }),
    );
    let finished = false;
    const request = service
      .forgotAndSendOtp({ email: 'person@example.org', method: 'email' })
      .then((result) => {
        finished = true;
        return result;
      });
    await new Promise((resolve) => setImmediate(resolve));
    expect(finished).toBe(false);
    expect(mail.sendEmailForgotPassword).toHaveBeenCalledWith({
      email: 'person@example.org',
      otp: expect.stringMatching(/^\d{5}$/),
    });
    expect(cache.store.set).toHaveBeenCalled();
    accept();
    await expect(request).resolves.toMatchObject({ success: true });
  });

  it('reports delivery failure and invalidates the unsent OTP', async () => {
    const { service, mail, cache } = setup();
    mail.sendEmailForgotPassword.mockRejectedValue(new Error('SMTP rejected'));
    await expect(
      service.forgotAndSendOtp({
        email: 'person@example.org',
        method: 'email',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(cache.store.del).toHaveBeenCalledWith(
      'auth:token:test-user:forgot-password-otp',
    );
  });

  it('does not send mail for an unregistered email and keeps the generic response', async () => {
    const { service, mail, cache } = setup(false);
    await expect(
      service.forgotAndSendOtp({
        email: 'person@example.org',
        method: 'email',
      }),
    ).resolves.toMatchObject({ success: true });
    expect(mail.sendEmailForgotPassword).not.toHaveBeenCalled();
    expect(cache.store.set).not.toHaveBeenCalled();
  });
});

describe('Registration email check', () => {
  it.each([true, false])(
    'returns only whether the email exists (exists=%s)',
    async (found) => {
      const { service, users } = setup(found);
      await expect(
        service.checkEmail(' Person+test@Example.org '),
      ).resolves.toMatchObject({ success: true, data: { exists: found } });
      const filter = users.exists.mock.calls[0][0].email;
      const pattern = new RegExp(filter.$regex, filter.$options);
      expect(pattern.test('PERSON+TEST@example.org')).toBe(true);
      expect(pattern.test('personnnntest@exampleXorg')).toBe(false);
      expect(pattern.test('otherperson+test@example.org')).toBe(false);
    },
  );
});
