"use client";

import { useEffect, useState } from "react";
import {
  QrCode,
  X,
  Copy,
  CheckCheck,
  Download,
  Image as ImageIcon,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { DEFAULT_BANK_INFO, fetchBankInfo, getBankInfo, type BankConfig } from "@/lib/bank";

export interface QrTargetMember {
  fullName: string;
  className?: string | null;
  phone?: string | null;
  shirtSize?: string | null;
  guestsCount?: number | null;
  paidAmount?: number | null;
  registrationType?: "attending" | "shirt_only";
}

function removeVietnameseTones(str: string) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export default function MemberQrModal({
  member,
  onClose,
}: {
  member: QrTargetMember | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [bankInfo, setBankInfo] = useState<BankConfig>(DEFAULT_BANK_INFO);
  const [customAmount, setCustomAmount] = useState<number>(DEFAULT_BANK_INFO.amount);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyingImage, setCopyingImage] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isShirtOnly = member?.registrationType === "shirt_only";

  useEffect(() => {
    const cached = getBankInfo();
    const defaultAmt = isShirtOnly ? cached.shirtOnlyAmount || 250000 : cached.amount;
    setBankInfo(cached);
    setCustomAmount(Number(member?.paidAmount) > 0 ? Number(member?.paidAmount) : defaultAmt);

    let cancelled = false;
    fetchBankInfo()
      .then((cfg) => {
        if (cancelled) return;
        setBankInfo(cfg);
        if (!member?.paidAmount) {
          setCustomAmount(isShirtOnly ? cfg.shirtOnlyAmount || 250000 : cfg.amount);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [member, isShirtOnly]);

  if (!member) return null;

  const cleanNameNoTones = member.fullName
    ? removeVietnameseTones(member.fullName.trim().toUpperCase()).replace(/[^A-Z0-9 ]/g, "")
    : "TEN";
  const cleanPhoneDigits = member.phone ? member.phone.trim().replace(/[^0-9]/g, "") : "";
  const transferSyntax = [
    bankInfo.syntaxPrefix || "TCDN4",
    isShirtOnly ? "AO" : "",
    cleanNameNoTones,
    cleanPhoneDigits,
  ]
    .filter(Boolean)
    .join(" ");

  const fallbackAmount = isShirtOnly ? bankInfo.shirtOnlyAmount || 250000 : bankInfo.amount;
  const safeAmount = Number(customAmount) > 0 ? Math.round(Number(customAmount)) : fallbackAmount;
  const qrUrl = `https://img.vietqr.io/image/${bankInfo.bankCode}-${bankInfo.accountNumber}-compact2.png?amount=${safeAmount}&addInfo=${encodeURIComponent(
    transferSyntax
  )}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

  const copyText = (value: string, key: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const buildZaloMessage = () => {
    const guestsLine =
      member.guestsCount && member.guestsCount > 0
        ? `\n• Người thân đi cùng: +${member.guestsCount} người`
        : "";
    const shirtLine = member.shirtSize ? `\n• Size áo Polo: ${member.shirtSize}` : "";
    const introLine = isShirtOnly
      ? `Chào ${member.fullName}, mình đã đăng ký giúp bạn nhận Áo Polo Kỷ Niệm 15 năm TCDN4 - K33 UEH (gửi ship tận nơi) rồi nhé! 👕\n`
      : `Chào ${member.fullName}, mình đã đăng ký giúp bạn tham gia Họp mặt 15 năm TCDN4 - K33 UEH (Thứ 7, 12/12/2026) rồi nhé! 🎉\n`;
    const feeLabel = isShirtOnly ? "Chi phí áo kỷ niệm" : "Kinh phí tham dự";
    return (
      `${introLine}` +
      `${shirtLine}${guestsLine}\n` +
      `• ${feeLabel}: ${safeAmount.toLocaleString("vi-VN")} VNĐ\n` +
      `• Ngân hàng: ${bankInfo.bankName}\n` +
      `• Số tài khoản: ${bankInfo.accountNumber} (${bankInfo.accountName})\n` +
      `• Nội dung CK: ${transferSyntax}\n\n` +
      `Bạn quét mã QR mình gửi kèm bên dưới để chuyển nhanh nhé (hệ thống SePay sẽ tự động xác nhận ngay khi tiền về)! 🍻`
    ).replace(/\n{3,}/g, "\n\n");
  };

  const handleDownloadQr = async () => {
    setDownloading(true);
    try {
      const res = await fetch(qrUrl);
      if (!res.ok) throw new Error("Không tải được ảnh QR");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `QR-TCDN4-${cleanNameNoTones.replace(/\s+/g, "-") || "thanh-vien"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Đã tải ảnh mã QR về máy! Bạn có thể thả trực tiếp vào Zalo.");
    } catch {
      window.open(qrUrl, "_blank", "noopener,noreferrer");
      toast.info("Đã mở ảnh QR ở tab mới — bạn nhấn chuột phải để lưu hoặc sao chép ảnh.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyQrImage = async () => {
    setCopyingImage(true);
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        throw new Error("Trình duyệt không hỗ trợ copy ảnh trực tiếp");
      }
      const res = await fetch(qrUrl);
      if (!res.ok) throw new Error("Không lấy được ảnh QR");
      const blob = await res.blob();
      const pngBlob = blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      setCopiedKey("qr-img");
      toast.success("Đã copy ảnh mã QR! Nhấn Ctrl+V vào khung chat Zalo để gửi ngay.");
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      copyText(qrUrl, "qr-url", "đường dẫn ảnh QR");
    } finally {
      setCopyingImage(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          <X size={16} />
        </button>

        <div className="text-center mb-3">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-ueh text-white shadow-xs">
            <QrCode size={22} className="text-ueh-gold" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            Mã VietQR Thanh Toán Cho Thành Viên
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Gửi mã này cho <strong className="text-ueh">{member.fullName}</strong>{" "}
            {member.className ? `(${member.className})` : ""} để quét thanh toán — SePay tự động đối soát!
          </p>
        </div>

        {/* Ảnh QR */}
        <div className="mx-auto w-56 sm:w-60 overflow-hidden rounded-2xl border-2 border-emerald-300 bg-white p-2 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`VietQR cho ${member.fullName}`}
            className="w-full h-auto rounded-xl"
          />
        </div>

        {/* Tùy chỉnh nhanh số tiền nếu cần */}
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
          <span className="font-bold text-slate-600 shrink-0">Số tiền trên QR:</span>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={10000}
              step={100000}
              value={customAmount}
              onChange={(e) => setCustomAmount(Number(e.target.value) || 0)}
              className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right font-black text-emerald-700 focus:border-ueh focus:outline-none"
            />
            <span className="text-[11px] font-bold text-slate-500">VNĐ</span>
          </div>
        </div>

        {/* Thông tin chuyển khoản */}
        <div className="mt-3 space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Ngân hàng:</span>
            <span className="font-bold text-slate-900">{bankInfo.bankName}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Số tài khoản:</span>
            <div className="flex items-center gap-1">
              <span className="font-mono font-bold text-slate-900">{bankInfo.accountNumber}</span>
              <button
                type="button"
                onClick={() => copyText(bankInfo.accountNumber, "acc", "số tài khoản")}
                className="rounded p-1 text-ueh hover:bg-blue-100"
                title="Sao chép STK"
              >
                {copiedKey === "acc" ? <CheckCheck size={13} className="text-emerald-600" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Chủ tài khoản:</span>
            <span className="font-bold text-slate-900">{bankInfo.accountName}</span>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-2 mt-1.5">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-bold uppercase text-ueh">Nội dung CK (SePay tự khớp):</span>
              <button
                type="button"
                onClick={() => copyText(transferSyntax, "syntax", "cú pháp chuyển khoản")}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-ueh hover:underline"
              >
                {copiedKey === "syntax" ? <CheckCheck size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>Sao chép</span>
              </button>
            </div>
            <div className="font-mono text-xs font-black text-ueh break-all">{transferSyntax}</div>
            {!cleanPhoneDigits && (
              <div className="text-[10px] text-amber-700 mt-1">
                ⚠️ Thành viên chưa có SĐT — nên bổ sung SĐT để SePay đối soát chính xác nhất.
              </div>
            )}
          </div>
        </div>

        {/* Nút thao tác nhanh để gửi Zalo */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={copyingImage}
            onClick={() => void handleCopyQrImage()}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-ueh px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-ueh-light active:scale-98 disabled:opacity-50"
          >
            {copyingImage ? (
              <Loader2 size={14} className="animate-spin" />
            ) : copiedKey === "qr-img" ? (
              <CheckCheck size={14} className="text-ueh-gold" />
            ) : (
              <ImageIcon size={14} className="text-ueh-gold" />
            )}
            <span>{copiedKey === "qr-img" ? "Đã copy ảnh!" : "Copy ảnh QR"}</span>
          </button>

          <button
            type="button"
            disabled={downloading}
            onClick={() => void handleDownloadQr()}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-98 disabled:opacity-50"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Tải ảnh PNG</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => copyText(buildZaloMessage(), "zalo-msg", "tin nhắn gửi Zalo")}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-98"
        >
          {copiedKey === "zalo-msg" ? <CheckCheck size={15} /> : <MessageCircle size={15} />}
          <span>
            {copiedKey === "zalo-msg"
              ? "Đã copy tin nhắn! Dán vào Zalo ngay"
              : "Copy tin nhắn kèm STK & cú pháp gửi Zalo"}
          </span>
        </button>
      </div>
    </div>
  );
}
