"use client";

import { useState, useEffect } from "react";
import { 
  Bot, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Link as LinkIcon, 
  ShieldCheck, 
  Cake, 
  Sparkles, 
  Copy, 
  Check, 
  CreditCard,
  Key,
  MessageSquare,
  Users
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { getSupabase } from "@/lib/supabase/client";

const DEFAULT_ZALO_GROUP = "https://zalo.me/g/yodibu606";

interface BirthdayMember {
  name: string;
  className: string;
  birthday: string;
  formattedDate: string;
  isToday: boolean;
  daysUntil: number;
}

export default function ZaloBotSettings() {
  const toast = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [zaloGroup, setZaloGroup] = useState(DEFAULT_ZALO_GROUP);
  const [botEnabled, setBotEnabled] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Claude API & Birthday Auto-wish state
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [birthdayMembers, setBirthdayMembers] = useState<BirthdayMember[]>([]);
  const [selectedBirthdayPerson, setSelectedBirthdayPerson] = useState<BirthdayMember | null>(null);
  const [generatedWish, setGeneratedWish] = useState("");
  const [isGeneratingWish, setIsGeneratingWish] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedWish, setCopiedWish] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tcdn4_zalo_bot_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.webhookUrl) setWebhookUrl(parsed.webhookUrl);
        if (parsed.zaloGroup) setZaloGroup(parsed.zaloGroup);
        if (typeof parsed.botEnabled === "boolean") setBotEnabled(parsed.botEnabled);
        if (parsed.claudeApiKey) setClaudeApiKey(parsed.claudeApiKey);
      }
    } catch {}

    // Quét danh sách sinh nhật cựu sinh viên
    async function scanBirthdays() {
      const list: BirthdayMember[] = [];
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDay = today.getDate();

      try {
        const { data } = await getSupabase()
          .from("profiles")
          .select("full_name, class_name, birthday")
          .not("birthday", "is", null);

        if (data && data.length > 0) {
          data.forEach((p: any) => {
            if (p.birthday) {
              const parts = p.birthday.split("-");
              if (parts.length === 3) {
                const bMonth = parseInt(parts[1], 10);
                const bDay = parseInt(parts[2], 10);
                const isToday = bMonth === currentMonth && bDay === currentDay;

                // Tính số ngày còn lại đến sinh nhật kế tiếp
                let nextBday = new Date(today.getFullYear(), bMonth - 1, bDay);
                if (nextBday.getTime() < today.getTime() - 24 * 3600 * 1000) {
                  nextBday = new Date(today.getFullYear() + 1, bMonth - 1, bDay);
                }
                const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 3600 * 24));

                list.push({
                  name: p.full_name || "Thành viên K33",
                  className: p.class_name || "TC10",
                  birthday: p.birthday,
                  formattedDate: `${bDay}/${bMonth}`,
                  isToday,
                  daysUntil: diffDays,
                });
              }
            }
          });
        }
      } catch {}

      // Sắp xếp người có sinh nhật gần nhất lên trước
      list.sort((a, b) => a.daysUntil - b.daysUntil);
      setBirthdayMembers(list);
      if (list.length > 0) {
        setSelectedBirthdayPerson(list[0]);
      }
    }

    scanBirthdays();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem("tcdn4_zalo_bot_config", JSON.stringify({
        webhookUrl: webhookUrl.trim(),
        zaloGroup: zaloGroup.trim(),
        botEnabled,
        claudeApiKey: claudeApiKey.trim(),
      }));
      toast.success("Đã lưu cấu hình kết nối Zalo Bot & Claude API!");
    } catch {
      toast.error("Không lưu được cấu hình.");
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/zalo-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Nguyễn Văn Test (Demo Admin)",
          className: "TC10",
          shirtSize: "L (Nam)",
          phone: "0903123456",
          address: "279 Nguyễn Tri Phương, Q10",
          paidAmount: 500000,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult(data.botMessage);
        toast.success("Gửi test payload thành công!");
      } else {
        toast.error(`Lỗi test: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`Lỗi kết nối: ${e?.message}`);
    } finally {
      setTesting(false);
    }
  };

  // Tạo lời chúc sinh nhật qua Claude API
  const handleGenerateWish = async () => {
    if (!selectedBirthdayPerson) {
      toast.error("Vui lòng chọn hoặc nhập tên cựu sinh viên!");
      return;
    }

    setIsGeneratingWish(true);
    try {
      const res = await fetch("/api/generate-birthday-wish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedBirthdayPerson.name,
          className: selectedBirthdayPerson.className,
          date: selectedBirthdayPerson.formattedDate,
          apiKey: claudeApiKey.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.wish) {
        setGeneratedWish(data.wish);
        toast.success(
          data.provider === "claude-ai"
            ? "Claude AI đã soạn lời chúc sinh nhật độc quyền!"
            : "Đã tạo lời chúc sinh nhật ấm áp cho bạn bè!"
        );
      } else {
        toast.error("Không tạo được lời chúc, vui lòng thử lại.");
      }
    } catch (e: any) {
      toast.error(`Lỗi: ${e?.message}`);
    } finally {
      setIsGeneratingWish(false);
    }
  };

  // Bắn lời chúc sinh nhật vào nhóm Zalo
  const handleSendWishToZalo = async () => {
    if (!generatedWish.trim()) {
      toast.error("Vui lòng tạo hoặc soạn nội dung lời chúc trước khi gửi!");
      return;
    }

    // Nếu có Webhook URL, thử đẩy qua Webhook
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "birthday_wish",
            message: generatedWish,
            recipient: selectedBirthdayPerson?.name,
          }),
        });
        toast.success("Đã bắn thông báo sinh nhật qua Webhook Zalo Bot!");
      } catch {
        toast.error("Không gửi được qua Webhook URL.");
      }
    }

    // Đồng thời mở Zalo Share Link để đảm bảo gửi được ngay vào nhóm
    const shareUrl = `https://zalo.me/share?url=${encodeURIComponent(zaloGroup)}&title=${encodeURIComponent(generatedWish)}`;
    window.open(shareUrl, "_blank");
  };

  const copyToClipboard = (text: string, type: "sepay" | "wish") => {
    navigator.clipboard.writeText(text);
    if (type === "sepay") {
      setCopiedWebhookUrl(true);
      setTimeout(() => setCopiedWebhookUrl(false), 2000);
    } else {
      setCopiedWish(true);
      setTimeout(() => setCopiedWish(false), 2000);
    }
    toast.success("Đã copy vào bộ nhớ tạm!");
  };

  const sepayWebhookUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/api/sepay-webhook` 
    : "https://tcdn4.top/api/sepay-webhook";

  return (
    <div className="space-y-8">
      
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-ueh flex items-center gap-2">
          <Bot className="text-ueh-orange" size={26} /> Quản Trị Zalo Bot & Sinh Nhật K33
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tự động đẩy thông báo người đăng ký mới, khớp lệnh SePay và chúc mừng sinh nhật cựu sinh viên vào Zalo Group
        </p>
      </div>

      {/* 2. Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Trạng thái Bot</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`flex h-3 w-3 rounded-full ${botEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
            <span className="text-base font-bold text-slate-800">
              {botEnabled ? "Đang kích hoạt" : "Tạm ngưng"}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Tự động kích hoạt luồng thông báo khi có người đăng ký
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Nhóm Zalo Nhận Tin</div>
          <div className="text-base font-bold text-ueh mt-1 truncate">
            TCDN4 - K33 UEH
          </div>
          <a
            href={zaloGroup}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-1 truncate"
          >
            <LinkIcon size={10} /> {zaloGroup}
          </a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Claude AI & SePay</div>
          <div className="text-base font-bold text-slate-800 mt-1 flex items-center gap-1.5">
            <Sparkles size={16} className="text-amber-500" />
            <span>{claudeApiKey ? "Claude API Sẵn Sàng" : "Mẫu Lời Chúc Chuẩn"}</span>
          </div>
          <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 size={11} /> Cổng webhook SePay đã mở
          </p>
        </div>
      </div>

      {/* =========================================================================
          KHU VỰC 1: QUẢN LÝ SINH NHẬT CỰU SINH VIÊN & CHÚC MỪNG BẰNG CLAUDE API
          ========================================================================= */}
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30 p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
              <Cake size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                Quét Sinh Nhật & Soạn Lời Chúc Tự Động (Claude AI)
              </h2>
              <p className="text-xs text-slate-500">
                Lấy ngày sinh của từng cựu sinh viên, dùng AI viết lời chúc ấm áp và gửi vào Zalo Group
              </p>
            </div>
          </div>

          <span className="self-start sm:self-auto rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
            {birthdayMembers.length} thành viên có ngày sinh
          </span>
        </div>

        {/* Danh sách người sắp tới sinh nhật */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
            1. Chọn cựu sinh viên sắp tới sinh nhật:
          </label>

          {birthdayMembers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500 bg-white">
              Chưa có thành viên nào cập nhật ngày sinh trong hệ thống. Bạn có thể tự nhập tên bên dưới để tạo thử lời chúc!
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {birthdayMembers.map((m, idx) => (
                <button
                  key={`${m.name}-${idx}`}
                  type="button"
                  onClick={() => {
                    setSelectedBirthdayPerson(m);
                    setGeneratedWish("");
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all border ${
                    selectedBirthdayPerson?.name === m.name
                      ? "bg-ueh text-white border-ueh shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-ueh"
                  }`}
                >
                  <Cake size={13} className={m.isToday ? "text-amber-400 animate-bounce" : "text-ueh-orange"} />
                  <span>{m.name} ({m.className})</span>
                  <span className={`rounded-lg px-1.5 py-0.2 text-[10px] ${
                    selectedBirthdayPerson?.name === m.name
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {m.isToday ? "HÔM NAY!" : m.formattedDate}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cấu hình Claude API Key */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Key size={13} className="text-amber-600" /> Cổng kết nối Claude API (Anthropic):
            </label>
            <input
              type="password"
              value={claudeApiKey}
              onChange={(e) => setClaudeApiKey(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono focus:border-ueh focus:outline-none"
              placeholder="sk-ant-api03-... (Tùy chọn: để trống dùng mẫu có sẵn)"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Nếu nhập API Key, hệ thống sẽ gọi Claude 3.5 Sonnet để sáng tác lời chúc hài hước, xúc động riêng cho từng người.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Người nhận lời chúc được chọn:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={selectedBirthdayPerson?.name || ""}
                onChange={(e) =>
                  setSelectedBirthdayPerson((prev) =>
                    prev
                      ? { ...prev, name: e.target.value }
                      : {
                          name: e.target.value,
                          className: "TC10",
                          birthday: "",
                          formattedDate: "Hôm nay",
                          isToday: true,
                          daysUntil: 0,
                        }
                  )
                }
                placeholder="Tên cựu sinh viên..."
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-ueh focus:border-ueh focus:outline-none"
              />
              <button
                type="button"
                onClick={handleGenerateWish}
                disabled={isGeneratingWish}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                <Sparkles size={14} className={isGeneratingWish ? "animate-spin" : ""} />
                {isGeneratingWish ? "Đang tạo lời chúc..." : "Tạo Lời Chúc (AI)"}
              </button>
            </div>
          </div>
        </div>

        {/* Khung xem trước & Chỉnh sửa lời chúc */}
        {generatedWish && (
          <div className="rounded-2xl border border-amber-300 bg-white p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare size={14} className="text-amber-500" /> Nội dung lời chúc chuẩn bị gửi vào Zalo:
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(generatedWish, "wish")}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-ueh hover:underline"
              >
                {copiedWish ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                {copiedWish ? "Đã copy" : "Copy nội dung"}
              </button>
            </div>

            <textarea
              rows={5}
              value={generatedWish}
              onChange={(e) => setGeneratedWish(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-ueh focus:outline-none font-sans"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleSendWishToZalo}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0068FF] px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition-all active:scale-95"
              >
                <Send size={14} /> Bắn Lời Chúc Vào Nhóm Zalo K33
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          KHU VỰC 2: HƯỚNG DẪN TÍCH HỢP WEBHOOK SEPAY (XÁC MINH THANH TOÁN TỰ ĐỘNG)
          ========================================================================= */}
      <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/30 p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-blue-100 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ueh text-white shadow-xs">
            <CreditCard size={20} className="text-ueh-gold" />
          </div>
          <div>
            <h2 className="text-base font-black text-ueh flex items-center gap-2">
              Tích Hợp Webhook SePay (Xác Minh Nộp Tiền Tự Động)
            </h2>
            <p className="text-xs text-slate-500">
              Nhận thông báo biến động số dư từ MBBank, Vietcombank, TPBank... tự động chuyển trạng thái đăng ký sang "Đã xác nhận"
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <p className="font-bold text-slate-800">
              Cách cấu hình trên trang <strong className="text-ueh">my.sepay.vn/webhooks</strong>:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>Đăng nhập vào SePay -&gt; Menu <strong>Tích hợp WebHooks</strong> -&gt; bấm <strong>Thêm Webhook</strong>.</li>
              <li><strong>Tên webhook:</strong> Nhập <span className="font-mono font-bold text-ueh">TCDN4</span></li>
              <li>
                <strong>URL nhận webhook:</strong> Dán đường link bên dưới.
              </li>
              <li><strong>Loại giao dịch:</strong> Chọn <span className="font-bold text-emerald-700">Tiền vào</span></li>
              <li><strong>Định dạng dữ liệu:</strong> Chọn <span className="font-bold text-ueh">JSON (khuyến nghị)</span></li>
              <li>Bật <strong>"Tự động gửi lại khi server trả lỗi"</strong>.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-2xs space-y-2.5">
            <label className="block text-xs font-bold text-ueh uppercase tracking-wide">
              URL Webhook của bạn (Dán vào SePay):
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={sepayWebhookUrl}
                className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 select-all"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(sepayWebhookUrl, "sepay")}
                className="flex items-center gap-1 rounded-xl bg-ueh px-3 py-2 text-xs font-bold text-white hover:bg-ueh-light transition-colors shrink-0"
              >
                {copiedWebhookUrl ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                {copiedWebhookUrl ? "Đã chép" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Endpoint: <code className="text-ueh font-bold">POST /api/sepay-webhook</code>
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          KHU VỰC 3: FORM CẤU HÌNH ZALO BOT CƠ BẢN
          ========================================================================= */}
      <form onSubmit={handleSave} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
          Cấu Hình Zalo Bot Webhook
        </h3>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
            Đường dẫn Nhóm Zalo Lớp *
          </label>
          <input
            type="url"
            required
            value={zaloGroup}
            onChange={(e) => setZaloGroup(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs focus:border-ueh focus:outline-none"
            placeholder="https://zalo.me/g/..."
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Link nhóm Zalo hiện tại: <span className="font-mono text-slate-600">https://zalo.me/g/yodibu606</span>
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
            Webhook URL Tự Động (Zalo Bot / n8n / Make / Telegram Bot Webhook)
          </label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs focus:border-ueh focus:outline-none font-mono"
            placeholder="https://hook.eu2.make.com/... hoặc endpoint Zalo OA"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Tùy chọn: Khi có người đăng ký hoặc sinh nhật, hệ thống sẽ gửi HTTP POST payload chứa thông tin tới URL này để Bot tự bắn vào group.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={botEnabled}
              onChange={(e) => setBotEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-ueh focus:ring-ueh"
            />
            Bật tính năng tự động thông báo
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
            {testing ? "Đang gửi test..." : "Gửi Test Tin Nhắn Mẫu"}
          </button>

          <button
            type="submit"
            className="rounded-xl bg-ueh px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-ueh-light transition-colors"
          >
            Lưu Toàn Bộ Cấu Hình
          </button>
        </div>

        {testResult && (
          <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
            <div className="text-xs font-bold text-slate-700 mb-1.5">Mẫu tin nhắn Bot đã tạo:</div>
            <pre className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-100">
              {testResult}
            </pre>
          </div>
        )}
      </form>

    </div>
  );
}
