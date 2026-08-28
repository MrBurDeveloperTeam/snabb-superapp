const PROVIDER_INBOXES: Record<string, string> = {
  'gmail.com': 'https://mail.google.com/',
  'googlemail.com': 'https://mail.google.com/',
  'outlook.com': 'https://outlook.live.com/mail/',
  'hotmail.com': 'https://outlook.live.com/mail/',
  'live.com': 'https://outlook.live.com/mail/',
  'msn.com': 'https://outlook.live.com/mail/',
  'student.mmu.edu.my': 'https://outlook.office.com/mail/',
  'mmu.edu.my': 'https://outlook.office.com/mail/',
  'yahoo.com': 'https://mail.yahoo.com/',
  'yahoo.co.uk': 'https://mail.yahoo.com/',
  'yahoo.com.my': 'https://mail.yahoo.com/',
  'ymail.com': 'https://mail.yahoo.com/',
  'rocketmail.com': 'https://mail.yahoo.com/',
  'icloud.com': 'https://www.icloud.com/mail/',
  'me.com': 'https://www.icloud.com/mail/',
  'mac.com': 'https://www.icloud.com/mail/',
  'proton.me': 'https://mail.proton.me/',
  'protonmail.com': 'https://mail.proton.me/',
  'pm.me': 'https://mail.proton.me/',
  'zoho.com': 'https://mail.zoho.com/',
  'zohomail.com': 'https://mail.zoho.com/',
  'aol.com': 'https://mail.aol.com/',
  'gmx.com': 'https://www.gmx.com/mail/',
  'gmx.net': 'https://www.gmx.net/mail/',
  'mail.com': 'https://www.mail.com/int/',
  'fastmail.com': 'https://app.fastmail.com/mail/',
  'tuta.com': 'https://app.tuta.com/mail/',
  'tutanota.com': 'https://app.tuta.com/mail/',
  'yandex.com': 'https://mail.yandex.com/',
  'yandex.ru': 'https://mail.yandex.ru/',
  'qq.com': 'https://mail.qq.com/',
  '163.com': 'https://mail.163.com/',
  '126.com': 'https://mail.126.com/',
  'naver.com': 'https://mail.naver.com/',
  'daum.net': 'https://mail.daum.net/',
  'hanmail.net': 'https://mail.daum.net/',
};

export const getEmailInboxUrl = (email: string): string => {
  const domain = email.trim().toLowerCase().split('@').pop() || '';

  // Custom company domains do not expose a standard, discoverable inbox URL.
  // In that case, let the user's configured email application handle it.
  return PROVIDER_INBOXES[domain] || 'mailto:';
};

type DnsJsonAnswer = {
  type?: number;
  data?: string;
};

type DnsJsonResponse = {
  Status?: number;
  Answer?: DnsJsonAnswer[];
};

const getInboxFromMxHosts = (mxHosts: string[]): string | undefined => {
  const hosts = mxHosts.join(' ').toLowerCase();

  if (/(google\.com|googlemail\.com)/.test(hosts)) {
    return 'https://mail.google.com/';
  }
  if (/(outlook\.com|protection\.outlook\.com|microsoft\.com)/.test(hosts)) {
    return 'https://outlook.office.com/mail/';
  }
  if (/(zoho\.com|zohomail\.)/.test(hosts)) {
    return 'https://mail.zoho.com/';
  }
  if (/protonmail\.(ch|com)/.test(hosts)) {
    return 'https://mail.proton.me/';
  }
  if (/(yahoodns\.net|yahoo\.com)/.test(hosts)) {
    return 'https://mail.yahoo.com/';
  }
  if (/icloud\.com/.test(hosts)) {
    return 'https://www.icloud.com/mail/';
  }
  if (/fastmail\.com/.test(hosts)) {
    return 'https://app.fastmail.com/mail/';
  }
  if (/(tutanota\.(de|com)|tuta\.com)/.test(hosts)) {
    return 'https://app.tuta.com/mail/';
  }
  if (/yandex\.(net|ru|com)/.test(hosts)) {
    return 'https://mail.yandex.com/';
  }

  return undefined;
};

export const resolveEmailInboxUrl = async (email: string): Promise<string> => {
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split('@').pop() || '';
  const knownProviderUrl = PROVIDER_INBOXES[domain];

  if (knownProviderUrl || !domain) {
    return knownProviderUrl || 'mailto:';
  }

  try {
    const query = new URLSearchParams({ name: domain, type: 'MX' });
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?${query.toString()}`,
      {
        headers: { Accept: 'application/dns-json' },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) return 'mailto:';

    const dnsResult = await response.json() as DnsJsonResponse;
    const mxHosts = (dnsResult.Answer || [])
      .filter((answer) => answer.type === 15 && typeof answer.data === 'string')
      .map((answer) => answer.data as string);

    return getInboxFromMxHosts(mxHosts) || 'mailto:';
  } catch {
    return 'mailto:';
  }
};
