import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getRequestUser,
  getServerSupabase,
  isAdminUser,
  requireAdmin,
} from "@/lib/supabase/requestAuth";
import {
  NO_CACHE_HEADERS,
  type RegistrationItem,
  cleanPhoneDigits,
  formatShortDate,
  loadManifestRegistrations,
  loadMergedRegistrations,
  removeRegistrationFromManifest,
  saveManifestRegistrations,
} from "@/lib/alumni-server";

export type { RegistrationItem };

// Giữ export tương thích ngược cho sepay-webhook & ai-database-context
export async function loadRegistrations(client?: SupabaseClient): Promise<RegistrationItem[]> {
  return loadMergedRegistrations(client);
}

export async function saveRegistrations(
  items: RegistrationItem[],
  client?: SupabaseClient
): Promise<boolean> {
  const res = await saveManifestRegistrations(items, client);
  return res.ok;
}

// GET /api/registrations - Lấy danh sách đăng ký hợp nhất trực tiếp từ DB + Cloud manifest
export async function GET(req: NextRequest) {
  try {
    const supabase = getServerSupabase(req);
    const items = await loadMergedRegistrations(supabase);
    return NextResponse.json(
      { success: true, registrations: items, items },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi tải danh sách đăng ký" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST /api/registrations - Lưu/cập nhật đăng ký tham gia 15 năm trực tiếp vào DB + Cloud manifest
export async function POST(req: NextRequest) {
  try {
    const supabase = getServerSupabase(req);
    const requestUser = await getRequestUser(req);
    const body = await req.json();
    const {
      fullName,
      className,
      phone,
      shirtSize,
      address,
      avatarUrl,
      guestsCount,
      registrationType,
      paidAmount,
      note,
    } = body;

    if (!fullName || !phone) {
      return NextResponse.json(
        { success: false, error: "Thiếu họ tên hoặc số điện thoại" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const regId = String(body.id || requestUser?.id || `reg-${Date.now()}`);
    const cleanPhone = cleanPhoneDigits(phone);

    const resolvedRegType: "attending" | "attending_free" | "shirt_only" =
      registrationType === "attending_free"
        ? "attending_free"
        : registrationType === "shirt_only"
        ? "shirt_only"
        : "attending";
    const defaultRegFee =
      resolvedRegType === "attending_free" ? 0 : resolvedRegType === "shirt_only" ? 250000 : 1000000;

    // 1. Cập nhật bảng profiles (nguồn chân lý) nếu ID thuộc về user đã đăng nhập
    if (requestUser && requestUser.id === regId) {
      const { error: profErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: regId,
            full_name: String(fullName).trim(),
            class_name: className || "TC10",
            phone: String(phone).trim(),
            attendance_status: resolvedRegType,
            shirt_size: shirtSize || "L (Nam)",
            delivery_address: address ? String(address).trim() : "",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (profErr) {
        return NextResponse.json(
          { success: false, error: `Lỗi lưu hồ sơ tham gia vào DB: ${profErr.message}` },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }
    }

    // 2. Cập nhật manifest thanh toán trên Cloud Storage (bảo toàn trạng thái confirmed/SePay nếu đã có)
    const manifest = await loadManifestRegistrations(supabase);
    const existingReg = manifest.find((r) => {
      if (r.id && r.id.toLowerCase() === regId.toLowerCase()) return true;
      const rPhone = cleanPhoneDigits(r.phone);
      if (cleanPhone.length >= 9 && rPhone === cleanPhone) return true;
      return false;
    });

    const newReg: RegistrationItem = {
      id: regId,
      fullName: String(fullName).trim(),
      className: (className || existingReg?.className || "TC10") as "TC10" | "TC11" | "TC12",
      phone: String(phone).trim(),
      shirtSize: shirtSize || existingReg?.shirtSize || "L (Nam)",
      address: address ? String(address).trim() : existingReg?.address || "TP. Hồ Chí Minh",
      avatarUrl: avatarUrl || existingReg?.avatarUrl || undefined,
      guestsCount:
        resolvedRegType === "shirt_only"
          ? 0
          : typeof guestsCount === "number"
          ? Number(guestsCount)
          : existingReg?.guestsCount || 0,
      registrationType: resolvedRegType,
      status:
        resolvedRegType === "attending_free" || existingReg?.status === "confirmed"
          ? "confirmed"
          : "pending",
      paidAmount:
        resolvedRegType === "attending_free"
          ? 0
          : Number(paidAmount) || existingReg?.paidAmount || defaultRegFee,
      createdAt: existingReg?.createdAt || body.createdAt || formatShortDate(new Date().toISOString()),
      confirmedAt: existingReg?.confirmedAt,
      paymentRef: existingReg?.paymentRef,
      note: note !== undefined ? String(note).trim() : existingReg?.note,
    };

    const updatedManifest = [
      newReg,
      ...manifest.filter((r) => {
        if (r.id && r.id.toLowerCase() === newReg.id.toLowerCase()) return false;
        const rPhone = cleanPhoneDigits(r.phone);
        if (cleanPhone.length >= 9 && rPhone === cleanPhone) return false;
        return true;
      }),
    ];

    const saved = await saveManifestRegistrations(updatedManifest, supabase);
    if (!saved.ok) {
      return NextResponse.json(
        { success: false, error: `Không thể lưu phiếu đăng ký lên Cloud: ${saved.error || "lỗi storage"}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const merged = await loadMergedRegistrations(supabase);
    return NextResponse.json(
      { success: true, registration: newReg, registrations: merged },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi máy chủ" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// PUT /api/registrations - Duyệt thanh toán (Admin) hoặc cập nhật phiếu đăng ký
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = getServerSupabase(req);
    const body = await req.json();
    const { id, status, paidAmount, paymentRef, note, shirtSize, address, guestsCount } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID đăng ký" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Đọc danh sách hợp nhất để có thể duyệt cả những người mới lưu ở bảng profiles chưa có trong manifest
    const mergedList = await loadMergedRegistrations(supabase);
    const target = mergedList.find((item) => item.id === id);
    if (!target) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy phiếu đăng ký" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const updatedItem: RegistrationItem = {
      ...target,
      status: status || target.status,
      paidAmount:
        target.registrationType === "attending_free"
          ? 0
          : typeof paidAmount === "number"
          ? paidAmount
          : target.paidAmount,
      paymentRef: paymentRef || target.paymentRef,
      shirtSize: shirtSize || target.shirtSize,
      address: address !== undefined ? address : target.address,
      guestsCount:
        typeof guestsCount === "number" && Number.isFinite(guestsCount)
          ? Math.max(0, Math.min(20, Math.floor(guestsCount)))
          : target.guestsCount,
      confirmedAt:
        status === "confirmed"
          ? body.confirmedAt || new Date().toISOString()
          : status === "pending"
          ? undefined
          : target.confirmedAt,
      note: note !== undefined ? note : target.note,
    };

    const manifest = await loadManifestRegistrations(supabase);
    const targetPhone = cleanPhoneDigits(updatedItem.phone);
    const nextManifest = [
      updatedItem,
      ...manifest.filter((item) => {
        if (item.id && item.id.toLowerCase() === id.toLowerCase()) return false;
        const iPhone = cleanPhoneDigits(item.phone);
        if (targetPhone.length >= 9 && iPhone === targetPhone) return false;
        return true;
      }),
    ];

    const saved = await saveManifestRegistrations(nextManifest, supabase);
    if (!saved.ok) {
      return NextResponse.json(
        { success: false, error: `Không thể lưu lên Cloud: ${saved.error || "lỗi storage"}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // Nếu Admin cập nhật size áo/địa chỉ hoặc xác nhận -> đồng bộ vào bảng profiles (giữ nguyên loại shirt_only nếu là đặt áo)
    if (!id.startsWith("reg-") && !id.startsWith("profile-")) {
      const profilePatch: Record<string, any> = { updated_at: new Date().toISOString() };
      if (shirtSize) profilePatch.shirt_size = shirtSize;
      if (address !== undefined) profilePatch.delivery_address = address;
      if (status === "confirmed") {
        profilePatch.attendance_status =
          updatedItem.registrationType === "attending_free"
            ? "attending_free"
            : updatedItem.registrationType === "shirt_only"
            ? "shirt_only"
            : "attending";
      }
      if (Object.keys(profilePatch).length > 1) {
        await supabase.from("profiles").update(profilePatch).eq("id", id);
      }
    }

    const latest = await loadMergedRegistrations(supabase);
    return NextResponse.json(
      { success: true, registration: updatedItem, registrations: latest },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi máy chủ" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// DELETE /api/registrations?id=... - Xóa phiếu đăng ký (Admin hoặc chính chủ hủy tham gia)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const requestUser = await getRequestUser(req);
    const isDevAdmin =
      process.env.NODE_ENV === "development" &&
      req.cookies.get("tcdn4_dev_mode")?.value === "admin";
    const callerIsAdmin = isDevAdmin || (await isAdminUser(requestUser, req));
    const isOwner = Boolean(requestUser && requestUser.id === id);

    if (!callerIsAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Bạn không có quyền xóa phiếu đăng ký này" },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const supabase = getServerSupabase(req);

    // 1. Xóa khỏi manifest trên Cloud Storage
    const removed = await removeRegistrationFromManifest(id, supabase);
    if (!removed.ok) {
      return NextResponse.json(
        { success: false, error: `Không thể xóa phiếu đăng ký trên Cloud: ${removed.error}` },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // 2. Đồng thời cập nhật bảng profiles thành not_attending để không bị tự động hiện lại
    if (!id.startsWith("reg-") && !id.startsWith("profile-")) {
      await supabase
        .from("profiles")
        .update({
          attendance_status: "not_attending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    const latest = await loadMergedRegistrations(supabase);
    return NextResponse.json(
      { success: true, registrations: latest },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi máy chủ" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
