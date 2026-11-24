import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

function resolveRequestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = forwardedProto || (forwardedHost.includes("localhost") ? "http" : "https");
    return `${proto}://${forwardedHost}`;
  }
  return req.nextUrl.origin;
}

function sanitizeNextPath(rawNext: string | null): string {
  if (!rawNext) return "/";
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed;
}

export async function GET(req: NextRequest) {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const isConfigured = Boolean(clientId && clientSecret);

  // Cho LoginModal kiểm tra nhanh xem luồng Google OAuth trực tiếp đã cấu hình env chưa
  if (req.nextUrl.searchParams.get("check") === "1") {
    return NextResponse.json(
      { configured: isConfigured },
      { headers: NO_CACHE_HEADERS }
    );
  }

  const origin = resolveRequestOrigin(req);

  if (!isConfigured) {
    return NextResponse.redirect(
      new URL("/?login=1&auth_error=missing_google_oauth_env", origin)
    );
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const nextPath = sanitizeNextPath(req.nextUrl.searchParams.get("next"));

  // Tạo state chống CSRF & cặp rawNonce / hashedNonce (SHA-256 hex) đúng chuẩn Supabase signInWithIdToken
  const state = crypto.randomBytes(24).toString("base64url");
  const rawNonce = crypto.randomBytes(24).toString("base64url");
  const hashedNonce = crypto.createHash("sha256").update(rawNonce).digest("hex");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("nonce", hashedNonce);
  googleAuthUrl.searchParams.set("prompt", "select_account");

  const isSecure = origin.startsWith("https://");
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecure,
    path: "/",
    maxAge: 600, // 10 phút
  };

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set("tcdn4_oauth_state", state, cookieOptions);
  response.cookies.set("tcdn4_oauth_nonce", rawNonce, cookieOptions);
  response.cookies.set("tcdn4_oauth_next", nextPath, cookieOptions);
  response.cookies.set("tcdn4_oauth_redirect_uri", redirectUri, cookieOptions);

  return response;
}
