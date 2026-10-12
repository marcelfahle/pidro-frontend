import { api } from './api';

type Mail = { to: unknown; reply_to?: unknown; subject?: string; text_body: string };

/** The dev backend keeps every email it sends; this finds the latest one for an address. */
export async function mailTo(email: string) {
  const { payload } = await api('/dev/mailbox/json');
  const mail = (payload.data as Mail[]).findLast((item) => String(item.to).includes(email));
  if (!mail) throw new Error(`no email for ${email} in the dev mailbox`);
  return mail;
}

/** The link the reset email carries; in dev it points at the old web client. */
export async function resetLinkFor(email: string) {
  const mail = await mailTo(email);
  const link = /(https?:\/\/\S+token=\S+)/.exec(mail.text_body)?.[1];
  if (!link) throw new Error(`no link in: ${mail.text_body}`);
  return link;
}

export async function resetTokenFor(email: string) {
  return new URL(await resetLinkFor(email)).searchParams.get('token') as string;
}

/** The latest email addressed to support whose subject names the player. */
export async function supportMailAbout(name: string) {
  const { payload } = await api('/dev/mailbox/json');
  const mail = (payload.data as Mail[]).findLast(
    (item) => String(item.to).includes('support@') && item.subject?.includes(name)
  );
  if (!mail) throw new Error(`no email to support about ${name} in the dev mailbox`);
  return mail;
}
