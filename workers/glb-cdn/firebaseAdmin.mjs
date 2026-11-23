const FIREBASE_KEYS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const decoder = new TextDecoder();
const encoder = new TextEncoder();
let cachedKeys;

function decodePart(encoded) {
  return Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), (char) => char.charCodeAt(0));
}

async function getKeys() {
  if (cachedKeys && cachedKeys.expires > Date.now()) return cachedKeys.keys;
  const response = await fetch(FIREBASE_KEYS, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Firebase signing keys unavailable');
  const { keys } = await response.json();
  const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/i)?.[1] ?? 300);
  cachedKeys = { keys, expires: Date.now() + maxAge * 1000 };
  return keys;
}

export async function verifyFirebaseAdmin(token, projectId, allowedEmail) {
  try {
    if (!token || !projectId || !allowedEmail || token.length > 9000) return false;
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) return false;
    const [header, payload, signature] = parts;
    const { alg, kid } = JSON.parse(decoder.decode(decodePart(header)));
    const claims = JSON.parse(decoder.decode(decodePart(payload)));
    const now = Math.floor(Date.now() / 1000);
    if (
      alg !== 'RS256' || !kid ||
      claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}` ||
      typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 ||
      !Number.isFinite(claims.exp) || claims.exp <= now ||
      !Number.isFinite(claims.iat) || claims.iat > now + 60 ||
      !Number.isFinite(claims.auth_time) || claims.auth_time > now + 60 ||
      claims.email_verified !== true ||
      typeof claims.email !== 'string' || claims.email.toLowerCase() !== allowedEmail.trim().toLowerCase() ||
      claims.firebase?.sign_in_provider !== 'google.com'
    ) return false;

    const jwk = (await getKeys()).find((key) => key.kid === kid && key.kty === 'RSA');
    if (!jwk) return false;
    const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
    const key = await crypto.subtle.importKey('jwk', jwk, algorithm, false, ['verify']);
    return crypto.subtle.verify(algorithm, key, decodePart(signature), encoder.encode(`${header}.${payload}`));
  } catch {
    return false;
  }
}
