import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Profile } from "@/types/database";

export const BUCKET_NAME = "alumni-media";
export const REGISTRATIONS_MANIFEST_PATH = "registrations/registrations-manifest.json";

export const VALID_PROFILE_COLUMNS = [
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
] as const;

export const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

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

export interface AlumniStats {
  checkedInCount: number;
  attendingCount: number;
  confirmedCount: number;
  pendingCount: number;
  singleCount: number;
  classCounts: {
    all: number;
    TC10: number;
    TC11: number;
    TC12: number;
  };
  regionCounts: {
    all: number;
    hcm: number;
    hn: number;
    other: number;
    overseas: number;
  };
}

export function cleanPhoneDigits(phone?: string | null): string {
  return (phone || "").replace(/[^0-9]/g, "");
}

export function normalizeRegion(
  region?: string | null,
  specificLocation?: string | null
): "hcm" | "hn" | "other" | "overseas" {
  const r = (region || "").trim().toLowerCase();
  const s = (specificLocation || "").trim().toLowerCase();

  if (r === "hn" || r.includes("hà nội")) return "hn";
  if (
    r === "overseas" ||
    r.includes("nước ngoài") ||
    r.includes("ngoại") ||
    /úc|australia|mỹ|usa|singapore|canada|đức|pháp|nhật|hàn|châu âu/i.test(s)
  ) {
    return "overseas";
  }
  if (r === "dn" || r === "other" || r.includes("đà nẵng") || r.includes("tỉnh")) {
    return "other";
  }
  if (s.includes("hà nội")) return "hn";
  if (/đà nẵng|nha trang|huế|cần thơ|hải phòng|bình dương|đồng nai|vũng tàu|đà lạt|lâm đồng|quảng nam|quy nhơn/i.test(s)) {
    return "other";
  }
  return "hcm";
}

export function formatShortDate(isoOrStr?: string | null): string {
  if (!isoOrStr) {
    return new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  }
  if (isoOrStr.includes("T") || isoOrStr.length > 10) {
    const d = new Date(isoOrStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    }
  }
  return isoOrStr;
}

/**
 * Đọc toàn bộ hồ sơ cựu sinh viên trực tiếp từ bảng public.profiles trên Supabase.
 * Nguồn chân lý duy nhất (không trộn file local/localStorage).
 */
export async function loadProfilesFromDb(client?: SupabaseClient): Promise<Profile[]> {
  const supabase = client || getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[loadProfilesFromDb] Supabase error:", error.message);
    return [];
  }
  return (data || []) as Profile[];
}

/**
 * Đọc danh sách manifest đăng ký/thanh toán từ Supabase Storage (Cloud).
 */
