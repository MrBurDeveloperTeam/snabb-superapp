const MRBUR_COUNTRY_MAP: Record<string, string> = {
  SG: 'sg',
  TH: 'th',
  ID: 'id',
  VN: 'vn',
  JP: 'jp',
  KR: 'kr',
  MY: 'my',  // default
}

export function getMrBurUrl(countryCode?: string | null): string {
  const code = countryCode?.toUpperCase()
  const subdomain = MRBUR_COUNTRY_MAP[code ?? ''] ?? 'my'
  return `https://${subdomain}.mrbur.shop`
}