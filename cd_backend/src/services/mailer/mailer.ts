import { Resend } from 'resend';
import { Logger } from '../logger/logger';

export type PasswordSetupEmail = {
  to: string;
  name: string;
  url: string;
  kind: 'invite' | 'reset';
};

export type Mailer = {
  sendPasswordSetup: (email: PasswordSetupEmail) => Promise<void>;
};

export const createResendMailer = ({
  apiKey,
  from,
  logger,
}: {
  apiKey: string;
  from: string;
  logger: Logger;
}): Mailer => {
  const resend = new Resend(apiKey);

  return {
    async sendPasswordSetup({ to, name, url, kind }) {
      const subject =
        kind === 'invite'
          ? 'Set up your Changing Democracies admin account'
          : 'Reset your Changing Democracies admin password';
      const intro =
        kind === 'invite'
          ? 'An account has been created for you in the Changing Democracies admin panel. Use the link below to set your password.'
          : 'We received a request to reset your Changing Democracies admin panel password. Use the link below to choose a new one.';

      const text = [
        `Hello ${name},`,
        '',
        intro,
        '',
        url,
        '',
        'The link is valid for one hour. If you did not expect this email, you can ignore it.',
      ].join('\n');

      const { error } = await resend.emails.send({ from, to: [to], subject, text });
      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }

      logger.info({ kind }, 'Password setup email sent');
    },
  };
};
