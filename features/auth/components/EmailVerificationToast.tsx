import React from 'react';
import { getEmailInboxUrl, resolveEmailInboxUrl } from '../utils/emailInbox';

type Props = {
  email: string;
};

export function EmailVerificationToast({ email }: Props) {
  const registeredEmail = email.trim();
  const inboxUrl = getEmailInboxUrl(registeredEmail);

  const openInbox = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    // Open immediately while the click still has browser permission, then
    // resolve custom-domain MX records in the background.
    const inboxWindow = window.open('', '_blank');
    if (inboxWindow) {
      inboxWindow.opener = null;
      inboxWindow.document.title = 'Opening email inbox...';
      inboxWindow.document.body.textContent = 'Opening your email inbox...';
    }

    const resolvedInboxUrl = await resolveEmailInboxUrl(registeredEmail);

    if (inboxWindow) {
      inboxWindow.location.replace(resolvedInboxUrl);
    } else {
      window.location.assign(resolvedInboxUrl);
    }
  };

  return (
    <div className="flex max-w-md flex-col items-center gap-4 px-2 text-center">
      <p className="m-0 max-w-full break-words leading-relaxed">
        Registration successful! Verification email sent to:{' '}
        <span className="font-semibold">{registeredEmail}</span>
      </p>
      <a
        href={inboxUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={openInbox}
        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[oklch(0.57_0.205_29)] px-5 py-2.5 text-sm font-semibold text-white no-underline shadow-[0_10px_24px_oklch(0.72_0.14_29/0.28)] transition-all hover:bg-[oklch(0.52_0.205_29)] hover:shadow-[0_12px_28px_oklch(0.68_0.16_29/0.34)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.7_0.16_29)] focus:ring-offset-2"
      >
        Open your email inbox
      </a>
    </div>
  );
}
