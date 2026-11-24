import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/requestAuth";
import {
  NO_CACHE_HEADERS,
  cleanPhoneDigits,
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

// POST /api/admin/users - Admin chủ động tạo hồ sơ cựu sinh viên hộ (KHÔNG cần email) & tùy chọn đẩy sang ĐK 15 năm
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.status, headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const fullName = String(body.full_name || "").trim();
    const phone = String(body.phone || "").trim();
    const className = ["TC10", "TC11", "TC12"].includes(body.class_name) ? body.class_name : "TC10";

    if (!fullName) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập Họ và Tên thành viên" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = getServerSupabase(req);

    // Kiểm tra trùng SĐT trong bảng profiles (nếu có nhập SĐT >= 9 số)
    const cleanPhone = cleanPhoneDigits(phone);
    if (cleanPhone.length >= 9) {
      const { data: existingProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone");
      const duplicate = (existingProfiles || []).find(
        (p: any) => cleanPhoneDigits(p.phone) === cleanPhone
      );
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: `Số điện thoại ${phone} đã tồn tại trong danh bạ (${duplicate.full_name || "thành viên khác"}). Bạn hãy tìm và chỉnh sửa hồ sơ đó nhé!`,
          },
          { status: 409, headers: NO_CACHE_HEADERS }
        );
      }
    }

    // Tạo user nội bộ trên auth.users (dùng Service Role Key) để thỏa khóa ngoại profiles.id -> auth.users(id)
    // mà Admin KHÔNG cần nhập email của thành viên
    let newUserId: string | null = null;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const uniqueTag = `${cleanPhone || "member"}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
      const placeholderEmail = `${uniqueTag}@offline.tcdn4.top`;
      const randomPassword = crypto.randomBytes(24).toString("base64url");

      const { data: authCreated, error: authError } = await supabase.auth.admin.createUser({
        email: placeholderEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          class_name: className,
          created_by_admin: true,
          offline_member: true,
        },
      });

      if (authError || !authCreated?.user?.id) {
        return NextResponse.json(
          {
            success: false,
            error: `Không tạo được tài khoản nội bộ trên Supabase Auth: ${authError?.message || "Lỗi không xác định"}`,
          },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }

      newUserId = authCreated.user.id;
    } else {
      newUserId = crypto.randomUUID();
    }

    const isAttending = body.register_event === true || body.attendance_status === "attending";
    const resolvedAttendance = isAttending
      ? "attending"
      : body.attendance_status === "not_attending"
      ? "not_attending"
      : null;

    const rawGuests = body.guests_count ?? body.guestsCount;
    const parsedGuestsCount =
      isAttending && rawGuests !== undefined && rawGuests !== null && rawGuests !== "" && Number.isFinite(Number(rawGuests))
        ? Math.max(0, Math.min(20, Math.floor(Number(rawGuests))))
        : 0;

    const nowIso = new Date().toISOString();
    const profilePayload: Record<string, any> = {
      id: newUserId,
      full_name: fullName,
      class_name: className,
      phone,
      job_title: String(body.job_title || "").trim(),
      company: String(body.company || "").trim(),
      location_region: body.location_region || "hcm",
      specific_location: String(body.specific_location || "").trim(),
      birthday: body.birthday ? String(body.birthday) : null,
      marital_status: body.marital_status === "single" ? "single" : "married",
      children_count:
        body.children_count !== undefined && body.children_count !== "" && Number.isFinite(Number(body.children_count))
          ? Math.max(0, Math.floor(Number(body.children_count)))
          : 0,
      attendance_status: resolvedAttendance,
      shirt_size: isAttending ? String(body.shirt_size || "L (Nam)") : body.shirt_size || null,
      delivery_address: String(body.delivery_address || "").trim(),
      bio: String(body.bio || "").trim(),
      role: ["member", "committee", "admin"].includes(body.role) ? body.role : "member",
      updated_at: nowIso,
    };

    const { data: savedProfile, error: saveError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })
      .select()
      .single();

    if (saveError || !savedProfile) {
      // Nếu upsert profiles lỗi, dọn user auth vừa tạo để tránh rác
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && newUserId) {
        await supabase.auth.admin.deleteUser(newUserId).catch(() => {});
      }
      return NextResponse.json(
        {
          success: false,
          error: `Lỗi lưu hồ sơ vào bảng profiles: ${saveError?.message || "Kiểm tra cấu hình SUPABASE_SERVICE_ROLE_KEY"}`,
        },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // Nếu Admin bật "Đẩy sang đăng ký 15 năm" -> đồng bộ luôn sang manifest đăng ký 15 năm kèm số người thân
    if (resolvedAttendance === "attending") {
      try {
        await syncProfileToRegistrations(savedProfile, supabase, {
          guestsCount: parsedGuestsCount,
        });
      } catch (syncErr) {
        console.warn("[POST /api/admin/users] syncProfileToRegistrations warning:", syncErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: isAttending
          ? `Đã tạo hồ sơ và đẩy ${fullName} sang danh sách đăng ký 15 năm!`
          : `Đã thêm ${fullName} vào danh bạ cựu sinh viên!`,
        user: { ...savedProfile, guests_count: parsedGuestsCount },
        guestsCount: parsedGuestsCount,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tạo thành viên mới" },
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

    // Đồng bộ tên / lớp / SĐT / size áo / số người thân / trạng thái sang danh sách đăng ký 15 năm
    const rawGuests = otherFields.guests_count ?? otherFields.guestsCount;
    const parsedGuestsCount =
      rawGuests !== undefined && rawGuests !== null && rawGuests !== "" && Number.isFinite(Number(rawGuests))
        ? Math.max(0, Math.min(20, Math.floor(Number(rawGuests))))
        : undefined;
    try {
      await syncProfileToRegistrations(data, supabase, {
        guestsCount: parsedGuestsCount,
      });
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

    // Nếu là tài khoản tạo hộ nội bộ (@offline.tcdn4.top), dọn luôn trong auth.users cho sạch
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { data: authUserRes } = await supabase.auth.admin.getUserById(id);
        const userEmail = authUserRes?.user?.email || "";
        if (userEmail.endsWith("@offline.tcdn4.top")) {
          await supabase.auth.admin.deleteUser(id);
        }
      } catch {}
    }

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
