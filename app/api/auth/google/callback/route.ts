import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function resolveRequestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = forwardedProto || (forwardedHost.includes("localhost") ? "http" : "https");
    return `${proto}://${forwardedHost}`;
  }
  return req.nextUrl.origin;
}

function sanitizeNextPath(rawNext: string | undefined): string {
  if (!rawNext) return "/";
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed;
}

function clearOauthCookies(res: NextResponse) {
  const expired = { path: "/", maxAge: 0 };
  res.cookies.set("tcdn4_oauth_state", "", expired);
  res.cookies.set("tcdn4_oauth_nonce", "", expired);
  res.cookies.set("tcdn4_oauth_next", "", expired);
  res.cookies.set("tcdn4_oauth_redirect_uri", "", expired);
}

function redirectWithError(origin: string, code: string) {
  const url = new URL("/", origin);
  url.searchParams.set("login", "1");
  url.searchParams.set("auth_error", code);
  const res = NextResponse.redirect(url);
  clearOauthCookies(res);
  return res;
}

export async function GET(req: NextRequest) {
  const origin = resolveRequestOrigin(req);
  const searchParams = req.nextUrl.searchParams;

  const googleError = searchParams.get("error");
  if (googleError) {
    return redirectWithError(origin, googleError);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = req.cookies.get("tcdn4_oauth_state")?.value;
  const rawNonce = req.cookies.get("tcdn4_oauth_nonce")?.value;
  const savedNext = sanitizeNextPath(req.cookies.get("tcdn4_oauth_next")?.value);
  const savedRedirectUri =
    req.cookies.get("tcdn4_oauth_redirect_uri")?.value || `${origin}/api/auth/google/callback`;

  if (!code || !state || !savedState || state !== savedState || !rawNonce) {
    return redirectWithError(origin, "invalid_oauth_state");
  }

  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  if (!clientId || !clientSecret || !supabaseUrl || !supabaseAnonKey) {
    return redirectWithError(origin, "server_config_missing");
  }

  try {
    // 1. Đổi authorization code lấy id_token trực tiếp từ Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: savedRedirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenData = await tokenRes.json().catch(() => null);
    const idToken = tokenData?.id_token as string | undefined;

    if (!tokenRes.ok || !idToken) {
      console.error("[/api/auth/google/callback] Google token exchange failed:", tokenData?.error || tokenRes.status);
      return redirectWithError(origin, tokenData?.error || "google_token_exchange_failed");
    }

    // 2. Đăng nhập vào Supabase bằng id_token + rawNonce (Supabase tự hash SHA-256 đối chiếu với nonce trong id_token)
    const pendingCookies: { name: string; value: string; options?: any }[] = [];

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach((c) => pendingCookies.push(c));
        },
      },
    });

    const { error: signInError } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
      nonce: rawNonce,
    });

    if (signInError) {
      console.error("[/api/auth/google/callback] Supabase signInWithIdToken failed:", signInError.message);
      return redirectWithError(origin, "supabase_signin_failed");
    }

    // 3. Chuyển hướng về website kèm toàn bộ cookie phiên đăng nhập Supabase
    const response = NextResponse.redirect(new URL(savedNext, origin));
    response.headers.set("Cache-Control", "no-store");
    clearOauthCookies(response);

    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }

    return response;
  } catch (err: any) {
    console.error("[/api/auth/google/callback] Exception:", err?.message || err);
    return redirectWithError(origin, "oauth_callback_exception");
  }
}
