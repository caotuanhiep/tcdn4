import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/requestAuth";
import {
  NO_CACHE_HEADERS,
  removeRegistrationFromManifest,
  removeZaloCheckinRecords,
  syncProfileToRegistrations,
} from "@/lib/alumni-server";
import type { Profile } from "@/types/database";

const ADMIN_EDITABLE_KEYS = [
  "full_name",
  "class_name",
  "job_title",
  "company",
  "location_region",
  "specific_location",
  "phone",
  "avatar_url",
  "birthday",
  "marital_status",
  "children_count",
  "attendance_status",
  "shirt_size",
  "delivery_address",
  "bio",
] as const;

// GET /api/admin/users - Đọc toàn bộ danh bạ trực tiếp từ Supabase DB
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const supabase = getServerSupabase(req);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, users: (data || []) as Profile[] },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tải danh bạ" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// PUT /api/admin/users - Admin cập nhật thông tin / phân quyền trực tiếp vào DB gốc
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const { id, role, ...otherFields } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID thành viên cần cập nhật" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (role !== undefined) {
      if (!["member", "committee", "admin"].includes(role)) {
        return NextResponse.json(
          { success: false, error: "Vai trò không hợp lệ (chỉ member, committee, admin)" },
          { status: 400, headers: NO_CACHE_HEADERS }
        );
      }
      updates.role = role;
    }

    for (const key of ADMIN_EDITABLE_KEYS) {
      if (otherFields[key] !== undefined) {
        if (key === "birthday" && otherFields[key] === "") {
          updates[key] = null;
        } else if (key === "children_count" && otherFields[key] !== null && otherFields[key] !== "") {
          updates[key] = Number(otherFields[key]);
        } else {
          updates[key] = otherFields[key];
        }
      }
    }

    const supabase = getServerSupabase(req);
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: `Lỗi DB: ${error.message}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Không thể ghi đè vào database gốc (0 dòng được cập nhật). Hãy kiểm tra RLS policy của Admin trên Supabase hoặc cấu hình SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Đồng bộ tên / lớp / SĐT / size áo / trạng thái sang danh sách đăng ký 15 năm
    try {
      await syncProfileToRegistrations(data, supabase);
    } catch (syncErr) {
      console.warn("[PUT /api/admin/users] syncProfileToRegistrations warning:", syncErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Đã lưu thay đổi vào database gốc thành công!",
        user: data,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi cập nhật thành viên" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// DELETE /api/admin/users?id=... - Admin xóa thành viên khỏi DB gốc và danh sách đăng ký
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID thành viên" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = getServerSupabase(req);
    const { data, error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id)
      .select("id, phone, full_name")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: `Lỗi DB: ${error.message}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Không thể xóa thành viên trên database gốc (kiểm tra quyền RLS Admin hoặc cấu hình SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Xóa luôn phiếu đăng ký sự kiện (theo cả ID & SĐT) và dấu vết chống trùng Zalo của thành viên này
    try {
      await Promise.all([
        removeRegistrationFromManifest(id, supabase, data.phone),
        removeZaloCheckinRecords({ id: data.id, phone: data.phone, fullName: data.full_name }, supabase),
      ]);
    } catch {}

    return NextResponse.json(
      { success: true, message: "Đã xóa thành viên khỏi database gốc thành công!" },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi xóa thành viên" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
