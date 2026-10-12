import { api } from './api';

/** The dev backend keeps every email it sends; this finds the latest one for an address. */
export async function mailTo(email: string) {
  const { payload } = await api('/dev/mailbox/json');
  const mail = (payload.data as { to: unknown; text_body: string }[]).findLast((item) =>
    String(item.to).includes(email)
  );
  if (!mail) throw new Error(`no email for ${email} in the dev mailbox`);
  return mail;
}

/** The reset token in the link the email carries. */
export async function resetTokenFor(email: string) {
  const mail = await mailTo(email);
  const link = /(https?:\/\/\S+token=\S+)/.exec(mail.text_body)?.[1];
  if (!link) throw new Error(`no link in: ${mail.text_body}`);
  return new URL(link).searchParams.get('token') as string;
}
