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

export interface ZaloBotConfig {
  botToken: string;
  webhookUrl: string;
  botName: string;
  isTokenValid: boolean;
  autoCheckin?: boolean;
  autoRegistration?: boolean;
  autoBirthday?: boolean;
  birthdayHour?: string;
  checkinTemplate?: string;
  registrationTemplate?: string;
  birthdayTemplate?: string;
  groups?: any[];
  updatedAt?: number;
  updatedBy?: string;
}

export const DEFAULT_ZALO_CONFIG: ZaloBotConfig = {
  botToken: "",
  webhookUrl: "",
  botName: "TCDN4 K33 Bot",
  isTokenValid: true,
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
  const supabase = getStorageClient();
  try {
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(CONFIG_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const parsed = JSON.parse(await res.text());
        return { ...DEFAULT_ZALO_CONFIG, ...parsed };
      }
    }
  } catch {}

  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(CONFIG_PATH);
    if (!error && data) {
      const parsed = JSON.parse(await data.text());
      return { ...DEFAULT_ZALO_CONFIG, ...parsed };
    }
  } catch {}

  try {
    if (fs.existsSync(LOCAL_CONFIG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, "utf-8"));
      return { ...DEFAULT_ZALO_CONFIG, ...parsed };
    }
  } catch {}

  return DEFAULT_ZALO_CONFIG;
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

  const current = await loadZaloBotConfig();
  const updated: ZaloBotConfig = {
    ...current,
    ...body,
    updatedAt: Date.now(),
    updatedBy: auth.user.email || auth.user.id,
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
