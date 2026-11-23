import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const VALID_PROFILE_COLUMNS = [
  "id",
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
  "role",
];

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID người dùng" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Lọc chỉ giữ các trường hợp lệ trong schema bảng profiles
    const cleanUpdates: Record<string, any> = {
      id,
      updated_at: new Date().toISOString(),
    };

    for (const key of VALID_PROFILE_COLUMNS) {
      if (rest[key] !== undefined) {
        cleanUpdates[key] = rest[key];
      }
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .upsert(cleanUpdates)
      .select()
      .maybeSingle();

    if (error) {
      console.error("API /api/profile upsert error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, profile: data },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("API /api/profile exception:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi cập nhật hồ sơ" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
