import { NextRequest, NextResponse } from "next/server";
import {
  getRequestUser,
  getServerSupabase,
  isAdminUser,
  SUPER_ADMIN_EMAIL,
} from "@/lib/supabase/requestAuth";
import {
  NO_CACHE_HEADERS,
  VALID_PROFILE_COLUMNS,
  loadProfilesFromDb,
  syncProfileToRegistrations,
} from "@/lib/alumni-server";

// GET /api/profile?id=... hoặc /api/profile?all=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all") === "true";
    const supabase = getServerSupabase(req);

    if (all) {
      const profiles = await loadProfilesFromDb(supabase);
      return NextResponse.json(
        { success: true, profiles },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID thành viên" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy hồ sơ", profile: null },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, profile: data },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi đọc hồ sơ" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST /api/profile - Ghi trực tiếp & ghi đè vào bảng public.profiles trên Supabase DB
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const requestUser = await getRequestUser(req);
    const isDevAdmin =
      process.env.NODE_ENV === "development" &&
      req.cookies.get("tcdn4_dev_mode")?.value === "admin";

    const targetId: string | undefined = body?.id || requestUser?.id;
    if (!targetId) {
      return NextResponse.json(
        { success: false, error: "Bạn cần đăng nhập để lưu hồ sơ" },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // Kiểm tra quyền: chỉ chính chủ hoặc Admin mới được cập nhật hồ sơ này
    const callerIsAdmin = isDevAdmin || (await isAdminUser(requestUser, req));
    if (!isDevAdmin && (!requestUser || (requestUser.id !== targetId && !callerIsAdmin))) {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền chỉnh sửa hồ sơ này" },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = getServerSupabase(req);

    // Đọc bản ghi hiện tại trong DB (nếu đã có) để giữ nguyên role & các trường không gửi lên
    const { data: existingRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetId)
      .maybeSingle();

    const cleanUpdates: Record<string, any> = {
      id: targetId,
      updated_at: new Date().toISOString(),
    };

    for (const key of VALID_PROFILE_COLUMNS) {
      if (key === "id" || key === "role") continue;
      if (body[key] !== undefined) {
        // Chuẩn hóa giá trị rỗng cho trường DATE (birthday) tránh lỗi PostgreSQL invalid input syntax for type date
        if (key === "birthday" && body[key] === "") {
          cleanUpdates[key] = null;
        } else if (key === "children_count" && body[key] !== null && body[key] !== "") {
          cleanUpdates[key] = Number(body[key]);
        } else {
          cleanUpdates[key] = body[key];
        }
      }
    }

    // QUAN TRỌNG: Bảng profiles trên Supabase có thể đang đặt DEFAULT 'attending' cho cột attendance_status.
    // Khi thành viên lần đầu lưu Bước 1 (chưa có dòng hoặc chưa từng lưu SĐT) và chưa chọn tham gia ở Bước 2,
    // gán rõ NULL để không bị tự đánh dấu đã đăng ký 15 năm trước khi sang Bước 2!
    const isFirstCheckin = !existingRow || !existingRow.phone?.trim();
    if (isFirstCheckin && body.attendance_status === undefined) {
      cleanUpdates.attendance_status = null;
    }

    // Bảo vệ role: thành viên thường không thể tự đổi role, giữ role hiện có trong DB
    if (callerIsAdmin && body.role && ["member", "committee", "admin"].includes(body.role)) {
      cleanUpdates.role = body.role;
    } else if (existingRow?.role) {
      cleanUpdates.role = existingRow.role;
    } else if ((requestUser?.email || "").toLowerCase() === SUPER_ADMIN_EMAIL) {
      cleanUpdates.role = "admin";
    } else {
      cleanUpdates.role = "member";
    }

    const { data: savedProfile, error: saveError } = await supabase
      .from("profiles")
      .upsert(cleanUpdates, { onConflict: "id" })
      .select()
      .single();

    if (saveError || !savedProfile) {
      console.error("[POST /api/profile] Supabase upsert failed:", saveError);
      return NextResponse.json(
        {
          success: false,
          error:
            saveError?.message ||
            "Không thể ghi hồ sơ vào database gốc (kiểm tra quyền RLS hoặc đăng nhập lại)",
        },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // Đồng bộ tên, lớp, size áo, địa chỉ, trạng thái tham gia sang danh sách đăng ký 15 năm
    try {
      await syncProfileToRegistrations(savedProfile, supabase);
    } catch (syncErr) {
      console.warn("[POST /api/profile] syncProfileToRegistrations warning:", syncErr);
    }

    return NextResponse.json(
      { success: true, profile: savedProfile },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("[POST /api/profile] exception:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi cập nhật hồ sơ" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
