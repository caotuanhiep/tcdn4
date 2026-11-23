import { NextRequest, NextResponse } from "next/server";
import { getRequestUser, getServerSupabase } from "@/lib/supabase/requestAuth";
import {
  NO_CACHE_HEADERS,
  computeAlumniStats,
  loadMergedRegistrations,
  loadProfilesFromDb,
} from "@/lib/alumni-server";

/**
 * GET /api/alumni-data
 * Nguồn dữ liệu hợp nhất duy nhất cho toàn website (Hero stats, EventSection, AlumniDirectory, MigrationMap, DirectoryView).
 * Chỉ 1 request duy nhất, đọc trực tiếp từ bảng public.profiles (Supabase DB) và manifest thanh toán (Cloud).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = getServerSupabase(req);
    const [viewer, rawProfiles] = await Promise.all([
      getRequestUser(req),
      loadProfilesFromDb(supabase),
    ]);

    const isDevAdmin =
      process.env.NODE_ENV === "development" &&
      req.cookies.get("tcdn4_dev_mode")?.value === "admin";
    const canSeePhone = Boolean(viewer || isDevAdmin);

    const registrations = await loadMergedRegistrations(supabase, rawProfiles);
    const stats = computeAlumniStats(rawProfiles, registrations);

    // Ẩn số điện thoại ở tầng API đối với khách chưa đăng nhập để bảo mật danh bạ
    const profiles = rawProfiles.map((p) => ({
      ...p,
      has_phone: Boolean(p.phone && p.phone.trim().length > 0),
      phone: canSeePhone ? p.phone : null,
    }));

    const safeRegistrations = registrations.map((r) => ({
      ...r,
      phone: canSeePhone ? r.phone : "",
    }));

    return NextResponse.json(
      {
        success: true,
        profiles,
        registrations: safeRegistrations,
        stats,
        fetchedAt: Date.now(),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[GET /api/alumni-data] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tải dữ liệu tổng hợp" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
