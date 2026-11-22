import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/requestAuth";
import type { Profile } from "@/types/database";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// GET /api/admin/users - Lấy danh sách thành viên mới nhất (bỏ qua RLS bằng service role/admin client)
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status, headers: NO_CACHE_HEADERS });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
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

// PUT /api/admin/users - Cập nhật vai trò (role) hoặc thông tin thành viên bất kỳ
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status, headers: NO_CACHE_HEADERS });
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

    // Các trường thông tin khác nếu có gửi kèm
    const allowedKeys = [
      "full_name",
      "class_name",
      "job_title",
      "company",
      "location_region",
      "specific_location",
      "phone",
      "avatar_url",
      "birthday",
    ];

    for (const key of allowedKeys) {
      if (otherFields[key] !== undefined) {
        updates[key] = otherFields[key];
      }
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Đã cập nhật thành công!",
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

// DELETE /api/admin/users - Xóa thành viên khỏi danh bạ
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status, headers: NO_CACHE_HEADERS });
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

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("profiles").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: "Đã xóa thành viên thành công!" },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi xóa thành viên" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
