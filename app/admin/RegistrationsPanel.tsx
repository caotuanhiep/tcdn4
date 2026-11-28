"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, QrCode, Search, Shirt, Trash2 } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useAlumniData } from "@/components/AlumniDataProvider";
import { authFetch, broadcastDataUpdate } from "@/lib/api";
import { DEFAULT_BANK_INFO, fetchBankInfo, getBankInfo, type BankConfig } from "@/lib/bank";
import MemberQrModal, { type QrTargetMember } from "@/app/admin/MemberQrModal";

function formatShortPaidAmount(amount?: number, fallback = 1000000): string {
  const val = Number(amount) > 0 ? Number(amount) : fallback;
  if (val >= 1000000) {
    const millions = val / 1000000;
    return Number.isInteger(millions)
      ? `${millions} triệu`
      : `${millions.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
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
  const { registrations: list, refresh } = useAlumniData();
  const [bankInfo, setBankInfo] = useState<BankConfig>(DEFAULT_BANK_INFO);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [qrMember, setQrMember] = useState<QrTargetMember | null>(null);

  useEffect(() => {
    setBankInfo(getBankInfo());
    fetchBankInfo().then((cfg) => setBankInfo(cfg)).catch(() => {});
  }, []);

  const toggleStatus = async (id: string) => {
    const target = list.find((x) => x.id === id);
    if (!target || busyId) return;

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

  const totalPaid = list
    .filter((r) => r.status === "confirmed")
    .reduce((sum, r) => sum + (Number(r.paidAmount) > 0 ? Number(r.paidAmount) : bankInfo.amount), 0);
  const totalGuests = list.reduce((sum, r) => sum + (Number(r.guestsCount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ueh">
            Quản lý Đăng ký 15 Năm & Size Áo
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi danh sách tham dự, đối soát chuyển khoản trực tiếp từ database gốc (cập nhật realtime)
          </p>
        </div>

        <button
          onClick={copyShirtSummary}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-800 transition-colors self-start sm:self-auto"
        >
          <Shirt size={14} /> Xuất Bảng Size Áo
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Tổng Đăng Ký</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{list.length}</div>
          <div className="text-[10px] text-slate-500">
            {totalGuests > 0 ? `+${totalGuests} người thân (${list.length + totalGuests} khách)` : "Thành viên & Khách"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Đã Chuyển Khoản</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {list.filter((r) => r.status === "confirmed").length}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold">Đã xác nhận tiền</div>
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
          <div className="text-xl sm:text-2xl font-black text-blue-600 mt-1">
            {(totalPaid / 1000000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-slate-500">Quỹ tài chính sự kiện</div>
        </div>
      </div>

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
                      item.status === "confirmed"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {item.status === "confirmed" ? (
                      <>
                        <CheckCircle2 size={12} /> Đã thu{" "}
                        {formatShortPaidAmount(
                          item.paidAmount,
                          item.registrationType === "shirt_only"
                            ? bankInfo.shirtOnlyAmount || 250000
                            : bankInfo.amount
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

      <MemberQrModal member={qrMember} onClose={() => setQrMember(null)} />
    </div>
  );
}
