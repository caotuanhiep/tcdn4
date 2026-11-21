"use client";

import { useState, useEffect } from "react";
import { 
  CreditCard, 
  QrCode, 
  Save, 
  Check, 
  Building2, 
  Phone, 
  DollarSign, 
  RefreshCw,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { BANK_STORAGE_KEY, cacheBankInfo, normalizeBankConfig } from "@/lib/bank";
import { getSupabase } from "@/lib/supabase/client";

const POPULAR_BANKS = [
  { code: "MB", name: "MB Bank (Ngân hàng Quân Đội)" },
  { code: "VCB", name: "Vietcombank" },
  { code: "TCB", name: "Techcombank" },
  { code: "ACB", name: "ACB (Á Châu)" },
  { code: "VPB", name: "VPBank" },
  { code: "BIDV", name: "BIDV" },
  { code: "CTG", name: "VietinBank" },
  { code: "TPB", name: "TPBank" },
];

export default function PaymentSettingsPanel() {
  const toast = useToast();

  const [bankCode, setBankCode] = useState("MB");
  const [bankName, setBankName] = useState("Ngân hàng TMCP Quân Đội (MB Bank)");
  const [accountNumber, setAccountNumber] = useState("0903123456");
  const [accountName, setAccountName] = useState("BAN LIEN LAC TCDN4 K33");
  const [phoneReceive, setPhoneReceive] = useState("0903 123 456");
  const [amount, setAmount] = useState(1000000);
  const [syntaxPrefix, setSyntaxPrefix] = useState("TCDN4");
  const [saving, setSaving] = useState(false);

  const applyConfig = (parsed: any) => {
    if (parsed.bankCode) setBankCode(parsed.bankCode);
    if (parsed.bankName) setBankName(parsed.bankName);
    if (parsed.accountNumber) setAccountNumber(parsed.accountNumber);
    if (parsed.accountName) setAccountName(parsed.accountName);
    if (parsed.phoneReceive) setPhoneReceive(parsed.phoneReceive);
    if (parsed.amount) setAmount(parsed.amount);
    if (parsed.syntaxPrefix) setSyntaxPrefix(parsed.syntaxPrefix);
  };

  useEffect(() => {
    let localCache: any = null;
    try {
      const stored = localStorage.getItem(BANK_STORAGE_KEY);
      if (stored) {
        localCache = JSON.parse(stored);
        applyConfig(localCache);
      }
    } catch {}

    // Nguồn chuẩn: cấu hình đã lưu trên máy chủ (dùng chung cho mọi thiết bị)
    fetch("/api/settings/bank", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.success) return;
        if (data.source !== "default") {
          applyConfig(data.config);
          cacheBankInfo(normalizeBankConfig(data.config));
        } else if (localCache) {
          toast.error("Cấu hình tài khoản chưa được lưu lên máy chủ. Bấm \"Lưu cấu hình\" để áp dụng cho toàn website.");
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBankChange = (code: string) => {
    setBankCode(code);
    const found = POPULAR_BANKS.find((b) => b.code === code);
    if (found) setBankName(found.name);
  };

  // Không cố định nội dung chuyển khoản trong mã VietQR để người dùng và app ngân hàng tự do ghi chú đúng tên
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber.trim()}-compact2.png?amount=${amount}&accountName=${encodeURIComponent(
    accountName.trim()
  )}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const config = {
      bankCode,
      bankName,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim().toUpperCase(),
      phoneReceive: phoneReceive.trim(),
      amount: Number(amount),
      syntaxPrefix: "TCDN4",
    };

    try {
      const supabase = getSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/settings/bank", {
        method: "PUT",
        headers,
        body: JSON.stringify(config),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      cacheBankInfo(normalizeBankConfig(data.config || config));
      toast.success("Đã lưu cấu hình tài khoản & mã QR lên máy chủ - áp dụng cho toàn website!");
    } catch (err: any) {
      toast.error("Không thể lưu cấu hình: " + (err?.message || "Lỗi máy chủ"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200 mb-1.5">
              <CreditCard size={13} className="text-emerald-600" /> Cấu hình tài chính sự kiện
            </div>
            <h3 className="text-xl font-black text-ueh sm:text-2xl">
              Cấu Hình Thanh Toán & Mã VietQR
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý tài khoản thụ hưởng, số điện thoại đối soát và sinh mã QR tự động trên toàn website.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Cấu hình (Left 7 Cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
              Ngân hàng thụ hưởng *
            </label>
            <select
              value={bankCode}
              onChange={(e) => handleBankChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold focus:border-ueh focus:outline-none"
            >
              {POPULAR_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Số tài khoản nhận tiền *
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="VD: 0903123456"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-ueh focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Tên chủ tài khoản (In hoa) *
              </label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                placeholder="VD: BAN LIEN LAC TCDN4 K33"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold uppercase text-slate-900 focus:border-ueh focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Kinh phí mặc định (VNĐ) *
              </label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                step={50000}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-emerald-700 focus:border-ueh focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Hiện tại: {amount.toLocaleString("vi-VN")} VNĐ
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Số ĐT / Zalo đối soát thanh toán *
              </label>
              <input
                type="text"
                required
                value={phoneReceive}
                onChange={(e) => setPhoneReceive(e.target.value)}
                placeholder="VD: 0903 123 456"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-ueh focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-ueh uppercase">
              <Sparkles size={14} className="text-ueh-orange" /> Cú pháp chuyển khoản gợi ý cho thành viên
            </div>
            <div className="inline-block rounded-xl bg-white px-3 py-1.5 font-mono text-xs font-black text-slate-800 border border-blue-200 shadow-2xs">
              TCDN4 - [TÊN] - [SĐT]
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>Lưu ý:</strong> Mã VietQR sẽ <u>không cố định nội dung</u> chuyển khoản để tránh tình trạng ai quét cũng bị gán 1 nội dung cố định không đối soát được. Thay vào đó, hệ thống sẽ gợi ý cú pháp <em>TCDN4 - TÊN - SDT</em> kèm nút sao chép nhanh khi thành viên đóng góp.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-ueh px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-ueh-light disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saving ? "Đang lưu..." : "Lưu Cấu Hình Thanh Toán"}</span>
            </button>
          </div>
        </form>

        {/* Live Preview VietQR (Right 5 Cols) */}
        <div className="lg:col-span-5 rounded-3xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 p-6 shadow-xs flex flex-col items-center justify-between text-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800 shadow-2xs border border-emerald-200 mb-3">
              <QrCode size={14} className="text-emerald-600" /> Xem Trước Mã VietQR
            </div>
            <h4 className="text-sm font-black text-slate-900">Mã QR Chuyển Khoản Tự Động</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mã này sẽ hiển thị cho thành viên quét khi đăng ký tham dự.
            </p>
          </div>

          <div className="my-4 rounded-2xl border-2 border-emerald-300 bg-white p-3 shadow-md max-w-[220px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="VietQR Preview" className="w-full h-auto rounded-xl" />
          </div>

          <div className="w-full rounded-xl bg-white p-3 text-left border border-emerald-100 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Ngân hàng:</span>
              <span className="font-bold text-slate-800">{bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Số tài khoản:</span>
              <span className="font-mono font-bold text-slate-900">{accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Chủ tài khoản:</span>
              <span className="font-bold uppercase text-ueh">{accountName}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-400">Số tiền:</span>
              <span className="font-black text-emerald-700">{amount.toLocaleString("vi-VN")} VNĐ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