export async function loadManifestRegistrations(client?: SupabaseClient): Promise<RegistrationItem[]> {
  const supabase = client || getSupabaseAdmin();

  try {
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(REGISTRATIONS_MANIFEST_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const parsed = JSON.parse(await res.text());
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // fallback download SDK
  }

  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(REGISTRATIONS_MANIFEST_PATH);
    if (!error && data) {
      const parsed = JSON.parse(await data.text());
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // empty
  }

  return [];
}

/**
 * Lưu manifest đăng ký/thanh toán lên Supabase Storage (Cloud).
 */
export async function saveManifestRegistrations(
  items: RegistrationItem[],
  client?: SupabaseClient
): Promise<{ ok: boolean; error?: string }> {
  const supabase = client || getSupabaseAdmin();
  const json = JSON.stringify(items, null, 2);

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(REGISTRATIONS_MANIFEST_PATH, Buffer.from(json, "utf-8"), {
        contentType: "application/json; charset=utf-8",
        upsert: true,
        cacheControl: "0",
      });
    if (error) {
      console.error("[saveManifestRegistrations] Storage upload error:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    console.error("[saveManifestRegistrations] Exception:", err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Hợp nhất sạch sẽ giữa bảng public.profiles (nguồn chân lý về danh tính, size áo, địa chỉ, tham gia)
 * và manifest thanh toán (trạng thái confirmed/pending, số tiền, mã GD SePay, số khách F1).
 */
export async function loadMergedRegistrations(
  client?: SupabaseClient,
  preloadedProfiles?: Profile[]
): Promise<RegistrationItem[]> {
  const [profiles, manifest] = await Promise.all([
    preloadedProfiles ? Promise.resolve(preloadedProfiles) : loadProfilesFromDb(client),
    loadManifestRegistrations(client),
  ]);

  const result: RegistrationItem[] = [];
  const consumedManifestIndexes = new Set<number>();

  // 1. Duyệt từng thành viên trong database profiles
  for (const p of profiles) {
    const pId = (p.id || "").toLowerCase();
    const pPhone = cleanPhoneDigits(p.phone);

    // Tìm phiếu thanh toán tương ứng trong manifest (theo ID hoặc SĐT >= 9 số)
    const manifestIdx = manifest.findIndex((m, idx) => {
      if (consumedManifestIndexes.has(idx)) return false;
      const mId = (m.id || "").toLowerCase();
      const mPhone = cleanPhoneDigits(m.phone);
      if (pId && mId && pId === mId) return true;
      if (pPhone.length >= 9 && mPhone && pPhone === mPhone) return true;
      return false;
    });

    const matchedManifest = manifestIdx >= 0 ? manifest[manifestIdx] : null;
    if (manifestIdx >= 0) {
      consumedManifestIndexes.add(manifestIdx);
    }

    // Nếu người dùng đã chủ động chọn KHÔNG tham gia -> loại bỏ khỏi danh sách tham dự
    if (p.attendance_status === "not_attending") {
      continue;
    }

    // Chỉ đưa vào danh sách tham dự nếu:
    // - Người dùng đã chọn attendance_status === "attending" trong DB, HOẶC
    // - Đã có phiếu đăng ký (đặc biệt là đã xác nhận thanh toán) trong manifest
    const shouldInclude = p.attendance_status === "attending" || Boolean(matchedManifest);
    if (!shouldInclude) continue;

    const resolvedName = (p.full_name || matchedManifest?.fullName || "").trim();
    if (!resolvedName) continue;

    const resolvedAddress =
      (p.delivery_address || "").trim() ||
      (matchedManifest?.address || "").trim() ||
      (p.specific_location || "").trim() ||
      (p.location_region === "hn"
        ? "Hà Nội"
        : p.location_region === "overseas"
        ? "Nước ngoài"
        : "TP. Hồ Chí Minh");

    result.push({
      id: p.id,
      fullName: resolvedName,
      className: ((p.class_name || matchedManifest?.className || "TC10") as "TC10" | "TC11" | "TC12"),
      phone: (p.phone || matchedManifest?.phone || "").trim(),
      shirtSize: (p.shirt_size || matchedManifest?.shirtSize || "L (Nam)").trim(),
      address: resolvedAddress,
      avatarUrl: p.avatar_url || matchedManifest?.avatarUrl || undefined,
      guestsCount: typeof matchedManifest?.guestsCount === "number" ? matchedManifest.guestsCount : 0,
      status: matchedManifest?.status === "confirmed" ? "confirmed" : "pending",
      paidAmount: Number(matchedManifest?.paidAmount) > 0 ? Number(matchedManifest?.paidAmount) : 1000000,
      createdAt: matchedManifest?.createdAt || formatShortDate((p as any).created_at),
      confirmedAt: matchedManifest?.confirmedAt,
      paymentRef: matchedManifest?.paymentRef,
      note: matchedManifest?.note,
    });
  }

  // 2. Giữ lại các phiếu đăng ký khách/cũ trong manifest chưa gắn với profile nào
  manifest.forEach((m, idx) => {
    if (consumedManifestIndexes.has(idx)) return;
    if (!m.fullName) return;
    result.push({
      ...m,
      guestsCount: typeof m.guestsCount === "number" ? m.guestsCount : 0,
      paidAmount: Number(m.paidAmount) > 0 ? Number(m.paidAmount) : 1000000,
    });
  });

  return result;
}

/**
 * Đồng bộ thay đổi từ hồ sơ thành viên (Profile / Admin Edit) sang manifest đăng ký sự kiện.
 */
export async function syncProfileToRegistrations(
  profile: Partial<Profile> & { id: string },
  client?: SupabaseClient
): Promise<void> {
  const manifest = await loadManifestRegistrations(client);
  const pId = profile.id.toLowerCase();
  const pPhone = cleanPhoneDigits(profile.phone);

  const existingIdx = manifest.findIndex((item) => {
    const iId = (item.id || "").toLowerCase();
    const iPhone = cleanPhoneDigits(item.phone);
    if (pId && iId === pId) return true;
    if (pPhone.length >= 9 && iPhone && pPhone === iPhone) return true;
    return false;
  });

  let changed = false;

  if (profile.attendance_status === "not_attending") {
    if (existingIdx >= 0) {
      manifest.splice(existingIdx, 1);
      changed = true;
    }
  } else if (profile.attendance_status === "attending") {
    const existing = existingIdx >= 0 ? manifest[existingIdx] : null;
    const entry: RegistrationItem = {
      id: profile.id,
      fullName: (profile.full_name || existing?.fullName || "Thành viên K33").trim(),
      className: ((profile.class_name || existing?.className || "TC10") as "TC10" | "TC11" | "TC12"),
      phone: (profile.phone || existing?.phone || "").trim(),
      shirtSize: (profile.shirt_size || existing?.shirtSize || "L (Nam)").trim(),
      address:
        (profile.delivery_address || "").trim() ||
        existing?.address ||
        (profile.specific_location || "").trim() ||
        "TP. Hồ Chí Minh",
      avatarUrl: profile.avatar_url || existing?.avatarUrl || undefined,
      guestsCount: existing?.guestsCount ?? 0,
      status: existing?.status === "confirmed" ? "confirmed" : "pending",
      paidAmount: existing?.paidAmount || 1000000,
      createdAt: existing?.createdAt || formatShortDate(new Date().toISOString()),
      confirmedAt: existing?.confirmedAt,
      paymentRef: existing?.paymentRef,
      note: existing?.note,
    };

    if (existingIdx >= 0) {
      manifest[existingIdx] = entry;
    } else {
      manifest.unshift(entry);
    }
    changed = true;
  } else if (existingIdx >= 0) {
    // Chỉ cập nhật thông tin cá nhân nếu thành viên này đã có phiếu đăng ký từ trước
    const item = manifest[existingIdx];
    if (profile.full_name) item.fullName = profile.full_name.trim();
    if (profile.class_name) item.className = profile.class_name as any;
    if (profile.phone !== undefined) item.phone = (profile.phone || "").trim();
    if (profile.avatar_url !== undefined) item.avatarUrl = profile.avatar_url || undefined;
    if (profile.shirt_size) item.shirtSize = profile.shirt_size.trim();
    if (profile.delivery_address !== undefined && profile.delivery_address !== null) {
      const addr = profile.delivery_address.trim();
      if (addr) item.address = addr;
    }
    item.id = profile.id;
    changed = true;
  }

  if (changed) {
    await saveManifestRegistrations(manifest, client);
  }
}

/**
 * Xóa phiếu đăng ký khỏi manifest theo ID hoặc SĐT (khi Admin xóa thành viên hoặc xóa phiếu đăng ký).
 */
export async function removeRegistrationFromManifest(
  id: string,
  client?: SupabaseClient,
  phone?: string | null
): Promise<{ ok: boolean; error?: string; registrations: RegistrationItem[] }> {
  const manifest = await loadManifestRegistrations(client);
  const targetId = id.toLowerCase();
  const targetPhone = cleanPhoneDigits(phone);

  const next = manifest.filter((item) => {
    if ((item.id || "").toLowerCase() === targetId) return false;
    if (targetPhone.length >= 9 && cleanPhoneDigits(item.phone) === targetPhone) return false;
    return true;
  });

  const saved = await saveManifestRegistrations(next, client);
  return { ok: saved.ok, error: saved.error, registrations: next };
}

const ZALO_CHECKINS_PATH = "settings/zalo-checkins.json";

/**
 * Xóa dấu vết đã báo Zalo điểm danh của thành viên (dùng khi Admin xóa thành viên để tạo lại / test lại).
 */
export async function removeZaloCheckinRecords(
  info: { id?: string | null; phone?: string | null; fullName?: string | null },
  client?: SupabaseClient
): Promise<void> {
  const supabase = client || getSupabaseAdmin();
  let list: string[] = [];

  try {
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(ZALO_CHECKINS_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const parsed = JSON.parse(await res.text());
        if (Array.isArray(parsed)) list = parsed;
      }
    }
  } catch {}

  if (list.length === 0) return;

  const keysToRemove = new Set<string>();
  if (info.id) keysToRemove.add(`user_${info.id}`);
  const digits = cleanPhoneDigits(info.phone);
  if (digits) keysToRemove.add(`phone_${digits}`);
  const cleanName = (info.fullName || "").toLowerCase().trim();
  if (cleanName) keysToRemove.add(`name_${cleanName}`);

  const next = list.filter((k) => !keysToRemove.has(k));
  if (next.length === list.length) return;

  try {
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(ZALO_CHECKINS_PATH, Buffer.from(JSON.stringify(next, null, 2), "utf-8"), {
        contentType: "application/json; charset=utf-8",
        upsert: true,
        cacheControl: "0",
      });
  } catch {}
}

/**
 * Tính toán toàn bộ các chỉ số thống kê chuẩn từ dữ liệu gốc DB.
 * Dùng chung cho Hero, EventSection, AlumniDirectory, MigrationMap.
 */
export function computeAlumniStats(
  profiles: Profile[],
  registrations: RegistrationItem[]
): AlumniStats {
  const classCounts = { all: profiles.length, TC10: 0, TC11: 0, TC12: 0 };
  const regionCounts = { all: profiles.length, hcm: 0, hn: 0, other: 0, overseas: 0 };
  let singleCount = 0;

  for (const p of profiles) {
    const cls = (p.class_name || "TC10").toUpperCase();
    if (cls === "TC10") classCounts.TC10++;
    else if (cls === "TC11") classCounts.TC11++;
    else if (cls === "TC12") classCounts.TC12++;

    const region = normalizeRegion(p.location_region, p.specific_location);
    regionCounts[region]++;

    if (p.marital_status === "single") {
      singleCount++;
    }
  }

  const confirmedCount = registrations.filter((r) => r.status === "confirmed").length;
  const pendingCount = registrations.length - confirmedCount;

  return {
    checkedInCount: profiles.length,
    attendingCount: registrations.length,
    confirmedCount,
    pendingCount,
    singleCount,
    classCounts,
    regionCounts,
  };
}
