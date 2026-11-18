export interface BankConfig {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  phoneReceive: string;
  amount: number;
  amountText: string;
  syntaxPrefix: string;
}

export const DEFAULT_BANK_INFO: BankConfig = {
  bankCode: "MB",
  bankName: "MB Bank (Ngân hàng Quân Đội)",
  accountNumber: "0903123456",
  accountName: "BAN LIEN LAC TCDN4 K33",
  phoneReceive: "0903 123 456",
  amount: 1000000,
  amountText: "1.000.000 VNĐ",
  syntaxPrefix: "TCDN4",
};

export function getBankInfo(): BankConfig {
  if (typeof window === "undefined") {
    return DEFAULT_BANK_INFO;
  }
  try {
    const raw = localStorage.getItem("tcdn4_bank_config");
    if (raw) {
      const parsed = JSON.parse(raw);
      const amount = parsed.amount || DEFAULT_BANK_INFO.amount;
      return {
        bankCode: parsed.bankCode || DEFAULT_BANK_INFO.bankCode,
        bankName: parsed.bankName || DEFAULT_BANK_INFO.bankName,
        accountNumber: parsed.accountNumber || DEFAULT_BANK_INFO.accountNumber,
        accountName: parsed.accountName || DEFAULT_BANK_INFO.accountName,
        phoneReceive: parsed.phoneReceive || DEFAULT_BANK_INFO.phoneReceive,
        amount: amount,
        amountText: `${Number(amount).toLocaleString("vi-VN")} VNĐ`,
        syntaxPrefix: parsed.syntaxPrefix || DEFAULT_BANK_INFO.syntaxPrefix,
      };
    }
  } catch {}
  return DEFAULT_BANK_INFO;
}
