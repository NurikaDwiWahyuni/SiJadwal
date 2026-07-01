import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "session";
const SECRET = process.env.SESSION_SECRET || "dev-secret-ganti-ini";

// Idle timeout: sesi otomatis berakhir kalau tidak ada aktivitas selama ini.
// Di-refresh (sliding) setiap request yang lolos proxy.
export const IDLE_TIMEOUT_SECONDS = 30 * 60; // 30 menit

// Batas absolut: walau terus aktif, sesi wajib login ulang setelah ini
// (sesuai security spec: session timeout 24 jam).
export const ABSOLUTE_MAX_SECONDS = 60 * 60 * 24; // 24 jam

export type SessionPayload = {
  userId: string;
  username: string;
  nama: string;
  role: "ADMIN" | "OPERATOR";
  iat: number; // waktu login pertama (untuk batas absolut)
  exp: number; // waktu idle-expiry saat ini (di-refresh tiap request)
};

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

function encodeToken(payload: SessionPayload): string {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadStr}.${sign(payloadStr)}`;
}

export async function createSession(data: {
  userId: string;
  username: string;
  nama: string;
  role: "ADMIN" | "OPERATOR";
}) {
  const now = Date.now();
  const payload: SessionPayload = {
    ...data,
    iat: now,
    exp: now + IDLE_TIMEOUT_SECONDS * 1000,
  };
  const token = encodeToken(payload);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_MAX_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function verifyToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [payloadStr, signature] = token.split(".");
  if (!payloadStr || !signature) return null;
  if (sign(payloadStr) !== signature) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadStr, "base64url").toString()
    ) as SessionPayload;
    const now = Date.now();
    if (!payload.exp || payload.exp < now) return null; // idle timeout habis
    if (!payload.iat || now - payload.iat > ABSOLUTE_MAX_SECONDS * 1000) return null; // batas absolut habis
    return payload;
  } catch {
    return null;
  }
}

/** Buat token baru dengan idle-timer di-reset, mempertahankan `iat` asli (batas absolut). */
export function refreshToken(session: SessionPayload): string {
  const refreshed: SessionPayload = {
    ...session,
    exp: Date.now() + IDLE_TIMEOUT_SECONDS * 1000,
  };
  return encodeToken(refreshed);
}

/** Verifikasi penuh (signature + masa berlaku). Dipakai di Server Component (Node runtime). */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyToken(token);
}

