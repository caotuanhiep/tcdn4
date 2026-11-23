export interface BankConfig {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  phoneReceive: string;
  amount: number;
  amountText: string;
  syntaxPrefix: string;
  sepayApiKey?: string;
}

export const BANK_STORAGE_KEY = "tcdn4_bank_config";
export const BANK_UPDATED_EVENT = "tcdn4_bank_config_updated";

export const DEFAULT_BANK_INFO: BankConfig = {
  bankCode: "MB",
  bankName: "MB Bank (Ngân hàng Quân Đội)",
  accountNumber: "0903123456",
  accountName: "BAN LIEN LAC TCDN4 K33",
  phoneReceive: "0903 123 456",
  amount: 1000000,
  amountText: "1.000.000 VNĐ",
  syntaxPrefix: "TCDN4",
  sepayApiKey: "",
};

export function normalizeBankConfig(parsed: any): BankConfig {
  const amount = Number(parsed?.amount) > 0 ? Number(parsed.amount) : DEFAULT_BANK_INFO.amount;
  return {
    bankCode: String(parsed?.bankCode || DEFAULT_BANK_INFO.bankCode),
    bankName: String(parsed?.bankName || DEFAULT_BANK_INFO.bankName),
    accountNumber: String(parsed?.accountNumber || DEFAULT_BANK_INFO.accountNumber).trim(),
    accountName: String(parsed?.accountName || DEFAULT_BANK_INFO.accountName).trim().toUpperCase(),
    phoneReceive: String(parsed?.phoneReceive || DEFAULT_BANK_INFO.phoneReceive).trim(),
    amount,
    amountText: `${amount.toLocaleString("vi-VN")} VNĐ`,
    syntaxPrefix: String(parsed?.syntaxPrefix || DEFAULT_BANK_INFO.syntaxPrefix),
    sepayApiKey: parsed?.sepayApiKey !== undefined ? String(parsed.sepayApiKey).trim() : (DEFAULT_BANK_INFO.sepayApiKey || ""),
  };
}

/** Đọc nhanh bản cache trong trình duyệt (chỉ để hiển thị tức thì, nguồn chuẩn là máy chủ). */
export function getBankInfo(): BankConfig {
  if (typeof window === "undefined") {
    return DEFAULT_BANK_INFO;
  }
  try {
    const raw = localStorage.getItem(BANK_STORAGE_KEY);
    if (raw) return normalizeBankConfig(JSON.parse(raw));
  } catch {}
  return DEFAULT_BANK_INFO;
}

export function cacheBankInfo(config: BankConfig) {
  try {
    localStorage.setItem(BANK_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event(BANK_UPDATED_EVENT));
  } catch {}
}

/** Lấy cấu hình tài khoản chuẩn từ máy chủ (dùng chung cho mọi thiết bị) và cập nhật cache. */
export async function fetchBankInfo(): Promise<BankConfig> {
  try {
    const res = await fetch("/api/settings/bank", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data.config) {
        const config = normalizeBankConfig(data.config);
        if (data.source !== "default") cacheBankInfo(config);
        return config;
      }
    }
  } catch {}
  return getBankInfo();
}
