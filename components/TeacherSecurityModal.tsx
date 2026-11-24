"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { GraduationCap, ShieldCheck, Check, Sparkles, AlertCircle, HeartHandshake } from "lucide-react";

interface TeacherOption {
  id: string;
  name: string;
  title: string;
  image: string;
  isCorrect: boolean;
  description: string;
}

const TEACHERS: TeacherOption[] = [
  {
    id: "thay-bao",
    name: "Thầy Bảo",
    title: "Giảng viên TCDN - UEH",
    image: "/images/teachers/thay-bao.png",
    isCorrect: true,
    description: "Người thầy kính yêu gắn liền với giảng đường K33",
  },
  {
    id: "thay-nam",
    name: "Thầy Nam",
    title: "Nhân vật bí ẩn 😎",
    image: "/images/teachers/thay-nam.png",
    isCorrect: false,
    description: "Khoan đã... ai đây ta? Nhìn quen quen mà không phải thầy!",
  },
  {
    id: "thay-chi",
    name: "Thầy Chí",
    title: "Giảng viên TCDN - UEH",
    image: "/images/teachers/thay-chi.png",
    isCorrect: true,
    description: "Người thầy tâm huyết dìu dắt bao thế hệ sinh viên",
  },
];

const STORAGE_KEY = "tcdn4_teacher_verified";

export default function TeacherSecurityModal() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
    if (pathname === "/privacy" || pathname === "/terms") {
      setIsOpen(false);
      return;
    }
    try {
      const isVerified = localStorage.getItem(STORAGE_KEY);
      if (!isVerified) {
        setIsOpen(true);
      }
    } catch {}
  }, [pathname]);

  if (!mounted || !isOpen || pathname === "/privacy" || pathname === "/terms") return null;

  const toggleSelect = (id: string) => {
    setStatus("idle");
    setErrorMessage("");

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= 2) {
        // Nếu đã chọn 2 rồi mà chọn thêm thì thay thế cái đầu
        setSelectedIds([selectedIds[1], id]);
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const handleVerify = () => {
    if (selectedIds.length !== 2) {
      setStatus("error");
      setErrorMessage("Vui lòng tích chọn đúng 2 người thầy của khóa mình nhé!");
      return;
    }

    const hasBao = selectedIds.includes("thay-bao");
    const hasChi = selectedIds.includes("thay-chi");
    const hasNam = selectedIds.includes("thay-nam");

    if (hasBao && hasChi && !hasNam) {
      setStatus("success");
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {}

      setTimeout(() => {
        setIsOpen(false);
      }, 1000);
    } else {
      setStatus("error");
      if (hasNam) {
        setErrorMessage("Ơ kìa! Bạn chọn trúng nhân vật 'pha-kè' trà trộn rồi kìa 😂 Thầy Nam nào ở đây! Chọn lại cho đúng 2 thầy nha!");
      } else {
        setErrorMessage("Chưa chính xác rồi bạn ơi! Nhìn kỹ lại 2 người thầy kính yêu của khóa mình nhé!");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-3xl border border-blue-200/50 bg-white p-5 sm:p-7 shadow-2xl overflow-hidden"
      >
        {/* Background Decorative Gradient */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-100/80 blur-2xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-orange-100/70 blur-2xl" />

        {/* Header */}
        <div className="relative text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-ueh to-ueh-light text-white shadow-md shadow-blue-900/20">
            <GraduationCap className="h-8 w-8 text-ueh-gold" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-ueh uppercase tracking-wide border border-blue-100 mb-1.5">
            <ShieldCheck size={13} className="text-emerald-600" /> Xác thực cựu sinh viên TCDN4 - K33
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Vui lòng xác nhận đúng thầy giáo của bạn
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Chọn đúng <strong className="text-ueh font-bold">2 người thầy</strong> kính yêu của khóa mình để tiếp tục vào website nhé. (Có 1 người trà trộn đấy 😉)
          </p>
        </div>

        {/* 3 Teacher Cards */}
        <div className="relative grid grid-cols-3 gap-2.5 sm:gap-3.5 mb-5">
          {TEACHERS.map((teacher) => {
            const isSelected = selectedIds.includes(teacher.id);

            return (
              <button
                key={teacher.id}
                type="button"
                onClick={() => toggleSelect(teacher.id)}
                className={`group relative flex flex-col items-center rounded-2xl p-2 sm:p-2.5 text-center transition-all ${
                  isSelected
                    ? "bg-emerald-50/60 border-2 border-emerald-500 shadow-md scale-[1.03] ring-2 ring-emerald-500/20"
                    : "bg-slate-50 border-2 border-slate-200/80 hover:border-emerald-300 hover:bg-white"
                }`}
              >
                {/* Checkmark Badge: Luôn nổi lên trên ảnh (z-20) và hiển thị màu xanh lá theo yêu cầu */}
                <div
                  className={`absolute right-2 top-2 z-20 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-all shadow-md ${
                    isSelected
                      ? "bg-emerald-500 text-white scale-110 ring-2 ring-white"
                      : "border-2 border-slate-300 bg-white/95 text-transparent opacity-60 group-hover:opacity-100"
                  }`}
                >
                  <Check size={14} strokeWidth={3} className={isSelected ? "text-white" : "text-transparent"} />
                </div>

                {/* Avatar Image */}
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-200 mb-2 shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={teacher.image}
                    alt={teacher.name}
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Teacher Info: Chỉ hiển thị tên theo yêu cầu */}
                <span className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-ueh transition-colors mt-0.5">
                  {teacher.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Trạng thái thông báo */}
        {status === "error" && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200/80 p-3 text-xs text-rose-700 animate-in shake duration-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <div className="font-semibold leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {status === "success" && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs sm:text-sm font-bold text-emerald-700 animate-in zoom-in-95">
            <Sparkles size={16} className="text-emerald-600" />
            <span>🎉 Chuẩn cựu sinh viên TCDN4 rồi! Đang đưa bạn vào website...</span>
          </div>
        )}

        {/* Counter & Action Button */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>Tiến độ:</span>
            <span>
              Đã chọn <strong className="text-ueh font-bold">{selectedIds.length}</strong> / 2 thầy
            </span>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-ueh to-ueh-light py-3 px-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-900/25 hover:from-ueh-light hover:to-ueh hover:shadow-xl transition-all active:scale-98"
          >
            <HeartHandshake size={16} className="text-ueh-gold" />
            <span>Xác nhận & Vào Website</span>
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-400">
          Chỉ cần xác nhận 1 lần duy nhất trên trình duyệt của bạn.
        </p>
      </div>
    </div>
  );
}
