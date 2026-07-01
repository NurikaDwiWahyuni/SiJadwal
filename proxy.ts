import { NextRequest, NextResponse } from "next/server";
import { verifyToken, refreshToken, ABSOLUTE_MAX_SECONDS } from "@/lib/auth";

const COOKIE_NAME = "session";

// Semua halaman di bawah /admin wajib login.
// Proxy (dulu bernama "middleware") di Next.js 16 selalu jalan di Node.js
// runtime, jadi modul "crypto" yang dipakai lib/auth.ts aman dipakai di sini.
export default function proxy(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = verifyToken(token);

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sliding session: tiap request yang valid mereset idle-timer (30 menit),
  // tetap dibatasi oleh iat asli (maksimal 24 jam total sejak login).
  const res = NextResponse.next();
  const newToken = refreshToken(session);
  res.cookies.set(COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_MAX_SECONDS,
  });

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
