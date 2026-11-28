"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  QrCode,
  Receipt,
  Search,
  Shirt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useAlumniData } from "@/components/AlumniDataProvider";
import { authFetch, broadcastDataUpdate } from "@/lib/api";
import { DEFAULT_BANK_INFO, fetchBankInfo, getBankInfo, type BankConfig } from "@/lib/bank";
import type { ExpenseItem } from "@/lib/expenses";
import MemberQrModal, { type QrTargetMember } from "@/app/admin/MemberQrModal";
import ExpensesSection from "@/app/admin/ExpensesSection";

function formatShortPaidAmount(
  amount?: number,
  fallback = 1000000,
  isFree = false
): string {
  if (isFree) return "0đ";
  const val = typeof amount === "number" && amount >= 0 ? amount : fallback;
  if (val === 0) return "0đ";
  if (val >= 1000000) {
    const millions = val / 1000000;
    return Number.isInteger(millions)
      ? `${millions} triệu`
      : `${millions.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} triệu`;
  }
  return `${Math.round(val / 1000)}k`;
}

function formatRegistrationDate(val?: string) {
  if (!val) return "—";
  if (val.includes("T")) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
  }
  return val;
}

export default function RegistrationsPanel() {
  const toast = useToast();
  const { registrations: list, lastUpdated, refresh } = useAlumniData();
  const [bankInfo, setBankInfo] = useState<BankConfig>(DEFAULT_BANK_INFO);
  const [subTab, setSubTab] = useState<"registrations" | "expenses">("registrations");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qrMember, setQrMember] = useState<QrTargetMember | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await authFetch(`/api/expenses?t=${Date.now()}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && Array.isArray(data.expenses)) {
        setExpenses(data.expenses);
      }
    } catch {
      // ignore transient network errors
    } finally {
      setLoadingExpenses(false);
    }
  }, []);

  useEffect(() => {
    setBankInfo(getBankInfo());
    fetchBankInfo().then((cfg) => setBankInfo(cfg)).catch(() => {});
  }, []);

  useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses, lastUpdated]);

  const toggleStatus = async (id: string) => {
    const target = list.find((x) => x.id === id);
    if (!target || busyId) return;

    const isFreeItem = target.registrationType === "attending_free";
    if (isFreeItem) {
      toast.info(`${target.fullName} đang ở diện Miễn chi phí họp lớp (0đ). Đổi trạng thái tại mục Quản lý Thành viên nếu cần thu phí.`);
      return;
    }

    const nextStatus = target.status === "confirmed" ? "pending" : "confirmed";
    const defaultItemFee =
      target.registrationType === "shirt_only" ? bankInfo.shirtOnlyAmount || 250000 : bankInfo.amount;
    const resolvedPaidAmount =
      nextStatus === "confirmed"
        ? target.paidAmount > 0
          ? target.paidAmount
          : defaultItemFee
        : target.paidAmount;

    setBusyId(id);
    try {
      const res = await authFetch("/api/registrations", {
        method: "PUT",
        body: JSON.stringify({ id, status: nextStatus, paidAmount: resolvedPaidAmount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Không lưu được trạng thái lên máy chủ");
      }
      await refresh();
      broadcastDataUpdate("registration");
      toast.success(
        nextStatus === "confirmed"
          ? `Đã xác nhận thu phí cho ${target.fullName}!`
          : `Đã chuyển ${target.fullName} về trạng thái chờ duyệt.`
      );
    } catch (err: any) {
      toast.error(err?.message || "Lỗi cập nhật trạng thái thanh toán");
    } finally {
      setBusyId(null);
    }
  };

  const removeReg = async (id: string) => {
    const target = list.find((x) => x.id === id);
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lượt đăng ký của "${target?.fullName || id}"?`)) {
      return;
    }

    setBusyId(id);
    try {
      const res = await authFetch(`/api/registrations?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Không xóa được lượt đăng ký trên máy chủ");
      }
      await refresh();
      broadcastDataUpdate("registration");
      toast.success("Đã xóa lượt đăng ký và đồng bộ database gốc!");
    } catch (err: any) {
      toast.error(err?.message || "Lỗi xóa lượt đăng ký");
    } finally {
      setBusyId(null);
    }
  };

  const copyShirtSummary = () => {
    const summary: Record<string, number> = {};
    list.forEach((r) => {
      summary[r.shirtSize] = (summary[r.shirtSize] || 0) + 1;
    });
    const text = Object.entries(summary)
      .map(([size, count]) => `${size}: ${count} áo`)
      .join("\n");
    navigator.clipboard.writeText(`TỔNG HỢP SIZE ÁO TCDN4 15 NĂM:\n${text}`);
    toast.success("Đã sao chép bảng tổng hợp size áo để gửi xưởng may!");
  };

  const filtered = list.filter((item) => {
    if (classFilter !== "all" && item.className !== classFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const freeCount = list.filter((r) => r.registrationType === "attending_free").length;
  const confirmedPaidCount = list.filter(
    (r) => r.status === "confirmed" && r.registrationType !== "attending_free"
  ).length;
  const totalPaid = list
    .filter((r) => r.status === "confirmed")
    .reduce((sum, r) => {
      if (r.registrationType === "attending_free") return sum;
      const fallback =
        r.registrationType === "shirt_only" ? bankInfo.shirtOnlyAmount || 250000 : bankInfo.amount;
      const amt = typeof r.paidAmount === "number" && r.paidAmount >= 0 ? r.paidAmount : fallback;
      return sum + amt;
    }, 0);
  const totalGuests = list.reduce(
    (sum, r) => sum + (r.registrationType === "shirt_only" ? 0 : Number(r.guestsCount) || 0),
    0
  );
  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const fundBalance = totalPaid - totalSpent;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ueh">
            Quản lý Đăng ký 15 Năm &amp; Quỹ Họp Lớp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi danh sách tham dự, đối soát thu phí &amp; sổ chi tiêu minh bạch có hóa đơn chứng từ (realtime)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab(subTab === "expenses" ? "registrations" : "expenses")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2 text-xs font-bold text-ueh-orange hover:bg-orange-100 transition-colors cursor-pointer"
          >
            <Receipt size={14} />
            <span>{subTab === "expenses" ? "Xem Danh sách Thu phí" : `Sổ Chi Tiêu (${expenses.length})`}</span>
          </button>
          <button
            onClick={copyShirtSummary}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <Shirt size={14} /> Xuất Bảng Size Áo
          </button>
        </div>
      </div>

      {/* Registration Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Tổng Đăng Ký</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{list.length}</div>
          <div className="text-[10px] text-slate-500">
            {totalGuests > 0 ? `+${totalGuests} người thân (${list.length + totalGuests} khách)` : "Thành viên & Khách"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Đã Xác Nhận</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {list.filter((r) => r.status === "confirmed").length}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">
            {freeCount > 0
              ? `${confirmedPaidCount} đã CK • ${freeCount} miễn phí (0đ)`
              : "Đã xác nhận tiền"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Chờ Đối Soát</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {list.filter((r) => r.status === "pending").length}
          </div>
          <div className="text-[10px] text-amber-600 font-semibold">Cần check sao kê</div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Kinh Phí Đã Thu</div>
          <div className="text-lg sm:text-xl font-black text-blue-600 mt-1">
            {totalPaid.toLocaleString("vi-VN")}đ
          </div>
          <div className="text-[10px] text-slate-500">
            {freeCount > 0
              ? `Không tính ${freeCount} bạn miễn phí (0đ)`
              : "Quỹ tài chính sự kiện"}
          </div>
        </div>
      </div>

      {/* Tổng Quan Quỹ Họp Lớp Minh Bạch: Tổng Thu - Tổng Chi - Tồn Quỹ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-white to-emerald-50/60 p-4 shadow-2xs">
        <div className="flex items-center gap-3 rounded-2xl bg-white/90 border border-emerald-100 p-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Tổng Thu Quỹ</div>
            <div className="text-base sm:text-lg font-black text-emerald-700 truncate">
              +{totalPaid.toLocaleString("vi-VN")}đ
            </div>
            <div className="text-[10px] text-slate-500">{confirmedPaidCount} lượt đã đóng phí</div>
          </div>
        </div>

        <div
          onClick={() => setSubTab("expenses")}
          className="flex items-center gap-3 rounded-2xl bg-white/90 border border-rose-100 p-3.5 cursor-pointer hover:border-rose-300 transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <TrendingDown size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Tổng Chi Quỹ</div>
            <div className="text-base sm:text-lg font-black text-rose-600 truncate">
              -{totalSpent.toLocaleString("vi-VN")}đ
            </div>
            <div className="text-[10px] text-slate-500">
              {expenses.length} khoản chi minh bạch • Bấm xem sổ chi →
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-ueh text-white p-3.5 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-ueh-gold">
            <Wallet size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-blue-200">Tồn Quỹ Hiện Tại</div>
            <div
              className={`text-base sm:text-lg font-black truncate ${
                fundBalance < 0 ? "text-rose-300" : "text-ueh-gold"
              }`}
            >
              {fundBalance.toLocaleString("vi-VN")}đ
            </div>
            <div className="text-[10px] text-blue-100/90">Tổng thu trừ tổng chi thực tế</div>
          </div>
        </div>
      </div>

      {/* Sub-tabs: Thu phí & Danh sách ĐK | Sổ Chi Tiêu & Bill */}
      <div className="flex rounded-2xl bg-slate-100 p-1.5 gap-1.5">
        <button
          type="button"
          onClick={() => setSubTab("registrations")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
            subTab === "registrations"
              ? "bg-white text-ueh shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users size={15} />
          <span>Danh sách Đăng ký &amp; Thu phí ({list.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab("expenses")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
            subTab === "expenses"
              ? "bg-white text-ueh-orange shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Receipt size={15} />
          <span>Theo dõi Chi tiêu &amp; Upload Bill ({expenses.length})</span>
        </button>
      </div>

      {subTab === "expenses" ? (
        <ExpensesSection
          expenses={expenses}
          loading={loadingExpenses}
          totalIncome={totalPaid}
          confirmedPaidCount={confirmedPaidCount}
          freeCount={freeCount}
          onExpensesChange={setExpenses}
        />
      ) : (
        <>
          {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-white p-3 border border-slate-100 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs focus:border-ueh focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Lớp:</span>
          {(["all", "TC10", "TC11", "TC12"] as const).map((cls) => (
            <button
              key={cls}
              onClick={() => setClassFilter(cls)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                classFilter === cls
                  ? "bg-ueh text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cls === "all" ? "Tất cả" : cls}
            </button>
          ))}
        </div>
      </div>

      {/* Registrations Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-xs">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3">Họ và tên</th>
              <th className="px-4 py-3">Lớp</th>
              <th className="px-4 py-3">SĐT</th>
              <th className="px-4 py-3">Size Áo</th>
              <th className="px-4 py-3">Địa chỉ nhận áo</th>
              <th className="px-4 py-3">Ngày ĐK</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-bold text-slate-900">
                  {item.fullName}
                  {item.registrationType === "attending_free" && (
                    <span className="text-[10px] text-sky-600 block font-semibold">
                      Miễn phí họp lớp (Tỉnh xa • 0đ)
                    </span>
                  )}
                  {item.registrationType === "shirt_only" && (
                    <span className="text-[10px] text-ueh-orange block font-semibold">
                      Chỉ nhận áo kỷ niệm (250k)
                    </span>
                  )}
                  {(item.guestsCount || 0) > 0 && item.registrationType !== "shirt_only" && (
                    <span className="text-[10px] text-emerald-600 block font-semibold">
                      +{item.guestsCount} người thân
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-blue-50 px-2 py-0.5 font-bold text-ueh border border-blue-100">
                    {item.className}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{item.phone}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{item.shirtSize}</td>
                <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{item.address}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                  {formatRegistrationDate(item.createdAt)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => void toggleStatus(item.id)}
                    disabled={busyId === item.id}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-transform active:scale-95 cursor-pointer disabled:opacity-50 ${
                      item.registrationType === "attending_free"
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : item.status === "confirmed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {item.registrationType === "attending_free" ? (
                      <>
                        <CheckCircle2 size={12} /> Miễn phí (0đ)
                      </>
                    ) : item.status === "confirmed" ? (
                      <>
                        <CheckCircle2 size={12} /> Đã thu{" "}
                        {formatShortPaidAmount(
                          item.paidAmount,
                          item.registrationType === "shirt_only"
                            ? bankInfo.shirtOnlyAmount || 250000
                            : bankInfo.amount,
                          false
                        )}
                      </>
                    ) : (
                      <>
                        <Clock size={12} /> Chờ duyệt
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setQrMember({
                          fullName: item.fullName,
                          className: item.className,
                          phone: item.phone,
                          shirtSize: item.shirtSize,
                          guestsCount: item.guestsCount,
                          paidAmount: item.paidAmount,
                          registrationType: item.registrationType,
                        })
                      }
                      title="Lấy mã QR thanh toán gửi thành viên"
                      className="p-1.5 rounded-lg text-ueh hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <QrCode size={14} />
                    </button>
                    <button
                      onClick={() => void removeReg(item.id)}
                      disabled={busyId === item.id}
                      title="Xóa phiếu đăng ký"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}

      <MemberQrModal member={qrMember} onClose={() => setQrMember(null)} />
    </div>
  );
}
