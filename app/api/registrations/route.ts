import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const BUCKET_NAME = "alumni-media";
const REGISTRATIONS_PATH = "registrations/registrations-manifest.json";
const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_REGISTRATIONS_PATH = path.join(LOCAL_DATA_DIR, "registrations.json");

export interface RegistrationItem {
  id: string;
  fullName: string;
  className: "TC10" | "TC11" | "TC12";
  phone: string;
  shirtSize: string;
  address: string;
  avatarUrl?: string;
  guestsCount?: number;
  status: "confirmed" | "pending";
  paidAmount: number;
  createdAt: string;
  confirmedAt?: string;
  paymentRef?: string;
  note?: string;
}

function ensureDataDir() {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
  } catch {}
}

export function getStorageClient(req?: NextRequest): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  if (req) {
    return createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    }) as unknown as SupabaseClient;
  }
  return getSupabaseAdmin();
}

export async function loadRegistrations(client?: SupabaseClient): Promise<RegistrationItem[]> {
  let stored: RegistrationItem[] = [];

  // 1. Đọc từ Cloud Supabase Storage với cache-buster
  try {
    const supabase = client || getSupabaseAdmin();
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(REGISTRATIONS_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) stored = parsed;
      }
    }
  } catch {}

  if (stored.length === 0) {
    try {
      const supabase = client || getSupabaseAdmin();
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download(REGISTRATIONS_PATH);
      if (!error && data) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) stored = parsed;
      }
    } catch {}
  }

  // 2. Fallback đọc từ local file
  if (stored.length === 0) {
    try {
      if (fs.existsSync(LOCAL_REGISTRATIONS_PATH)) {
        const text = fs.readFileSync(LOCAL_REGISTRATIONS_PATH, "utf-8");
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) stored = parsed;
      }
    } catch {}
  }

  // 3. Tự động hợp nhất thành viên đã điểm danh từ bảng profiles trong Supabase
  try {
    const supabase = client || getSupabaseAdmin();
    const { data: dbProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, class_name, phone, shirt_size, delivery_address, specific_location, location_region, avatar_url, attendance_status, created_at");

    if (dbProfiles && dbProfiles.length > 0) {
      const mergedList = [...stored];
      for (const p of dbProfiles) {
        if (!p.full_name) continue;
        if (p.attendance_status === "not_attending") continue;

        const phoneKey = p.phone ? p.phone.trim().toLowerCase() : "";
        const nameKey = p.full_name.trim().toLowerCase();
        const idKey = p.id ? p.id.toLowerCase() : "";

        const alreadyExists = mergedList.some((item) => {
          const itemPhone = item.phone ? item.phone.trim().toLowerCase() : "";
          const itemId = item.id ? item.id.toLowerCase() : "";
          const itemName = item.fullName ? item.fullName.trim().toLowerCase() : "";

          if (phoneKey && itemPhone && phoneKey === itemPhone) return true;
          if (idKey && itemId && idKey === itemId) return true;
          if (nameKey && itemName && nameKey === itemName) {
            const phoneConflict = phoneKey && itemPhone && phoneKey !== itemPhone;
            const idConflict = idKey && itemId && idKey !== itemId;
            if (!phoneConflict && !idConflict) return true;
          }
          return false;
        });

        if (!alreadyExists) {
          const address =
            p.delivery_address?.trim() ||
            p.specific_location?.trim() ||
            (p.location_region === "hn" ? "Hà Nội" :
             p.location_region === "overseas" ? "Nước ngoài" :
             "TP. Hồ Chí Minh");

          mergedList.push({
            id: p.id || `profile-${Date.now()}`,
            fullName: p.full_name.trim(),
            className: (p.class_name as any) || "TC10",
            phone: p.phone?.trim() || "",
            shirtSize: p.shirt_size || "L (Nam)",
            address: address,
            avatarUrl: p.avatar_url || undefined,
            guestsCount: 0,
            status: "pending",
            paidAmount: 1000000,
            createdAt: p.created_at
              ? new Date(p.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
              : new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
          });
        }
      }

      return mergedList;
    }
  } catch (err) {
    console.error("loadRegistrations profiles merge error:", err);
  }

  return stored;
}

export async function saveRegistrations(items: RegistrationItem[], client?: SupabaseClient): Promise<boolean> {
  const json = JSON.stringify(items, null, 2);
  let localOk = false;
  let cloudOk = false;

  try {
    ensureDataDir();
    fs.writeFileSync(LOCAL_REGISTRATIONS_PATH, json, "utf-8");
    localOk = true;
  } catch {}

  try {
    const supabase = client || getSupabaseAdmin();
    const buffer = Buffer.from(json, "utf-8");
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(
      REGISTRATIONS_PATH,
      buffer,
      {
        contentType: "application/json; charset=utf-8",
        upsert: true,
        cacheControl: "0",
      }
    );
    if (!error) cloudOk = true;
  } catch {}

  return cloudOk || localOk;
}

// GET /api/registrations - Lấy danh sách đăng ký
export async function GET(req: NextRequest) {
  const supabase = getStorageClient(req);
  const items = await loadRegistrations(supabase);
  return NextResponse.json(
    { success: true, registrations: items, items: items },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}

// POST /api/registrations - Thêm mới đăng ký tham gia
export async function POST(req: NextRequest) {
  try {
    const supabase = getStorageClient(req);
    const body = await req.json();
    const { fullName, className, phone, shirtSize, address, avatarUrl, guestsCount, paidAmount, note } = body;

    if (!fullName || !phone) {
      return NextResponse.json({ success: false, error: "Thiếu họ tên hoặc số điện thoại" }, { status: 400 });
    }

    const currentList = await loadRegistrations(supabase);
    const newReg: RegistrationItem = {
      id: body.id || `reg-${Date.now()}`,
      fullName: String(fullName).trim(),
      className: (className as any) || "TC10",
      phone: String(phone).trim(),
      shirtSize: shirtSize || "L (Nam)",
      address: address ? String(address).trim() : "TP. Hồ Chí Minh",
      avatarUrl: avatarUrl || undefined,
      guestsCount: Number(guestsCount) || 0,
      status: (body.status as any) || "pending",
      paidAmount: Number(paidAmount) || 1000000,
      createdAt: body.createdAt || new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      note: note ? String(note).trim() : undefined,
    };

    const updated = [newReg, ...currentList.filter((r) => r.id !== newReg.id)];
    await saveRegistrations(updated, supabase);

    return NextResponse.json({ success: true, registration: newReg, registrations: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

// PUT /api/registrations - Cập nhật trạng thái (Duyệt thanh toán / SePay Webhook)
export async function PUT(req: NextRequest) {
  try {
    const supabase = getStorageClient(req);
    const body = await req.json();
    const { id, status, paidAmount, paymentRef, note } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID đăng ký" }, { status: 400 });
    }

    const currentList = await loadRegistrations(supabase);
    let matched = false;

    const updated = currentList.map((item) => {
      if (item.id === id) {
        matched = true;
        return {
          ...item,
          status: status || item.status,
          paidAmount: typeof paidAmount === "number" ? paidAmount : item.paidAmount,
          paymentRef: paymentRef || item.paymentRef,
          confirmedAt: status === "confirmed" ? (body.confirmedAt || new Date().toISOString()) : item.confirmedAt,
          note: note !== undefined ? note : item.note,
        };
      }
      return item;
    });

    if (!matched) {
      return NextResponse.json({ success: false, error: "Không tìm thấy phiếu đăng ký" }, { status: 404 });
    }

    await saveRegistrations(updated, supabase);
    return NextResponse.json({ success: true, registrations: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}

// DELETE /api/registrations - Xóa phiếu đăng ký
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getStorageClient(req);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Thiếu ID" }, { status: 400 });
    }

    const currentList = await loadRegistrations(supabase);
    const updated = currentList.filter((item) => item.id !== id);
    await saveRegistrations(updated, supabase);

    return NextResponse.json({ success: true, registrations: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Lỗi máy chủ" }, { status: 500 });
  }
}
