import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { DEFAULT_BANK_INFO, normalizeBankConfig } from "@/lib/bank";
import { requireAdmin } from "@/lib/supabase/requestAuth";

// Cấu hình tài khoản ngân hàng được lưu tập trung trên Supabase Storage (dùng chung cho mọi thiết bị / mọi khách),
// thay vì localStorage của riêng trình duyệt admin như trước.
const BUCKET_NAME = "alumni-media";
const CONFIG_PATH = "settings/bank-config.json";
const LOCAL_CONFIG_PATH = path.join(process.cwd(), "data", "bank-config.json");

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function getStorageClient(req: NextRequest): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
  }) as unknown as SupabaseClient;
}

async function loadCloudConfig(supabase: SupabaseClient): Promise<any | null> {
  try {
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(CONFIG_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) return JSON.parse(await res.text());
    }
  } catch {}
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(CONFIG_PATH);
    if (!error && data) return JSON.parse(await data.text());
  } catch {}
  return null;
}

function loadLocalConfig(): any | null {
  try {
    if (fs.existsSync(LOCAL_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, "utf-8"));
    }
  } catch {}
  return null;
}

// GET /api/settings/bank - công khai (thông tin chuyển khoản hiển thị cho mọi thành viên)
export async function GET(req: NextRequest) {
  const supabase = getStorageClient(req);
  const cloud = await loadCloudConfig(supabase);
  const raw = cloud || loadLocalConfig();
  return NextResponse.json(
    { success: true, source: cloud ? "cloud" : raw ? "local" : "default", config: raw ? normalizeBankConfig(raw) : DEFAULT_BANK_INFO },
    { headers: NO_STORE_HEADERS }
  );
}

// PUT /api/settings/bank - chỉ Admin / Ban liên lạc
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const accountNumber = String(body?.accountNumber || "").trim();
  if (!/^[0-9A-Za-z]{4,30}$/.test(accountNumber)) {
    return NextResponse.json({ success: false, error: "Số tài khoản không hợp lệ" }, { status: 400 });
  }

  const config = {
    ...normalizeBankConfig({ ...body, accountNumber }),
    updatedAt: Date.now(),
    updatedBy: auth.user.email || auth.user.id,
  };
  const json = JSON.stringify(config, null, 2);

  let cloudOk = false;
  let cloudError = "";
  try {
    const supabase = getStorageClient(req);
    const { error } = await supabase.storage.from(BUCKET_NAME).upload(CONFIG_PATH, Buffer.from(json, "utf-8"), {
      contentType: "application/json; charset=utf-8",
      upsert: true,
      cacheControl: "0",
    });
    if (error) cloudError = error.message;
    else cloudOk = true;
  } catch (err: any) {
    cloudError = err?.message || String(err);
  }

  let localOk = false;
  try {
    fs.mkdirSync(path.dirname(LOCAL_CONFIG_PATH), { recursive: true });
    fs.writeFileSync(LOCAL_CONFIG_PATH, json, "utf-8");
    localOk = true;
  } catch {}

  if (!cloudOk && !localOk) {
    return NextResponse.json(
      { success: false, error: `Không lưu được lên Cloud: ${cloudError || "lỗi không xác định"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, cloud: cloudOk, config }, { headers: NO_STORE_HEADERS });
}
