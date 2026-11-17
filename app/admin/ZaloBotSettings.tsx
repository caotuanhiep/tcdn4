"use client";

import { useState, useEffect } from "react";
import { Bot, Send, CheckCircle2, AlertCircle, RefreshCw, Link as LinkIcon, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

const DEFAULT_ZALO_GROUP = "https://zalo.me/g/yodibu606";

export default function ZaloBotSettings() {
  const toast = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [zaloGroup, setZaloGroup] = useState(DEFAULT_ZALO_GROUP);
  const [botEnabled, setBotEnabled] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tcdn4_zalo_bot_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.webhookUrl) setWebhookUrl(parsed.webhookUrl);
        if (parsed.zaloGroup) setZaloGroup(parsed.zaloGroup);
        if (typeof parsed.botEnabled === "boolean") setBotEnabled(parsed.botEnabled);
      }
    } catch {}
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem("tcdn4_zalo_bot_config", JSON.stringify({
        webhookUrl: webhookUrl.trim(),
        zaloGroup: zaloGroup.trim(),
        botEnabled,
      }));
      toast.success("Đã lưu cấu hình kết nối Zalo Bot!");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-ueh flex items-center gap-2">
          <Bot className="text-ueh-orange" size={26} /> Cấu hình Đấu Nối Zalo Bot
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Tự động đẩy thông báo vào nhóm Zalo khi có cựu sinh viên đăng ký tham gia hoặc đóng góp kỷ niệm
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status card */}
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

        {/* Link Nhóm */}
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

        {/* Webhook Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="text-[11px] font-bold uppercase text-slate-400">Kênh Webhook</div>
          <div className="text-base font-bold text-slate-800 mt-1">
            {webhookUrl ? "Custom Endpoint" : "Zalo Deep Link Fallback"}
          </div>
          <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 size={11} /> Sẵn sàng phát sinh tin nhắn tự động
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSave} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-4">
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
            Tùy chọn: Khi có người đăng ký, hệ thống sẽ gửi HTTP POST payload chứa thông tin người đăng ký tới URL này để Bot tự bắn vào group.
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
            className="rounded-xl bg-ueh px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-ueh-light transition-colors"
          >
            Lưu Cấu Hình
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
