const INVITE_CODE_PATTERN = /^[A-Z0-9-]{4,32}$/;

export function normalizeInviteCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase();
  return INVITE_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function extractInviteCodeFromSearch(search: string): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  return normalizeInviteCode(params.get('invite') ?? params.get('code'));
}

export function buildInviteLink(origin: string, inviteCode: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const code = inviteCode.trim().toUpperCase();
  return `${cleanOrigin}/join?invite=${encodeURIComponent(code)}`;
}
