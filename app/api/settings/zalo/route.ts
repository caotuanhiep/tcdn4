import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { requireAdmin } from "@/lib/supabase/requestAuth";

const BUCKET_NAME = "alumni-media";
const CONFIG_PATH = "settings/zalo-bot-config.json";
const LOCAL_CONFIG_PATH = path.join(process.cwd(), "data", "zalo-bot-config.json");

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export interface ZaloGroupConfigItem {
  id: string;
  name: string;
  link?: string;
  verifyCode: string;
  chatId?: string;
  status: "verified" | "pending";
  isDefault: boolean;
  receiveCheckin: boolean;
  receiveRegistration: boolean;
  receiveBirthday: boolean;
  createdAt: string;
  verifiedAt?: string;
}

export interface ZaloBotConfig {
  botToken: string;
  webhookUrl: string;
  botName: string;
  isTokenValid: boolean;
  aiApiKey?: string;
  autoCheckin?: boolean;
  autoRegistration?: boolean;
  autoBirthday?: boolean;
  birthdayHour?: string;
  checkinTemplate?: string;
  registrationTemplate?: string;
  birthdayTemplate?: string;
  groups?: ZaloGroupConfigItem[];
  updatedAt?: number;
  updatedBy?: string;
}

export const DEFAULT_ZALO_CONFIG: ZaloBotConfig = {
  botToken: "",
  webhookUrl: "",
  botName: "TCDN4 K33 Bot",
  isTokenValid: true,
  aiApiKey: "",
  groups: [
    {
      id: "grp-all",
      name: "TCDN4 - Toàn Khóa K33",
      link: "https://zalo.me/g/yodibu606",
      verifyCode: "#TCDN4-ALL",
      status: "verified",
      isDefault: true,
      receiveCheckin: true,
      receiveRegistration: true,
      receiveBirthday: true,
      createdAt: "18/11/2026",
    },
    {
      id: "grp-tc10",
      name: "Lớp TC10 - K33 UEH",
      link: "",
      verifyCode: "#TCDN4-TC10",
      status: "verified",
      isDefault: false,
      receiveCheckin: true,
      receiveRegistration: true,
      receiveBirthday: true,
      createdAt: "18/11/2026",
    },
    {
      id: "grp-tc11",
      name: "Lớp TC11 - K33 UEH",
      link: "",
      verifyCode: "#TCDN4-TC11",
      status: "verified",
      isDefault: false,
      receiveCheckin: true,
      receiveRegistration: true,
      receiveBirthday: true,
      createdAt: "18/11/2026",
    },
    {
      id: "grp-tc12",
      name: "Lớp TC12 - K33 UEH",
      link: "",
      verifyCode: "#TCDN4-TC12",
      status: "verified",
      isDefault: false,
      receiveCheckin: true,
      receiveRegistration: true,
      receiveBirthday: true,
      createdAt: "18/11/2026",
    },
    {
      id: "grp-bll",
      name: "Ban Liên Lạc & Tổ Hậu Cần",
      link: "",
      verifyCode: "#TCDN4-BLL",
      status: "verified",
      isDefault: false,
      receiveCheckin: false,
      receiveRegistration: true,
      receiveBirthday: false,
      createdAt: "18/11/2026",
    },
  ],
};

function getStorageClient(req?: NextRequest): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  if (req) {
    return createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
    }) as unknown as SupabaseClient;
  }
  return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadZaloBotConfig(): Promise<ZaloBotConfig> {
  let localConfig: ZaloBotConfig | null = null;
  let remoteConfig: ZaloBotConfig | null = null;

  try {
    if (fs.existsSync(LOCAL_CONFIG_PATH)) {
      localConfig = JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, "utf-8"));
    }
  } catch {}

  const supabase = getStorageClient();
  try {
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(CONFIG_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        remoteConfig = JSON.parse(await res.text());
      }
    }
  } catch {}

  if (!remoteConfig) {
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download(CONFIG_PATH);
      if (!error && data) {
        remoteConfig = JSON.parse(await data.text());
      }
    } catch {}
  }

  let chosen = DEFAULT_ZALO_CONFIG;
  if (localConfig && remoteConfig) {
    const localTime = localConfig.updatedAt || 0;
    const remoteTime = remoteConfig.updatedAt || 0;
    chosen =
      localTime >= remoteTime
        ? { ...DEFAULT_ZALO_CONFIG, ...remoteConfig, ...localConfig }
        : { ...DEFAULT_ZALO_CONFIG, ...localConfig, ...remoteConfig };
  } else if (localConfig) {
    chosen = { ...DEFAULT_ZALO_CONFIG, ...localConfig };
  } else if (remoteConfig) {
    chosen = { ...DEFAULT_ZALO_CONFIG, ...remoteConfig };
  }

  return chosen;
}

export async function saveZaloBotConfig(
  patch: Partial<ZaloBotConfig>,
  userEmail?: string,
  req?: NextRequest
): Promise<{ success: boolean; config: ZaloBotConfig; cloudSynced: boolean }> {
  const current = await loadZaloBotConfig();
  const updated: ZaloBotConfig = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
    updatedBy: userEmail || current.updatedBy || "system",
  };

  const json = JSON.stringify(updated, null, 2);

  let cloudOk = false;
  try {
    const supabase = getStorageClient(req);
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(CONFIG_PATH, Buffer.from(json, "utf-8"), {
      contentType: "application/json; charset=utf-8",
      upsert: true,
      cacheControl: "0",
    });
    if (!error) cloudOk = true;
  } catch {}

  try {
    const dir = path.dirname(LOCAL_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_CONFIG_PATH, json, "utf-8");
  } catch {}

  return { success: true, config: updated, cloudSynced: cloudOk };
}

// GET /api/settings/zalo - Lấy cấu hình Bot Nhóm Zalo
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status, headers: NO_STORE_HEADERS });
  }

  const config = await loadZaloBotConfig();
  return NextResponse.json(
    { success: true, config },
    { headers: NO_STORE_HEADERS }
  );
}

// PUT /api/settings/zalo - Cập nhật cấu hình Bot Nhóm Zalo (Token, Webhook URL, Mẫu tin nhắn)
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status, headers: NO_STORE_HEADERS });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Dữ liệu JSON không hợp lệ" }, { status: 400 });
  }

  const { config: updated, cloudSynced: cloudOk } = await saveZaloBotConfig(
    body,
    auth.user.email || auth.user.id,
    req
  );

  return NextResponse.json(
    {
      success: true,
      message: "Đã lưu cấu hình Bot Nhóm Zalo thành công!",
      cloudSynced: cloudOk,
      config: updated,
    },
    { headers: NO_STORE_HEADERS }
  );
}
