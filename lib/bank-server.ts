import fs from "fs";
import path from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { BankConfig, DEFAULT_BANK_INFO, normalizeBankConfig } from "@/lib/bank";
import { readPrivateJson } from "@/lib/private-storage";

const CONFIG_PATH = "settings/bank-config.json";
const LOCAL_CONFIG_PATH = path.join(process.cwd(), "data", "bank-config.json");

export interface LoadedBankConfig {
  config: BankConfig;
  source: "cloud" | "local" | "default";
}

/**
 * Đọc cấu hình tài khoản ngân hàng & SePay từ Private Bucket (`alumni-private`) -> Local -> Default.
 * Dùng chung cho mọi API server: /api/settings/bank, /api/sepay-webhook, /api/zalo-bot, /api/ai-writer.
 */
export async function loadBankConfigServer(client?: SupabaseClient): Promise<LoadedBankConfig> {
  const supabase = client || getSupabaseAdmin();

  // 1. Đọc từ Private Bucket (khóa kín sepayApiKey, chỉ backend truy cập được)
  try {
    const parsed = await readPrivateJson<any>(CONFIG_PATH, supabase);
    if (parsed && parsed.accountNumber) {
      return { config: normalizeBankConfig(parsed), source: "cloud" };
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
