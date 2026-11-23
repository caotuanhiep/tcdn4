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
  HelpCircle,
  Zap,
  Copy,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Send
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
  const [sepayApiKey, setSepayApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingSepayKey, setSavingSepayKey] = useState(false);
  const [savedSepayKeySuccess, setSavedSepayKeySuccess] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testingSepay, setTestingSepay] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [sepayLogs, setSepayLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadSepayLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/sepay-webhook?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.recentLogs)) {
          setSepayLogs(data.recentLogs);
        }
      }
    } catch {}
    finally {
      setLoadingLogs(false);
    }
  };

  const webhookUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/sepay-webhook` 
    : "https://tcdn4.top/api/sepay-webhook";

  const applyConfig = (parsed: any) => {
    if (parsed.bankCode) setBankCode(parsed.bankCode);
    if (parsed.bankName) setBankName(parsed.bankName);
    if (parsed.accountNumber) setAccountNumber(parsed.accountNumber);
    if (parsed.accountName) setAccountName(parsed.accountName);
    if (parsed.phoneReceive) setPhoneReceive(parsed.phoneReceive);
    if (parsed.amount) setAmount(parsed.amount);
    if (parsed.syntaxPrefix) setSyntaxPrefix(parsed.syntaxPrefix);
    if (parsed.sepayApiKey) setSepayApiKey(parsed.sepayApiKey);
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

    const loadServerConfig = async () => {
      try {
        const supabase = getSupabase();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Nguồn chuẩn: cấu hình đã lưu trên máy chủ (dùng chung cho mọi thiết bị)
        const res = await fetch("/api/settings/bank", { cache: "no-store", headers });
        if (res.ok) {
          const data = await res.json();
          if (data?.success) {
            if (data.source !== "default") {
              applyConfig(data.config);
              cacheBankInfo(normalizeBankConfig(data.config));
            } else if (localCache) {
              toast.error("Cấu hình tài khoản chưa được lưu lên máy chủ. Bấm \"Lưu cấu hình\" để áp dụng cho toàn website.");
            }
          }
        }
      } catch {}
    };

    loadServerConfig();
    loadSepayLogs();
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
      syntaxPrefix: (syntaxPrefix || "TCDN4").trim(),
      sepayApiKey: sepayApiKey.trim(),
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

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast.success("Đã sao chép Webhook URL SePay!");
  };

  const handleSaveSepayKey = async () => {
    setSavingSepayKey(true);
    setSavedSepayKeySuccess(false);

    const config = {
      bankCode,
      bankName,
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim().toUpperCase(),
      phoneReceive: phoneReceive.trim(),
      amount: Number(amount),
      syntaxPrefix: syntaxPrefix || "TCDN4",
      sepayApiKey: sepayApiKey.trim(),
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
      setSavedSepayKeySuccess(true);
      setTimeout(() => setSavedSepayKeySuccess(false), 3500);
      toast.success("Đã lưu API Key SePay thành công lên máy chủ!");
    } catch (err: any) {
      toast.error("Không thể lưu API Key SePay: " + (err?.message || "Lỗi máy chủ"));
    } finally {
      setSavingSepayKey(false);
    }
  };

  const handleTestSepay = async () => {
    setTestingSepay(true);
    setTestResult(null);
    try {
      const testPayload = {
        gateway: bankCode || "MB",
        transactionDate: new Date().toLocaleString("vi-VN"),
        accountNumber: accountNumber.trim(),
        content: `TCDN4 TEST 15 NAM GIAO DICH THU NGHIEM`,
        transferType: "in",
        transferAmount: amount || 1000000,
        referenceCode: `TEST_${Date.now()}`,
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sepayApiKey.trim()) {
        headers["Authorization"] = `Apikey ${sepayApiKey.trim()}`;
      }

      const res = await fetch("/api/sepay-webhook", {
        method: "POST",
        headers,
        body: JSON.stringify(testPayload),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setTestResult(`✓ Giao dịch thử nghiệm thành công! ${data.message || "Đã nhận webhook"}`);
        toast.success("Đã gửi thử nghiệm Webhook SePay thành công!");
        loadSepayLogs();
      } else {
        setTestResult(`⚠ Phản hồi: ${data?.error || data?.message || "Thử nghiệm thất bại"}`);
        toast.error("Thử nghiệm Webhook thất bại!");
      }
    } catch (err: any) {
      setTestResult(`✗ Lỗi kết nối: ${err.message}`);
      toast.error("Lỗi khi gọi API Webhook: " + err.message);
    } finally {
      setTestingSepay(false);
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

      {/* =========================================================================
          CẤU HÌNH TỰ ĐỘNG XÁC THỰC THANH TOÁN QUA CỔNG SEPAY
          ========================================================================= */}
      <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-indigo-100/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-md">
              <Zap size={20} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Cổng Xác Thực Thanh Toán Tự Động (SePay Webhook)
                </h3>
                <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                  Sẵn sàng
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự động nhận biến động số dư ngân hàng và chuyển trạng thái "Đã thanh toán" cho cựu sinh viên.
              </p>
            </div>
          </div>

          <a
            href="https://my.sepay.vn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-2xs shrink-0"
          >
            <ExternalLink size={13} />
            <span>Đăng nhập SePay.vn</span>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Cấu hình URL Webhook & API Key */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                URL Nhận Webhook SePay (Dán vào portal SePay):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full rounded-xl border border-indigo-200 bg-indigo-50/50 px-3.5 py-2.5 font-mono text-xs font-bold text-indigo-950 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors shrink-0"
                >
                  {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedWebhook ? "Đã chép" : "Sao chép"}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Vào <strong>my.sepay.vn</strong> &rarr; <strong>Tích hợp</strong> &rarr; <strong>Webhook</strong> &rarr; Thêm Webhook và dán link trên.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase text-slate-700">
                  API Key SePay (Tùy chọn - nếu bật xác thực header):
                </label>
                {savedSepayKeySuccess && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 animate-pulse">
                    <CheckCircle2 size={13} /> Đã lưu máy chủ!
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={sepayApiKey}
                  onChange={(e) => setSepayApiKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveSepayKey();
                    }
                  }}
                  placeholder="VD: sepay_live_xxxx... (để trống nếu không bật kiểm tra key)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveSepayKey}
                  disabled={savingSepayKey}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                >
                  {savingSepayKey ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{savingSepayKey ? "Đang lưu..." : "Lưu API Key"}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Dán mã API Key bạn đặt trong portal SePay và bấm <strong>Lưu API Key</strong> (hoặc Enter). Hệ thống sẽ lưu trực tiếp lên máy chủ để tự động xác thực gói tin Webhook.
              </p>
            </div>

            {/* Test button & result */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-indigo-600" /> Kiểm tra thông luồng SePay Webhook
                </span>
                <button
                  type="button"
                  disabled={testingSepay}
                  onClick={handleTestSepay}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {testingSepay ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>{testingSepay ? "Đang gửi..." : "Gửi thử nghiệm"}</span>
                </button>
              </div>

              {testResult && (
                <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                  testResult.startsWith("✓") 
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}>
                  {testResult}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Cơ chế hoạt động */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-5 text-xs text-slate-600 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" /> Cơ chế tự động đối soát:
            </h4>
            <ol className="list-decimal pl-4 space-y-2 leading-relaxed text-[11px] text-slate-600">
              <li>
                <strong>Cựu sinh viên chuyển khoản:</strong> Nội dung chuyển khoản theo mẫu <em>TCDN4 - TÊN - SĐT</em> hoặc chứa 4 số cuối điện thoại / họ tên.
              </li>
              <li>
                <strong>SePay nhận giao dịch:</strong> SePay bắt biến động số dư ngân hàng theo thời gian thực và đẩy gói tin Webhook về máy chủ.
              </li>
              <li>
                <strong>Tự động khớp lệnh:</strong> Hệ thống tìm phiếu đăng ký tương ứng (khớp SĐT, 4-6 số cuối hoặc họ tên kể cả đảo thứ tự), tự động đổi trạng thái sang <strong>"Đã thanh toán (confirmed)"</strong>.
              </li>
              <li>
                <strong>Thông báo tức thì:</strong> Tự động gửi thông báo xác nhận thanh toán thành công vào nhóm Zalo Ban Liên Lạc để chào mừng đồng môn!
              </li>
            </ol>

            {/* Nhật ký tín hiệu SePay gần nhất */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-700">
                  Nhật ký tín hiệu SePay ({sepayLogs.length})
                </span>
                <button
                  type="button"
                  onClick={loadSepayLogs}
                  disabled={loadingLogs}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  <RefreshCw size={11} className={loadingLogs ? "animate-spin" : ""} /> Làm mới
                </button>
              </div>
              {sepayLogs.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  Chưa ghi nhận tín hiệu Webhook nào từ SePay. Bấm &quot;Gửi thử nghiệm&quot; hoặc chuyển khoản thử để kiểm tra.
                </p>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {sepayLogs.slice(0, 8).map((log, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-2 text-[10px] leading-snug ${
                        log.status === "matched"
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                          : log.status === "unauthorized" || log.status === "error"
                          ? "bg-rose-50/70 border-rose-200 text-rose-900"
                          : "bg-amber-50/70 border-amber-200 text-amber-900"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>
                          {log.status === "matched"
                            ? `✓ Khớp: ${log.matchedMember || "Thành viên"}`
                            : log.status === "unauthorized"
                            ? "✗ Sai API Key SePay"
                            : log.status === "unmatched"
                            ? "⚠ Chưa khớp thành viên"
                            : log.status}
                        </span>
                        <span className="font-mono opacity-75">
                          {log.amount ? `+${Number(log.amount).toLocaleString("vi-VN")}đ` : ""}
                        </span>
                      </div>
                      {log.content && (
                        <div className="truncate opacity-80 mt-0.5 font-mono">ND: {log.content}</div>
                      )}
                      {log.message && <div className="opacity-80 mt-0.5">{log.message}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
