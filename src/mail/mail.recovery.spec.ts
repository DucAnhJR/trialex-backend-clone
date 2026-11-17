import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MailService } from './mail.service';

jest.mock('axios');

function setup(host = 'smtp.resend.com') {
  const values = {
    'mail.host': host,
    'mail.password': 'test-api-key',
    'mail.defaultEmail': 'support@example.org',
    'mail.defaultName': 'TrialeX',
  };
  const config = { get: (key: string) => values[key] };
  const mailer = { sendMail: jest.fn() };
  return {
    service: new MailService(
      config as unknown as ConfigService,
      mailer as unknown as MailerService,
    ),
    mailer,
  };
}
const data = { email: 'person@example.org', otp: '12345' };
beforeEach(() => jest.resetAllMocks());

it('sends Resend recovery email over HTTPS using existing SMTP credentials and the email template', async () => {
  const { service, mailer } = setup();
  jest.mocked(axios.post).mockResolvedValue({ data: { id: 'email-1' } });
  await service.sendEmailForgotPassword(data);
  expect(axios.post).toHaveBeenCalledWith(
    'https://api.resend.com/emails',
    {
      from: 'TrialeX <support@example.org>',
      to: [data.email],
      subject: 'Reset Password',
      html: expect.stringContaining('12345'),
    },
    {
      headers: { Authorization: 'Bearer test-api-key' },
      timeout: 15000,
      maxRedirects: 0,
    },
  );
  expect(mailer.sendMail).not.toHaveBeenCalled();
});

it('propagates safe diagnostics for a provider rejection without exposing credentials or OTP', async () => {
  const { service, mailer } = setup();
  jest.mocked(axios.isAxiosError).mockReturnValue(true);
  jest.mocked(axios.post).mockRejectedValue({
    response: { status: 403, data: { message: 'private-provider-message' } },
    config: { headers: { Authorization: 'Bearer test-api-key' }, data },
  });
  const error = await service
    .sendEmailForgotPassword(data)
    .catch((error) => error);
  expect(error).toMatchObject({ code: 'RESEND_API_ERROR', responseCode: 403 });
  expect(JSON.stringify(error)).not.toMatch(
    /12345|test-api-key|private-provider-message/,
  );
  expect(mailer.sendMail).not.toHaveBeenCalled();
});

it('does not treat an invalid success response as delivered', async () => {
  const { service } = setup();
  jest.mocked(axios.post).mockResolvedValue({ data: {} });
  await expect(service.sendEmailForgotPassword(data)).rejects.toMatchObject({
    code: 'RESEND_API_ERROR',
  });
});

it('retains SMTP delivery for other mail providers', async () => {
  const { service, mailer } = setup('smtp.example.org');
  await service.sendEmailForgotPassword(data);
  expect(axios.post).not.toHaveBeenCalled();
  expect(mailer.sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: data.email,
      template: 'forgot-password',
      context: expect.objectContaining({ otp: data.otp }),
    }),
  );
});
