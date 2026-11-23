import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const SUPER_ADMIN_EMAIL = "caotuanhiep@gmail.com";

/** Lấy user đang đăng nhập từ cookie phiên (hoặc header Authorization: Bearer ...). */
export async function getRequestUser(req: NextRequest): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.toLowerCase().startsWith("bearer ")) {
      const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const client: SupabaseClient = serviceKey
      ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : (createServerClient(url, anon, {
          cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
        }) as unknown as SupabaseClient);
    const { data } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return data?.role === "admin" || data?.role === "committee";
  } catch {
    return false;
  }
}

export async function requireAdmin(req: NextRequest): Promise<{ ok: true; user: User } | { ok: false; status: number; error: string }> {
  const user = await getRequestUser(req);
  if (!user) {
    // Trong môi trường development (localhost), cho phép thao tác để phát triển & kiểm thử
    if (process.env.NODE_ENV === "development") {
      return { ok: true, user: { id: "dev-admin", email: SUPER_ADMIN_EMAIL } as unknown as User };
    }
    return { ok: false, status: 401, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
  }
  if (!(await isAdminUser(user, req))) {
    return { ok: false, status: 403, error: "Chỉ Admin / Ban liên lạc mới có quyền thực hiện thao tác này" };
  }
  return { ok: true, user };
}
