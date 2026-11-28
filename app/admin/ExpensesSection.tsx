"use client";

import { useMemo, useState } from "react";
import {
  Receipt,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Upload,
  Loader2,
  FileText,
  ExternalLink,
  Copy,
  CheckCheck,
  Calendar,
  User,
  Image as ImageIcon,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { authFetch, broadcastDataUpdate } from "@/lib/api";
import { DEFAULT_COMMITTEE_MEMBERS } from "@/lib/committee";
import {
  EXPENSE_CATEGORIES,
  formatExpenseDateTime,
  getExpenseCategoryMeta,
  isPdfUrl,
  type ExpenseCategory,
  type ExpenseItem,
} from "@/lib/expenses";

function getLocalDateTimeNow(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function normalizeDateTimeForInput(raw?: string): string {
  if (!raw) return getLocalDateTimeNow();
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) return str.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return `${str}T09:00`;
  return getLocalDateTimeNow();
}

interface ExpensesSectionProps {
  expenses: ExpenseItem[];
  loading: boolean;
  totalIncome: number;
  confirmedPaidCount: number;
  freeCount: number;
  openCreateSignal?: number;
  onExpensesChange: (next: ExpenseItem[]) => void;
}

export default function ExpensesSection({
  expenses,
  loading,
  totalIncome,
  confirmedPaidCount,
  freeCount,
  onExpensesChange,
}: ExpensesSectionProps) {
  const { profile } = useAuth();
  const toast = useToast();

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Modal state (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("uniform");
  const [amount, setAmount] = useState<string>("");
  const [spentAt, setSpentAt] = useState<string>(getLocalDateTimeNow());
  const [spentBy, setSpentBy] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [billUrls, setBillUrls] = useState<string[]>([]);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lightbox preview bill
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);

  const quickSpenderPresets = useMemo(() => {
    const names = new Set<string>();
    if (profile?.full_name?.trim()) names.add(profile.full_name.trim());
    DEFAULT_COMMITTEE_MEMBERS.forEach((m) => names.add(m.name));
    expenses.forEach((e) => {
      if (e.spentBy?.trim()) names.add(e.spentBy.trim());
    });
    return Array.from(names).slice(0, 8);
  }, [profile?.full_name, expenses]);

  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses]
  );

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    }
    return map;
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.spentBy.toLowerCase().includes(q) ||
          (item.note || "").toLowerCase().includes(q) ||
          formatExpenseDateTime(item.spentAt).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [expenses, categoryFilter, searchTerm]);

  const openCreateModal = (presetCategory: ExpenseCategory = "uniform") => {
    setEditingId(null);
    setCategory(presetCategory);
    setTitle("");
    setAmount("");
    setSpentAt(getLocalDateTimeNow());
    setSpentBy(profile?.full_name?.trim() || "Cao Tuấn Hiệp");
    setNote("");
    setBillUrls([]);
    setIsFormOpen(true);
  };

  const openEditModal = (item: ExpenseItem) => {
    setEditingId(item.id);
    setCategory(item.category || "other");
    setTitle(item.title || "");
    setAmount(String(item.amount || ""));
    setSpentAt(normalizeDateTimeForInput(item.spentAt));
    setSpentBy(item.spentBy || "");
    setNote(item.note || "");
    setBillUrls(Array.isArray(item.billUrls) ? item.billUrls : []);
    setIsFormOpen(true);
  };

  const handleBillFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = Math.max(0, 10 - billUrls.length);
    const batch = files.slice(0, remainingSlots);
    if (batch.length === 0) {
      toast.error("Tối đa 10 tệp hóa đơn cho mỗi khoản chi.");
      return;
    }

    setUploadingBill(true);
    let uploadedCount = 0;
    try {
      for (const file of batch) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Tệp "${file.name}" vượt quá 10MB.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await authFetch("/api/expenses/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success || !data?.url) {
          throw new Error(data?.error || `Không tải được tệp ${file.name}`);
        }
        setBillUrls((prev) => [...prev, data.url]);
        uploadedCount++;
      }
      if (uploadedCount > 0) {
        toast.success(`Đã tải lên ${uploadedCount} hóa đơn / chứng từ!`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tải hóa đơn lên hệ thống");
    } finally {
      setUploadingBill(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Math.round(Number(String(amount).replace(/[^0-9]/g, "")) || 0);
    if (!title.trim()) {
      toast.error("Vui lòng nhập nội dung khoản chi!");
      return;
    }
    if (numericAmount <= 0) {
      toast.error("Vui lòng nhập số tiền chi hợp lệ (> 0 VNĐ)!");
      return;
    }
    if (!spentBy.trim()) {
      toast.error("Vui lòng nhập tên người thực hiện chi!");
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch("/api/expenses", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          id: editingId || undefined,
          title: title.trim(),
          category,
          amount: numericAmount,
          spentAt,
          spentBy: spentBy.trim(),
          note: note.trim(),
          billUrls,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Không lưu được khoản chi");
      }
      if (Array.isArray(data.expenses)) {
        onExpensesChange(data.expenses);
      }
      broadcastDataUpdate("settings");
      toast.success(editingId ? "Đã cập nhật khoản chi minh bạch!" : "Đã ghi nhận khoản chi mới vào quỹ họp lớp!");
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Lỗi lưu khoản chi");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ExpenseItem) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa khoản chi "${item.title}" (${item.amount.toLocaleString("vi-VN")}đ)?`
      )
    ) {
      return;
    }
    setBusyId(item.id);
    try {
      const res = await authFetch(`/api/expenses?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Không xóa được khoản chi");
      }
      if (Array.isArray(data.expenses)) {
        onExpensesChange(data.expenses);
      }
      broadcastDataUpdate("settings");
      toast.success("Đã xóa khoản chi và cập nhật lại tồn quỹ!");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xóa khoản chi");
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyFinancialReport = () => {
    const balance = totalIncome - totalSpent;
    const expenseLines =
      expenses.length > 0
        ? expenses
            .map(
              (item, idx) =>
                `${idx + 1}. [${getExpenseCategoryMeta(item.category).shortLabel}] ${item.title}\n` +
                `   • Số tiền: -${item.amount.toLocaleString("vi-VN")}đ | Người chi: ${item.spentBy} | Lúc: ${formatExpenseDateTime(item.spentAt)}` +
                `${item.billUrls?.length ? ` | Có ${item.billUrls.length} bill` : ""}`
            )
            .join("\n")
        : "• Chưa phát sinh khoản chi nào.";

    const report =
      `📊 [BÁO CÁO THU - CHI QUỸ HỌP MẶT 15 NĂM TCDN4 K33]\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 TỔNG THU: +${totalIncome.toLocaleString("vi-VN")} VNĐ (${confirmedPaidCount} bạn đã CK${freeCount > 0 ? `, miễn phí ${freeCount} bạn tỉnh xa` : ""})\n` +
      `🧾 TỔNG CHI: -${totalSpent.toLocaleString("vi-VN")} VNĐ (${expenses.length} khoản chi)\n` +
      `🏦 TỒN QUỸ HIỆN TẠI: ${balance.toLocaleString("vi-VN")} VNĐ\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 CHI TIẾT CÁC KHOẢN CHI:\n${expenseLines}\n\n` +
      `👉 Minh bạch tài chính tại: https://tcdn4.top/#event`;

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    toast.success("Đã sao chép Báo cáo Thu - Chi (chuẩn Zalo)!");
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const currentCatMeta = getExpenseCategoryMeta(category);
  const numericPreview = Math.round(Number(String(amount).replace(/[^0-9]/g, "")) || 0);

  return (
    <div className="space-y-4">
      {/* Header bar + quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-ueh flex items-center gap-2">
            <Receipt size={18} className="text-ueh-orange" />
            <span>Sổ Chi Tiêu &amp; Hóa Đơn Quỹ Họp Lớp ({expenses.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận minh bạch từng khoản chi (áo đồng phục, tiệc gặp mặt, in ấn, ship áo...), người chi, thời gian và ảnh bill chứng từ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleCopyFinancialReport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {copiedReport ? (
              <CheckCheck size={14} className="text-emerald-600" />
            ) : (
              <Copy size={14} className="text-ueh" />
            )}
            <span>{copiedReport ? "Đã copy báo cáo!" : "Copy báo cáo Thu - Chi"}</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal("uniform")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ueh to-ueh-light px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-98 transition-all cursor-pointer"
          >
            <Plus size={15} className="text-ueh-gold" />
            <span>Ghi khoản chi mới</span>
          </button>
        </div>
      </div>

      {/* Category breakdown chips */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {EXPENSE_CATEGORIES.map((cat) => {
            const sum = categoryTotals[cat.id] || 0;
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(active ? "all" : cat.id)}
                className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                  active
                    ? "border-ueh bg-blue-50/70 ring-2 ring-ueh/15"
                    : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                <div className="text-[10px] font-bold uppercase text-slate-500 truncate">
                  {cat.shortLabel}
                </div>
                <div className="text-sm font-black text-slate-900 mt-0.5">
                  {sum.toLocaleString("vi-VN")}đ
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-white p-3 border border-slate-100 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Tìm khoản chi, người chi, ngày..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs focus:border-ueh focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full self-start sm:self-auto py-0.5">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              categoryFilter === "all"
                ? "bg-ueh text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả ({expenses.length})
          </button>
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat.id
                  ? "bg-ueh text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-xs">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">Thời gian chi</th>
              <th className="px-4 py-3">Khoản chi &amp; Hạng mục</th>
              <th className="px-4 py-3 whitespace-nowrap">Người thực hiện</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Số tiền chi</th>
              <th className="px-4 py-3 text-center whitespace-nowrap">Hóa đơn / Bill</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && expenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-ueh mb-2" />
                  <span>Đang tải sổ chi tiêu...</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Wallet className="h-9 w-9 text-slate-300" />
                    <div className="text-sm font-bold text-slate-700">
                      {expenses.length === 0
                        ? "Chưa có khoản chi nào được ghi nhận"
                        : "Không có khoản chi nào khớp bộ lọc"}
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Ghi lại các khoản chi mua áo đồng phục, đặt tiệc gặp mặt, in ấn... kèm hóa đơn để theo dõi tồn quỹ minh bạch.
                    </p>
                    {expenses.length === 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => openCreateModal("uniform")}
                          className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-1.5 text-xs font-bold text-ueh-orange hover:bg-orange-100 cursor-pointer"
                        >
                          + Chi mua áo đồng phục
                        </button>
                        <button
                          type="button"
                          onClick={() => openCreateModal("party")}
                          className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                        >
                          + Chi ăn uống / tiệc gặp mặt
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const cat = getExpenseCategoryMeta(item.category);
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <span>{formatExpenseDateTime(item.spentAt)}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${cat.badgeClass}`}
                        >
                          {cat.shortLabel}
                        </span>
                        <span className="font-bold text-slate-900">{item.title}</span>
                      </div>
                      {item.note && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {item.note}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                        <User size={12} className="text-ueh shrink-0" />
                        <span>{item.spentBy}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-black text-rose-600 text-xs sm:text-sm">
                        -{Number(item.amount || 0).toLocaleString("vi-VN")}đ
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {item.billUrls && item.billUrls.length > 0 ? (
                        <div className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                          {item.billUrls.map((url, idx) =>
                            isPdfUrl(url) ? (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold text-ueh hover:bg-blue-100"
                                title="Mở file PDF hóa đơn"
                              >
                                <FileText size={12} /> Bill {idx + 1}
                              </a>
                            ) : (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPreviewBillUrl(url)}
                                className="group relative h-9 w-9 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-2xs hover:ring-2 hover:ring-ueh cursor-pointer"
                                title="Bấm để xem ảnh hóa đơn lớn"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Hóa đơn ${item.title} #${idx + 1}`}
                                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                />
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Chưa đính kèm</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-ueh hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Chỉnh sửa khoản chi / thêm bill"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          disabled={busyId === item.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                          title="Xóa khoản chi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL THÊM / CHỈNH SỬA KHOẢN CHI & UPLOAD BILL */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              aria-label="Đóng"
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ueh text-white">
                <Receipt size={18} className="text-ueh-gold" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-ueh">
                  {editingId ? "Cập Nhật Khoản Chi Quỹ" : "Ghi Nhận Khoản Chi Mới"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Mọi khoản chi &amp; bill chứng từ được lưu trực tiếp lên hệ thống để minh bạch quỹ họp lớp.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              {/* Hạng mục chi */}
              <div>
                <span className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Hạng mục chi *
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                        category === cat.id
                          ? "bg-ueh text-white border-ueh shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nội dung khoản chi */}
              <div>
                <label
                  htmlFor="expense-title"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1"
                >
                  Nội dung khoản chi *
                </label>
                <input
                  id="expense-title"
                  name="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={currentCatMeta.placeholder}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                />
              </div>

              {/* Số tiền & Thời gian chi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="expense-amount"
                    className="block text-xs font-bold uppercase text-slate-700 mb-1"
                  >
                    Số tiền chi (VNĐ) *
                  </label>
                  <input
                    id="expense-amount"
                    name="amount"
                    type="text"
                    inputMode="numeric"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="VD: 5500000"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-rose-600 focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                  />
                  {numericPreview > 0 && (
                    <div className="text-[11px] font-bold text-rose-600 mt-1">
                      = {numericPreview.toLocaleString("vi-VN")} VNĐ
                    </div>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="expense-spent-at"
                    className="block text-xs font-bold uppercase text-slate-700 mb-1"
                  >
                    Thời gian chi *
                  </label>
                  <input
                    id="expense-spent-at"
                    name="spentAt"
                    type="datetime-local"
                    required
                    value={spentAt}
                    onChange={(e) => setSpentAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                  />
                </div>
              </div>

              {/* Người thực hiện chi */}
              <div>
                <label
                  htmlFor="expense-spent-by"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1"
                >
                  Người thực hiện chi *
                </label>
                <input
                  id="expense-spent-by"
                  name="spentBy"
                  type="text"
                  required
                  value={spentBy}
                  onChange={(e) => setSpentBy(e.target.value)}
                  placeholder="VD: Cao Tuấn Hiệp (TC12)"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                />
                {quickSpenderPresets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] font-bold text-slate-400 mr-0.5">Chọn nhanh:</span>
                    {quickSpenderPresets.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSpentBy(name)}
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border transition-colors cursor-pointer ${
                          spentBy === name
                            ? "bg-ueh text-white border-ueh"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-ueh"
                        }`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ghi chú */}
              <div>
                <label
                  htmlFor="expense-note"
                  className="block text-xs font-bold uppercase text-slate-700 mb-1"
                >
                  Ghi chú chi tiết (tùy chọn)
                </label>
                <textarea
                  id="expense-note"
                  name="note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Số lượng 40 áo x 180k, đã thanh toán 50% cọc cho xưởng may..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ueh"
                />
              </div>

              {/* Upload hóa đơn / Bill */}
              <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-ueh flex items-center gap-1.5">
                      <ImageIcon size={14} className="text-ueh-orange" />
                      <span>Upload Hóa Đơn / Bill Chuyển Khoản</span>
                    </div>
                    <div className="text-[10.5px] text-slate-500">
                      Hỗ trợ nhiều ảnh (JPG, PNG, WEBP) hoặc file PDF, tối đa 10MB/tệp.
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-ueh-light transition-colors cursor-pointer shrink-0">
                    {uploadingBill ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Upload size={13} className="text-ueh-gold" />
                    )}
                    <span>{uploadingBill ? "Đang tải..." : "Chọn bill"}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      disabled={uploadingBill}
                      onChange={handleBillFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {billUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {billUrls.map((url, idx) => (
                      <div
                        key={url + idx}
                        className="relative group rounded-xl border border-slate-200 bg-white overflow-hidden aspect-square flex items-center justify-center"
                      >
                        {isPdfUrl(url) ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-1 text-ueh p-2 text-center"
                          >
                            <FileText size={22} />
                            <span className="text-[10px] font-bold">PDF #{idx + 1}</span>
                          </a>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={`Bill #${idx + 1}`}
                            onClick={() => setPreviewBillUrl(url)}
                            className="h-full w-full object-cover cursor-pointer"
                          />
                        )}
                        <button
                          type="button"
                          aria-label={`Gỡ hóa đơn ${idx + 1}`}
                          onClick={() => setBillUrls((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm hover:bg-rose-700 cursor-pointer"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingBill}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ueh to-ueh-light px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} className="text-ueh-gold" />}
                  <span>{saving ? "Đang lưu..." : editingId ? "Lưu Cập Nhật" : "Lưu Khoản Chi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX XEM ẢNH BILL FULL */}
      {previewBillUrl && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setPreviewBillUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 self-end">
              <a
                href={previewBillUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-md hover:bg-white"
              >
                <ExternalLink size={13} /> Mở ảnh gốc
              </a>
              <button
                type="button"
                onClick={() => setPreviewBillUrl(null)}
                aria-label="Đóng ảnh hóa đơn"
                className="rounded-full bg-white/95 p-1.5 text-slate-700 shadow-md hover:bg-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewBillUrl}
              alt="Ảnh hóa đơn chứng từ"
              className="max-h-[82vh] max-w-full rounded-2xl border border-white/20 bg-white object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
