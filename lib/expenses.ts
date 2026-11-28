export type ExpenseCategory =
  | "uniform"
  | "party"
  | "backdrop"
  | "shipping"
  | "other";

export interface ExpenseItem {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  spentAt: string; // YYYY-MM-DDTHH:mm hoặc YYYY-MM-DD
  spentBy: string;
  note?: string;
  billUrls: string[];
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}

export const EXPENSES_STORAGE_PATH = "settings/expenses.json";

export const EXPENSE_CATEGORIES: ReadonlyArray<{
  id: ExpenseCategory;
  label: string;
  shortLabel: string;
  badgeClass: string;
  placeholder: string;
}> = [
  {
    id: "uniform",
    label: "Chi mua áo đồng phục",
    shortLabel: "Áo đồng phục",
    badgeClass: "bg-orange-50 text-ueh-orange border-orange-200",
    placeholder: "VD: Đặt cọc may 40 áo Polo kỷ niệm 15 năm TCDN4",
  },
  {
    id: "party",
    label: "Chi ăn uống / Tiệc gặp mặt",
    shortLabel: "Tiệc gặp mặt",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    placeholder: "VD: Đặt cọc bàn tiệc trưa tại Làng Nướng Nam Bộ",
  },
  {
    id: "backdrop",
    label: "In ấn, Backdrop, Kỷ yếu & Quà tặng",
    shortLabel: "In ấn & Quà",
    badgeClass: "bg-blue-50 text-ueh border-blue-200",
    placeholder: "VD: In backdrop hội ngộ, standee & hoa tặng thầy cô",
  },
  {
    id: "shipping",
    label: "Vận chuyển / Ship áo kỷ niệm",
    shortLabel: "Ship áo",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    placeholder: "VD: Phí gửi chuyển phát nhanh áo kỷ niệm cho các bạn ở xa",
  },
  {
    id: "other",
    label: "Chi phí phát sinh khác",
    shortLabel: "Chi phí khác",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    placeholder: "VD: Nước uống, âm thanh, chụp ảnh sự kiện...",
  },
];

export function getExpenseCategoryMeta(category?: string) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.id === category) ||
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}

export function formatExpenseDateTime(raw?: string | null): string {
  if (!raw) return "—";
  const str = String(raw).trim();
  const dtMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (dtMatch) {
    return `${dtMatch[3]}/${dtMatch[2]}/${dtMatch[1]} ${dtMatch[4]}:${dtMatch[5]}`;
  }
  const dMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dMatch) {
    return `${dMatch[3]}/${dMatch[2]}/${dMatch[1]}`;
  }
  return str;
}

export function isPdfUrl(url: string): boolean {
  return /\.pdf(\?|$)/i.test(url);
}
