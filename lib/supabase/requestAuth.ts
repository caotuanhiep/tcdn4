import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const SUPER_ADMIN_EMAIL = "caotuanhiep@gmail.com";

/**
 * Tạo Supabase client phía server có đủ quyền để đọc/ghi DB & Storage:
 * 1. Nếu có SUPABASE_SERVICE_ROLE_KEY -> dùng Service Role (bỏ qua RLS, luôn ổn định nhất).
 * 2. Nếu request có header Authorization: Bearer <token> -> dùng JWT của user đang đăng nhập.
 * 3. Nếu có cookie phiên SSR -> dùng cookie của user đang đăng nhập.
 * 4. Cuối cùng fallback sang anon client (chỉ đọc công khai).
 */
export function getServerSupabase(req?: NextRequest): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      return createClient(url, anon, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }

    return createServerClient(url, anon, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }) as unknown as SupabaseClient;
  }

  return getSupabaseAdmin();
}

/** Lấy user đang đăng nhập từ header Authorization: Bearer hoặc cookie phiên SSR. */
export async function getRequestUser(req: NextRequest): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      const client = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await client.auth.getUser(authHeader.slice(7).trim());
      if (data?.user) return data.user;
    }

    const client = createServerClient(url, anon, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }) as unknown as SupabaseClient;
    const { data } = await client.auth.getUser();
    return data?.user ?? null;
  } catch {
    return null;
  }
}

/** Kiểm tra quyền Admin / Ban liên lạc (khớp với logic isAdmin phía client). */
export async function isAdminUser(user: User | null, req: NextRequest): Promise<boolean> {
  if (!user) return false;
  const email = (user.email || "").toLowerCase();
  if (email === SUPER_ADMIN_EMAIL || email.includes("admin")) return true;

  try {
    const client = getServerSupabase(req);
    const { data } = await client
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    return data?.role === "admin" || data?.role === "committee";
  } catch {
    return false;
  }
}

export async function requireAdmin(
  req: NextRequest
): Promise<{ ok: true; user: User } | { ok: false; status: number; error: string }> {
  const user = await getRequestUser(req);
  if (!user) {
    if (
      process.env.NODE_ENV === "development" &&
      req.cookies.get("tcdn4_dev_mode")?.value === "admin"
    ) {
      return {
        ok: true,
        user: {
          id: "647fb28f-2ab7-415e-84cd-87329017a7e0",
          email: SUPER_ADMIN_EMAIL,
        } as unknown as User,
      };
    }
    return {
      ok: false,
      status: 401,
      error: "Bạn cần đăng nhập để thực hiện thao tác này",
    };
  }
  if (!(await isAdminUser(user, req))) {
    return {
      ok: false,
      status: 403,
      error: "Chỉ Admin / Ban liên lạc mới có quyền thực hiện thao tác này",
    };
  }
  return { ok: true, user };
}
