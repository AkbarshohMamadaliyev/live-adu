const SECRET =
  process.env.AUTH_SECRET ?? "hikvision-default-secret-change-in-production";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours
export const COOKIE_NAME = "hik_session";

function b64uEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64uDecode(str: string): string {
  const padded = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(str.length / 4) * 4, "=");
  return atob(padded);
}

async function getCryptoKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export type SessionRole = "admin" | "viewer";

export async function signSession(
  username: string,
  role: SessionRole = "viewer",
): Promise<string> {
  const payload = b64uEncode(
    JSON.stringify({
      u: username,
      r: role,
      exp: Date.now() + SESSION_DURATION_MS,
    }),
  );
  const key = await getCryptoKey();
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const sig = b64uEncode(String.fromCharCode(...new Uint8Array(sigBuf)));
  return `${payload}.${sig}`;
}

export async function verifySession(
  token: string,
): Promise<{ username: string } | null> {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;

    const key = await getCryptoKey();
    const sigBytes = Uint8Array.from(b64uDecode(sig), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload),
    );
    if (!valid) return null;

    const data = JSON.parse(b64uDecode(payload));
    if (data.exp < Date.now()) return null;

    return { username: data.u, role: (data.r ?? "viewer") as SessionRole };
  } catch {
    return null;
  }
}
