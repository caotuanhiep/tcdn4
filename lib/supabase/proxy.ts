import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/directory", "/gallery", "/admin"];

/** Refresh the session cookie and enforce route protection. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + "/"));

  // Cho phép chế độ dev admin kiểm thử cục bộ mà không bị chặn xác thực Google OAuth
  if (
    process.env.NODE_ENV === "development" &&
    (request.nextUrl.searchParams.get("dev_admin") === "1" ||
      request.cookies.get("tcdn4_dev_mode")?.value === "admin")
  ) {
    if (request.nextUrl.searchParams.get("dev_admin") === "1") {
      response.cookies.set("tcdn4_dev_mode", "admin", { path: "/" });
    }
    return response;
  }

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "?login=1";
    return NextResponse.redirect(url);
  }

  if ((path === "/admin" || path.startsWith("/admin/")) && user) {
    const isSuperAdmin = user.email === "caotuanhiep@gmail.com";
    if (!isSuperAdmin) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
