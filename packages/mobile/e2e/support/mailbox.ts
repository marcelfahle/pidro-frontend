import { expect } from '@playwright/test';
import { api } from './api';

type Mail = { to: unknown; reply_to?: unknown; subject?: string; text_body: string };

/** The latest email that matches, polled for a few seconds: a mail may land after the answer. */
async function latest(matches: (mail: Mail) => boolean, missing: string) {
  let mail: Mail | undefined;
  await expect
    .poll(
      async () => {
        const { payload } = await api('/dev/mailbox/json');
        return (mail = (payload.data as Mail[]).findLast(matches));
      },
      { message: missing, timeout: 5_000 }
    )
    .toBeDefined();
  return mail as Mail;
}

/** The dev backend keeps every email it sends; this finds the latest one for an address. */
export function mailTo(email: string) {
  return latest(
    (item) => String(item.to).includes(email),
    `no email for ${email} in the dev mailbox`
  );
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
export function supportMailAbout(name: string) {
  return latest(
    (item) => String(item.to).includes('support@') && !!item.subject?.includes(name),
    `no email to support about ${name} in the dev mailbox`
  );
}
