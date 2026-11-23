import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { loadRegistrations, saveRegistrations } from "@/app/api/registrations/route";
import fs from "fs";
import path from "path";

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

const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_PROFILES_PATH = path.join(LOCAL_DATA_DIR, "profiles.json");
const LOCAL_REGISTRATIONS_PATH = path.join(LOCAL_DATA_DIR, "registrations.json");

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function ensureDataDir() {
  try {
    if (!fs.existsSync(LOCAL_DATA_DIR)) {
      fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
    }
  } catch {}
}

export function loadLocalProfiles(): Record<string, any> {
  ensureDataDir();
  try {
    if (fs.existsSync(LOCAL_PROFILES_PATH)) {
      const text = fs.readFileSync(LOCAL_PROFILES_PATH, "utf-8");
      const parsed = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    }
  } catch {}
  return {};
}

export function saveLocalProfiles(map: Record<string, any>) {
  ensureDataDir();
  try {
    fs.writeFileSync(LOCAL_PROFILES_PATH, JSON.stringify(map, null, 2), "utf-8");
  } catch (err) {
    console.error("Lỗi lưu file local profiles.json:", err);
  }
}

// Lấy Supabase client với Bearer Token của user (nếu có) để vượt qua RLS
function getSupabaseWithAuth(req: NextRequest): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tijbvigtbmecwgoacdlu.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    return createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return getSupabaseAdmin();
}

// GET /api/profile?id=...&all=true
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all") === "true";

    const localMap = loadLocalProfiles();

    if (all) {
      // Đọc toàn bộ danh sách thành viên từ Supabase DB
      const supabase = getSupabaseAdmin();
      let dbProfiles: any[] = [];
      try {
        const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
        if (Array.isArray(data)) dbProfiles = data;
      } catch {}

      // Hợp nhất với local profiles
      const mergedMap: Record<string, any> = { ...localMap };
      for (const p of dbProfiles) {
        if (p.id) {
          mergedMap[p.id] = { ...p, ...(mergedMap[p.id] || {}) };
        }
      }

      return NextResponse.json(
        { success: true, profiles: Object.values(mergedMap) },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Thiếu ID thành viên" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Kiểm tra trong Supabase DB
    const supabase = getSupabaseWithAuth(req);
    let profileFromDb: any = null;
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (!error && data) profileFromDb = data;
    } catch {}

    // 2. Kiểm tra trong local profiles
    const profileFromLocal = localMap[id] || null;

    // Hợp nhất dữ liệu, ưu tiên dữ liệu mới hơn
    const merged = {
      ...(profileFromDb || {}),
      ...(profileFromLocal || {}),
    };

    if (Object.keys(merged).length === 0) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy hồ sơ" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, profile: merged },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi đọc hồ sơ" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

// POST /api/profile
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

    // 1. Lưu vào file local profiles.json (bảo đảm dữ liệu bền vững 100%)
    const localMap = loadLocalProfiles();
    const existingLocal = localMap[id] || {};
    const mergedProfile = { ...existingLocal, ...cleanUpdates };
    localMap[id] = mergedProfile;
    saveLocalProfiles(localMap);

    // 2. Thử lưu vào Supabase DB với Authorization token của user
    const supabase = getSupabaseWithAuth(req);
    try {
      await supabase.from("profiles").upsert(cleanUpdates);
    } catch (dbErr) {
      console.warn("Lưu Supabase profiles cảnh báo:", dbErr);
    }

    // 3. ĐỒNG BỘ TÊN, SIZE ÁO VÀ THÔNG TIN VÀO DANH SÁCH ĐĂNG KÝ 15 NĂM (CLOUD + LOCAL)
    try {
      const regList = await loadRegistrations(supabase);
      if (Array.isArray(regList) && regList.length > 0) {
        let hasRegChanged = false;
        const cleanPhone = (cleanUpdates.phone || mergedProfile.phone || "").replace(/[^0-9]/g, "");

        for (let i = 0; i < regList.length; i++) {
          const item = regList[i];
          const itemPhone = (item.phone || "").replace(/[^0-9]/g, "");
          const matchId = item.id && item.id.toLowerCase() === id.toLowerCase();
          const matchPhone = cleanPhone && cleanPhone.length >= 9 && itemPhone === cleanPhone;

          if (matchId || matchPhone) {
            if (cleanUpdates.full_name) {
              item.fullName = cleanUpdates.full_name.trim();
            }
            if (cleanUpdates.class_name) {
              item.className = cleanUpdates.class_name;
            }
            if (cleanUpdates.avatar_url) {
              item.avatarUrl = cleanUpdates.avatar_url;
            }
            if (cleanUpdates.shirt_size) {
              item.shirtSize = cleanUpdates.shirt_size;
            }
            if (cleanUpdates.delivery_address) {
              item.address = cleanUpdates.delivery_address.trim();
            }
            hasRegChanged = true;
          }
        }

        if (hasRegChanged) {
          await saveRegistrations(regList, supabase);
        }
      }
    } catch (regSyncErr) {
      console.warn("Lỗi đồng bộ registration khi đổi profile:", regSyncErr);
    }

    return NextResponse.json(
      { success: true, profile: mergedProfile },
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
