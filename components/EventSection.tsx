"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, 
  CalendarCheck,
  Clock, 
  MapPin, 
  Users, 
  Shirt, 
  QrCode, 
  CheckCircle2, 
  Send, 
  MessageCircle, 
  Copy, 
  Check, 
  ChevronRight, 
  Sparkles, 
  UserCheck, 
  ShieldCheck, 
  ArrowRight,
  Bot
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";

const ZALO_GROUP_URL = "https://zalo.me/g/yodibu606";

interface Registration {
  id: string;
  fullName: string;
  className: "TC10" | "TC11" | "TC12";
  phone: string;
  shirtSize: string;
  address: string;
  guestsCount: number;
  status: "confirmed" | "pending";
  paidAmount: number;
  createdAt: string;
  note?: string;
}

const INITIAL_REGISTRATIONS: Registration[] = [];

import { DEFAULT_BANK_INFO, getBankInfo, BankConfig } from "@/lib/bank";

export default function EventSection() {
  const toast = useToast();
  const { user, openLogin, openProfile } = useAuth();
  const [bankInfo, setBankInfo] = useState<BankConfig>(DEFAULT_BANK_INFO);
  const [registrations, setRegistrations] = useState<Registration[]>(INITIAL_REGISTRATIONS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<"form" | "payment" | "success">("form");

  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState<"TC10" | "TC11" | "TC12">("TC10");
  const [phone, setPhone] = useState("");
  const [shirtSize, setShirtSize] = useState("L (Nam)");
  const [address, setAddress] = useState("");
  const [guestsCount, setGuestsCount] = useState(0);
  const [note, setNote] = useState("");

  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedSyntax, setCopiedSyntax] = useState(false);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [showShirtSizePopup, setShowShirtSizePopup] = useState(false);

  // Bộ đếm lùi (Countdown Timer) tới Thứ 7 ngày 12/12/2026 (11:30:00)
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    setMounted(true);
    // Mốc thời gian chốt: Thứ 7 ngày 12/12/2026 lúc 11:30 AM
    const target = new Date("2026-12-12T11:30:00").getTime();

    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setBankInfo(getBankInfo());
    try {
      const stored = localStorage.getItem("tcdn4_registrations");
      if (stored) {
        setRegistrations(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const saveRegistrations = (newList: Registration[]) => {
    setRegistrations(newList);
    try {
      localStorage.setItem("tcdn4_registrations", JSON.stringify(newList));
    } catch {}
  };

  const transferSyntax = `TCDN4 ${fullName ? fullName.trim().toUpperCase() : "HO TEN"} ${phone ? phone.slice(-4) : "SDT"}`;

  const qrUrl = `https://img.vietqr.io/image/${bankInfo.bankCode}-${bankInfo.accountNumber}-compact2.png?amount=${bankInfo.amount}&addInfo=${encodeURIComponent(
    transferSyntax
  )}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      toast.error("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận áo!");
      return;
    }

    const newReg: Registration = {
      id: `reg-${Date.now()}`,
      fullName: fullName.trim(),
      className,
      phone: phone.trim(),
      shirtSize,
      address: address.trim(),
      guestsCount,
      status: "pending",
      paidAmount: bankInfo.amount,
      createdAt: new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      note: note.trim() || undefined,
    };

    const updated = [newReg, ...registrations];
    saveRegistrations(updated);

    // Call Zalo Bot API automatically
    try {
      fetch("/api/zalo-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReg),
      });
    } catch {}

    setStep("payment");
  };

  const handleFinishPayment = () => {
    setStep("success");
    toast.success("Đăng ký thành công! Đang kích hoạt thông báo tới nhóm Zalo...");
  };

  const copyToClipboard = (text: string, type: "account" | "syntax") => {
    navigator.clipboard.writeText(text);
    if (type === "account") {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } else {
      setCopiedSyntax(true);
      setTimeout(() => setCopiedSyntax(false), 2000);
    }
    toast.success("Đã sao chép vào bộ nhớ tạm!");
  };

  const handleShareToZaloGroup = () => {
    const message = `🎉 [TCDN4-K33 15 NĂM] Đăng ký mới tham dự sự kiện:\n👤 Họ tên: ${fullName || "Thành viên TCDN4"}\n🎓 Lớp: ${className}\n👕 Size áo: ${shirtSize}\n📍 Địa chỉ nhận áo: ${address}\n💰 Kinh phí: ${bankInfo.amountText}\n✨ Link nhóm: ${ZALO_GROUP_URL}`;
    const zaloShareUrl = `https://zalo.me/share?url=${encodeURIComponent(ZALO_GROUP_URL)}&title=${encodeURIComponent(message)}`;
    window.open(zaloShareUrl, "_blank");
  };

  const filteredRegistrations = filterClass === "all" 
    ? registrations 
    : registrations.filter(r => r.className === filterClass);

  const confirmedCount = registrations.filter(r => r.status === "confirmed").length;

  return (
    <section id="event" className="scroll-mt-16 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-3 border border-blue-100">
            <Sparkles size={14} className="text-ueh-orange" /> Kỷ niệm 15 năm tốt nghiệp
          </div>
          <h2 className="text-3xl font-black text-ueh sm:text-5xl lg:text-6xl tracking-tight leading-tight">
            Chương Trình Gặp Mặt 15 Năm
          </h2>
          <div className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-slate-600 leading-relaxed">
            Buổi gặp gỡ thân mật quay lại giảng đường Cơ sở A - UEH, nhận áo kỷ niệm và sẻ chia chặng đường 15 năm cùng bạn bè.
          </p>
        </div>

        {/* Thẻ Áo Polo Kỷ Niệm hiển thị trên Mobile (nằm ngay trên mục Thông tin chung) - Dùng ảnh nền trong suốt */}
        <div className="block lg:hidden mb-6 rounded-3xl overflow-hidden border border-orange-200/90 bg-gradient-to-br from-orange-50/90 via-white to-amber-50/60 p-3.5 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="h-28 w-24 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-b from-slate-100 to-blue-50/60 border border-orange-100 p-1 flex items-center justify-center shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/model-uniform-transparent.png"
                alt="Áo Polo Kỷ Niệm 15 Năm TCDN4"
                className="h-full w-auto object-contain object-bottom"
              />
            </div>
            <div className="flex-1 text-left">
              <span className="inline-flex items-center gap-1 rounded-full bg-ueh px-2 py-0.5 text-[10px] font-black text-white mb-1">
                <Sparkles size={10} className="text-ueh-gold" /> Quà tặng K33
              </span>
              <h4 className="text-sm font-black text-ueh">Áo Polo Kỷ Niệm 15 Năm</h4>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                Cotton cá sấu 4 chiều cao cấp, gửi ship tận nhà trước ngày 12/12.
              </p>
              <button
                onClick={() => {
                  if (!user) {
                    openLogin();
                  } else {
                    openProfile();
                  }
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-ueh-orange px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-orange-600"
              >
                <Shirt size={12} /> Đăng ký nhận áo kỷ niệm TC4
              </button>
            </div>
          </div>
        </div>

        {/* 2 Cards Grid: Thông tin & Lịch trình */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 mb-12">
          
          {/* Card Thông tin chung (Left 5 Cols) - Nền cam nhẹ nổi bật & Đếm ngược */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-orange-200/90 bg-gradient-to-br from-[#FFF7ED] via-[#FFFDFB] to-[#FFEDD5]/40 p-5 sm:p-7 shadow-md shadow-orange-500/5 ring-1 ring-orange-200/50">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-ueh flex items-center gap-2 whitespace-nowrap">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-ueh-orange">
                    <Calendar size={18} />
                  </div>
                  <span>Thông tin chung</span>
                </h3>
                <span className="rounded-full bg-orange-100/90 border border-orange-200/80 px-2.5 py-0.5 text-[11px] font-bold text-ueh-orange whitespace-nowrap">
                  Chốt Thứ 7 ngày 12/12
                </span>
              </div>

              {/* Widget Đếm Ngược Thời Gian (Countdown Timer) */}
              <div className="mb-5 rounded-2xl border border-orange-200/80 bg-white/95 p-3.5 shadow-2xs backdrop-blur-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-orange-900/80 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} className="text-ueh-orange animate-pulse" /> Đếm ngược đến ngày hội ngộ
                  </span>
                  <span className="text-[10px] font-bold text-ueh-orange bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                    12/12/2026
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl bg-gradient-to-b from-orange-500 to-amber-600 p-2 text-white shadow-2xs">
                    <div className="text-xl sm:text-2xl font-black leading-none">{mounted ? String(timeLeft.days).padStart(2, "0") : "--"}</div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-orange-100 mt-1">Ngày</div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-2 text-white shadow-2xs">
                    <div className="text-xl sm:text-2xl font-black leading-none">{mounted ? String(timeLeft.hours).padStart(2, "0") : "--"}</div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-300 mt-1">Giờ</div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-2 text-white shadow-2xs">
                    <div className="text-xl sm:text-2xl font-black leading-none">{mounted ? String(timeLeft.minutes).padStart(2, "0") : "--"}</div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-300 mt-1">Phút</div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-2 text-white shadow-2xs">
                    <div className="text-xl sm:text-2xl font-black leading-none text-orange-400">{mounted ? String(timeLeft.seconds).padStart(2, "0") : "--"}</div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-300 mt-1">Giây</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ueh-orange shadow-2xs border border-orange-200/70">
                    <Clock size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Thời gian</div>
                    <div className="text-sm font-bold text-slate-900">Thứ 7, ngày 12/12/2026</div>
                    <div className="text-xs font-semibold text-ueh-orange">Bắt đầu từ: 11:30 (Đã chốt)</div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-500 shadow-2xs border border-orange-200/70">
                    <CalendarCheck size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Hạn chốt đăng ký</div>
                    <div className="text-sm font-bold text-slate-900">Trước ngày 30/11/2026</div>
                    <div className="text-xs text-slate-500">Để may áo kỷ niệm & chuẩn bị đón tiếp chu đáo</div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ueh shadow-2xs border border-orange-200/70">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Địa điểm tiệc</div>
                    <div className="text-sm font-bold text-slate-900">Quán Làng Nướng Nam Bộ</div>
                    <div className="text-xs text-slate-600 font-medium">302A Tô Hiến Thành, P.15, Q.10, TP.HCM</div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ueh shadow-2xs border border-orange-200/70">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quy mô</div>
                    <div className="text-sm font-bold text-slate-900">Tập thể TC10, TC11, TC12 (~35 bạn)</div>
                    <div className="text-xs text-slate-500">Kèm gia đình & F1 (tùy chọn)</div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ueh shadow-2xs border border-orange-200/70">
                    <Shirt size={18} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quà tặng</div>
                    <div className="text-sm font-bold text-slate-900">Áo Polo Kỷ niệm 15 Năm TCDN4</div>
                    <div className="text-xs text-slate-500">Gửi ship tận nơi trước ngày gặp mặt</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-orange-200/80">
              <button
                onClick={() => {
                  if (!user) {
                    openLogin();
                  } else {
                    openProfile();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-ueh to-ueh-light py-3.5 px-5 text-sm font-bold text-white shadow-md shadow-blue-900/25 transition-all hover:opacity-95 whitespace-nowrap"
              >
                <Shirt size={18} className="text-ueh-gold shrink-0" />
                <span>Đăng ký & Chọn size áo</span>
                <ArrowRight size={16} className="shrink-0" />
              </button>
              <div className="mt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
                <ShieldCheck size={13} className="text-emerald-500" />
                Tự động kết nối thông báo Bot Zalo
              </div>
            </div>
          </div>

          {/* Timeline Lịch trình */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-200/80 bg-slate-50/50 p-5 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg sm:text-xl font-bold text-ueh">Lịch trình sơ bộ</h3>
                <span className="text-xs font-semibold text-slate-500">3 Chặng cảm xúc</span>
              </div>

              <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-ueh via-ueh-light before:to-transparent">
                <div className="relative flex items-start gap-3.5 pl-1">
                  <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ueh text-white text-xs font-bold shadow-xs ring-4 ring-white">
                    1
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ueh uppercase tracking-wide">11:30 - 12:00</span>
                      <span className="text-[11px] rounded-md bg-blue-50 px-2 py-0.5 font-medium text-ueh">302A Tô Hiến Thành</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">Đón tiếp & Trao áo kỷ niệm TC4</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Tập trung tại Làng Nướng Nam Bộ, check-in gặp gỡ bạn bè, nhận áo đồng phục kỷ niệm 15 năm và chụp hình lưu niệm.
                    </p>
                  </div>
                </div>

                <div className="relative flex items-start gap-3.5 pl-1">
                  <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ueh-light text-white text-xs font-bold shadow-xs ring-4 ring-white">
                    2
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ueh-light uppercase tracking-wide">12:00 - 14:30</span>
                      <span className="text-[11px] rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">Làng Nướng Nam Bộ</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">Tiệc trưa hội ngộ 15 năm & Giao lưu</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Nâng ly mừng 15 năm ra trường, ôn lại kỷ niệm thanh xuân thời sinh viên và chia sẻ những bước ngoặt trong sự nghiệp.
                    </p>
                  </div>
                </div>

                <div className="relative flex items-start gap-3.5 pl-1">
                  <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ueh-orange text-white text-xs font-bold shadow-xs ring-4 ring-white">
                    3
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ueh-orange uppercase tracking-wide">14:30 trở đi</span>
                      <span className="text-[11px] rounded-md bg-orange-50 px-2 py-0.5 font-medium text-ueh-orange">TCDN4 Hub</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">Lưu giữ Kỷ yếu & Kết nối lâu dài</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Lưu trữ toàn bộ hình ảnh và video sự kiện lên website nội bộ, duy trì mạng lưới hợp tác dài hạn.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Box Zalo */}
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-blue-50/80 border border-blue-100 p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zalo text-white shadow-2xs">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Bot Zalo Nhóm Lớp
                    <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2">Tự động</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Tự động thông báo khi có người đăng ký mới</div>
                </div>
              </div>
              <a
                href={ZALO_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-ueh shadow-2xs border border-blue-200 hover:bg-blue-50 transition-colors"
              >
                Mở nhóm Zalo <ChevronRight size={13} />
              </a>
            </div>
          </div>
        </div>

        {/* Danh sách người đã đăng ký - Thứ tự cột theo yêu cầu: Họ tên, Lớp, Trạng thái kế bên, Size Áo, Địa chỉ nhận áo, Ngày ĐK */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg sm:text-xl font-bold text-ueh flex items-center gap-2">
                  <UserCheck className="text-ueh" size={20} /> Danh sách đã đăng ký ({registrations.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Đã chuyển khoản: <strong className="text-emerald-600 font-bold">{confirmedCount}</strong> / {registrations.length} bạn
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">Lớp:</span>
              {(["all", "TC10", "TC11", "TC12"] as const).map((cls) => (
                <button
                  key={cls}
                  onClick={() => setFilterClass(cls)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all whitespace-nowrap ${
                    filterClass === cls
                      ? "bg-ueh text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cls === "all" ? "Tất cả" : cls}
                </button>
              ))}
            </div>
          </div>

          {/* Table: Cột họ tên KHÔNG BỊ NHẢY DÒNG (whitespace-nowrap), Trạng thái đứng kế Lớp, Size Áo & Địa chỉ ra sau */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Họ và Tên</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Lớp</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Trạng thái</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Size Áo</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Địa chỉ nhận áo</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Ngày ĐK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="h-10 w-10 text-slate-300" />
                        <p className="text-sm font-bold text-slate-700">Chưa có lượt đăng ký nào</p>
                        <p className="text-xs text-slate-400">Hãy là người đầu tiên đăng ký tham gia họp mặt 15 năm và nhận áo đồng phục kỷ niệm!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg, idx) => (
                    <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Họ và tên: whitespace-nowrap */}
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-[11px] font-bold text-ueh">
                            {idx + 1}
                          </span>
                          <span className="whitespace-nowrap">{reg.fullName}</span>
                          {reg.guestsCount > 0 && (
                            <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap">
                              (+{reg.guestsCount})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Lớp */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-ueh border border-blue-100">
                          {reg.className}
                        </span>
                      </td>

                      {/* 3. Trạng thái đứng kế Lớp theo yêu cầu */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {reg.status === "confirmed" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} /> Đã xác nhận
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                            <Clock size={11} /> Chờ đối soát
                          </span>
                        )}
                      </td>

                      {/* 4. Size Áo */}
                      <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {reg.shirtSize}
                      </td>

                      {/* 5. Địa chỉ nhận áo ra sau cùng */}
                      <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate" title={reg.address}>
                        {reg.address}
                      </td>

                      {/* 6. Ngày ĐK */}
                      <td className="py-2.5 px-3 text-right text-xs text-slate-400 whitespace-nowrap">
                        {reg.createdAt}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal đăng ký */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative my-8 w-full max-w-lg rounded-3xl bg-white p-5 sm:p-7 shadow-2xl">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-ueh">
                  {step === "form" && "Đăng Ký Tham Gia & Nhận Áo"}
                  {step === "payment" && "Quét Mã VietQR Chuyển Khoản"}
                  {step === "success" && "Đăng Ký Thành Công!"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tập thể cựu sinh viên TCDN4 - K33 UEH
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {step === "form" && (
              <form onSubmit={handleSubmitRegistration} className="mt-4 space-y-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Họ và Tên *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Nguyễn Văn Nam"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Lớp Sinh Viên *
                    </label>
                    <select
                      value={className}
                      onChange={(e) => setClassName(e.target.value as "TC10" | "TC11" | "TC12")}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    >
                      <option value="TC10">TC10 - K33 UEH</option>
                      <option value="TC11">TC11 - K33 UEH</option>
                      <option value="TC12">TC12 - K33 UEH</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Số điện thoại / Zalo *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="VD: 0903123456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-600">
                        Size Áo Kỷ Niệm *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowShirtSizePopup(true)}
                        className="text-[11px] font-bold text-blue-600 hover:text-ueh hover:underline"
                      >
                        📐 Xem bảng & mẫu áo
                      </button>
                    </div>
                    <select
                      value={shirtSize}
                      onChange={(e) => setShirtSize(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    >
                      <option value="S (Nữ)">Size S (Nữ - &lt;48kg)</option>
                      <option value="M (Nữ)">Size M (Nữ - 48-54kg)</option>
                      <option value="L (Nữ)">Size L (Nữ - 55-62kg)</option>
                      <option value="M (Nam)">Size M (Nam - 55-64kg)</option>
                      <option value="L (Nam)">Size L (Nam - 65-73kg)</option>
                      <option value="XL (Nam)">Size XL (Nam - 74-82kg)</option>
                      <option value="XXL (Nam)">Size XXL (Nam - &gt;82kg)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Địa chỉ nhận áo (Ship tận nhà) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Số 123 đường ABC, Phường X, Quận Y, TP.HCM"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Người đi cùng (F1 / Gia đình)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(parseInt(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Ghi chú thêm
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Mình mang đàn guitar..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-xl bg-ueh px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-ueh-light"
                  >
                    Tiếp tục thanh toán <ChevronRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {step === "payment" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-blue-50/70 p-3.5 border border-blue-100 text-center">
                  <div className="text-[11px] uppercase font-bold text-slate-500">Kinh phí (Áo + Suất tiệc)</div>
                  <div className="text-2xl font-black text-ueh my-0.5">{bankInfo.amountText}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl}
                      alt="VietQR TCDN4"
                      className="w-40 h-40 object-contain rounded-lg"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <QrCode size={11} /> Quét bằng App Ngân hàng
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-200/60">
                      <div className="text-slate-400 text-[10px]">Ngân hàng:</div>
                      <div className="font-bold text-slate-800">{bankInfo.bankName}</div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2 border border-slate-200/60 flex items-center justify-between">
                      <div>
                        <div className="text-slate-400 text-[10px]">Số tài khoản:</div>
                        <div className="font-bold text-slate-900">{bankInfo.accountNumber}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(bankInfo.accountNumber, "account")}
                        className="rounded-lg bg-white px-2 py-0.5 text-slate-700 border border-slate-200 text-[11px] font-semibold flex items-center gap-1"
                      >
                        {copiedAccount ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        {copiedAccount ? "Đã copy" : "Copy"}
                      </button>
                    </div>

                    <div className="rounded-xl bg-blue-50/70 p-2 border border-blue-200 flex items-center justify-between">
                      <div>
                        <div className="text-ueh text-[10px] font-bold">Nội dung:</div>
                        <div className="font-bold text-ueh text-xs">{transferSyntax}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(transferSyntax, "syntax")}
                        className="rounded-lg bg-white px-2 py-0.5 text-ueh border border-blue-200 text-[11px] font-semibold flex items-center gap-1"
                      >
                        {copiedSyntax ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        {copiedSyntax ? "Đã copy" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-between gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    ← Sửa thông tin
                  </button>
                  <button
                    type="button"
                    onClick={handleFinishPayment}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={14} /> Tôi Đã Chuyển Khoản
                  </button>
                </div>
              </div>
            )}

            {step === "success" && (
              <div className="mt-4 space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Đăng Ký Thành Công!</h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                    Ban liên lạc đã ghi nhận thông tin của <strong>{fullName}</strong> ({className}). Áo kỷ niệm sẽ được gửi ship sớm nhất!
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-left">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zalo text-white shadow-2xs">
                      <Bot size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ueh">Đã gửi thông báo tới Bot Zalo Nhóm Lớp</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Bạn có thể mở ngay nhóm Zalo để kiểm tra thông tin và trò chuyện cùng bạn bè.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleShareToZaloGroup}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zalo py-2 px-3 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                    >
                      <Send size={13} /> Mở Nhóm Zalo K33
                    </button>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-xl border border-slate-300 bg-white py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Popup xem chi tiết Mẫu áo & Bảng Size */}
      {showShirtSizePopup && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowShirtSizePopup(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowShirtSizePopup(false)}
              className="absolute right-3.5 top-3.5 rounded-lg bg-slate-100 p-1 text-slate-400 hover:bg-slate-200"
            >
              ✕
            </button>

            <h3 className="text-base font-black text-ueh mb-1 flex items-center gap-1.5">
              <Shirt size={17} className="text-ueh-orange" /> Mẫu Áo & Bảng Size Kỷ Niệm 15 Năm
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Áo Polo chất liệu Cotton cá sấu cao cấp, logo thêu sắc nét TCDN4 K33 UEH.
            </p>

            {/* Khung mô phỏng áo kỷ niệm */}
            <div className="relative mb-4 h-48 w-full overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-[#003B5C] to-[#005a8c] p-4 text-white flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold text-ueh-gold">
                  Áo Polo Kỷ Niệm 15 Năm
                </span>
                <span className="text-[10px] text-white/80 font-bold">UEH Deep Blue #003366</span>
              </div>

              <div className="text-center my-auto">
                <div className="inline-block rounded-xl bg-white/10 p-3 border border-white/20 backdrop-blur-xs">
                  <div className="text-lg font-black tracking-tight text-white">TCDN4 <span className="text-ueh-gold">K33</span></div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-200 font-semibold">15 Years Reunion • UEH</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-blue-200">
                <span>Cổ bẻ dệt bo vàng cam</span>
                <span>Chất vải thoáng mát, co giãn 4 chiều</span>
              </div>
            </div>

            {/* Bảng tra cứu size chuẩn */}
            <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-2">Size</th>
                    <th className="p-2">Dành cho</th>
                    <th className="p-2">Cân nặng</th>
                    <th className="p-2">Chiều cao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  <tr><td className="p-2 font-bold text-ueh">S (Nữ)</td><td className="p-2">Nữ</td><td className="p-2">&lt; 48 kg</td><td className="p-2">1m48 - 1m55</td></tr>
                  <tr><td className="p-2 font-bold text-ueh">M (Nữ)</td><td className="p-2">Nữ</td><td className="p-2">48 - 54 kg</td><td className="p-2">1m53 - 1m60</td></tr>
                  <tr><td className="p-2 font-bold text-ueh">L (Nữ)</td><td className="p-2">Nữ</td><td className="p-2">55 - 62 kg</td><td className="p-2">1m58 - 1m65</td></tr>
                  <tr><td className="p-2 font-bold text-ueh-orange">M (Nam)</td><td className="p-2">Nam</td><td className="p-2">55 - 64 kg</td><td className="p-2">1m60 - 1m68</td></tr>
                  <tr><td className="p-2 font-bold text-ueh-orange">L (Nam)</td><td className="p-2">Nam</td><td className="p-2">65 - 73 kg</td><td className="p-2">1m68 - 1m75</td></tr>
                  <tr><td className="p-2 font-bold text-ueh-orange">XL (Nam)</td><td className="p-2">Nam</td><td className="p-2">74 - 82 kg</td><td className="p-2">1m72 - 1m80</td></tr>
                  <tr><td className="p-2 font-bold text-ueh-orange">XXL (Nam)</td><td className="p-2">Nam</td><td className="p-2">&gt; 82 kg</td><td className="p-2">&gt; 1m78</td></tr>
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setShowShirtSizePopup(false)}
              className="mt-4 w-full rounded-xl bg-ueh py-2.5 text-xs font-bold text-white hover:bg-ueh-light transition-colors"
            >
              Đã hiểu, quay lại chọn size
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
