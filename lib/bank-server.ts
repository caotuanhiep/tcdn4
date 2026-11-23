import fs from "fs";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { BankConfig, DEFAULT_BANK_INFO, normalizeBankConfig } from "@/lib/bank";

const BUCKET_NAME = "alumni-media";
const CONFIG_PATH = "settings/bank-config.json";
const LOCAL_CONFIG_PATH = path.join(process.cwd(), "data", "bank-config.json");

export interface LoadedBankConfig {
  config: BankConfig;
  source: "cloud" | "local" | "default";
}

/**
 * Đọc cấu hình tài khoản ngân hàng & SePay từ nguồn chuẩn nhất (Supabase Storage -> Local -> Default).
 * Dùng chung cho mọi API server: /api/settings/bank, /api/sepay-webhook, /api/zalo-bot, /api/ai-writer.
 */
export async function loadBankConfigServer(client?: SupabaseClient): Promise<LoadedBankConfig> {
  const supabase = client || getSupabaseAdmin();

  // 1. Ưu tiên đọc từ Supabase Storage (Public URL với cache-buster để luôn lấy bản mới nhất)
  try {
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(CONFIG_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const parsed = JSON.parse(await res.text());
        if (parsed && parsed.accountNumber) {
          return { config: normalizeBankConfig(parsed), source: "cloud" };
        }
      }
    }
  } catch {}

  // 1b. Dự phòng download trực tiếp qua SDK Storage
  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(CONFIG_PATH);
    if (!error && data) {
      const parsed = JSON.parse(await data.text());
      if (parsed && parsed.accountNumber) {
        return { config: normalizeBankConfig(parsed), source: "cloud" };
      }
    }
  } catch {}

  // 2. Fallback file local (môi trường dev)
  try {
    if (fs.existsSync(LOCAL_CONFIG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, "utf-8"));
      if (parsed && parsed.accountNumber) {
        return { config: normalizeBankConfig(parsed), source: "local" };
      }
    }
  } catch {}

  return { config: DEFAULT_BANK_INFO, source: "default" };
}
