import { sendConsultationEmail } from '../shared/emailer.js';

describe('sendConsultationEmail', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('does nothing when EMAIL_ENABLED is false', async () => {
    await sendConsultationEmail({ env: { EMAIL_ENABLED: 'false' }, phone: '1', summary: 's' });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('does nothing when provider unsupported', async () => {
    const env = { EMAIL_ENABLED: 'true', EMAIL_PROVIDER: 'other' };
    await sendConsultationEmail({ env, phone: '1', summary: 's' });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('sends email via Resend', async () => {
    const env = {
      EMAIL_ENABLED: 'true',
      EMAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 'k',
      EMAIL_FROM: 'a@a.com',
      EMAIL_TO: 'b@b.com'
    };
    await sendConsultationEmail({ env, phone: '1', summary: 's' });
    expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.any(Object));
  });
});
