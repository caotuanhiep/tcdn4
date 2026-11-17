"use client";

import { Calendar, ChevronRight, Users, GraduationCap } from "lucide-react";
import BirthdayBanner from "@/components/BirthdayBanner";

export default function Hero() {
  const scrollTo = (id: string) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-slate-100/60 via-white to-slate-50 px-4 pb-14 pt-10 sm:pt-16 sm:pb-20">
      {/* Background Subtle Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(#003B5C 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto max-w-5xl text-center">
        {/* Badge */}
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-3.5 py-1 text-xs font-semibold text-ueh shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ueh-orange opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-ueh-orange" />
          </span>
          <span>Chào mừng trở lại, TC4 K33 UEH</span>
        </div>

        {/* Main Title */}
        <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-ueh sm:text-4xl md:text-5xl lg:text-6xl leading-[1.2]">
          15 Năm Hội Ngộ <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-ueh via-ueh-light to-ueh-orange bg-clip-text text-transparent">
            TCDN4 Alumni Hub
          </span>
        </h1>

        {/* Description */}
        <p className="mx-auto mb-6 max-w-2xl text-xs sm:text-base md:text-lg font-normal leading-relaxed text-slate-600">
          Hành trình 15 năm gắn kết. Nơi lưu giữ thanh xuân, kết nối hiện tại và mở ra những cơ hội hợp tác mới cho tập thể{" "}
          <strong className="font-semibold text-ueh">TC10 - TC11 - TC12</strong>.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 mb-8">
          <button
            onClick={() => scrollTo("event")}
            className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-ueh px-7 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-900/25 transition-all hover:bg-ueh-light"
          >
            <Calendar size={16} className="text-ueh-gold" />
            Đăng ký Sự kiện 15 Năm
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            onClick={() => scrollTo("directory")}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs transition-all hover:border-ueh hover:text-ueh"
          >
            <Users size={16} className="text-ueh" />
            Khám phá Danh bạ
          </button>
        </div>

        {/* Prominent Stat Badges */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4 mb-8">
          <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-3 sm:p-4 text-center shadow-xs">
            <div className="text-xl sm:text-3xl font-black text-ueh">15 Năm</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-0.5">Gắn kết & Đồng hành</div>
            <div className="absolute top-0 right-0 h-1 w-full bg-ueh" />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white p-3 sm:p-4 text-center shadow-xs">
            <div className="text-xl sm:text-3xl font-black text-ueh-orange">3 Lớp</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-0.5">TC10 • TC11 • TC12</div>
            <div className="absolute top-0 right-0 h-1 w-full bg-ueh-orange" />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-3 sm:p-4 text-center shadow-xs">
            <div className="text-xl sm:text-3xl font-black text-emerald-700">120+</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-0.5">Thành viên Alumni</div>
            <div className="absolute top-0 right-0 h-1 w-full bg-emerald-600" />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-3 sm:p-4 text-center shadow-xs">
            <div className="text-xl sm:text-3xl font-black text-ueh-light">Toàn cầu</div>
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-0.5">Việt Nam & Quốc tế</div>
            <div className="absolute top-0 right-0 h-1 w-full bg-ueh-light" />
          </div>
        </div>

        {/* Real Group Photo at UEH Campus B */}
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-lg sm:p-3">
          <div className="relative aspect-[16/9] sm:aspect-[21/10] w-full overflow-hidden rounded-2xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/ueh-group.jpg"
              alt="Tập thể TCDN4 K33 tại Cơ sở B - UEH"
              className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-left text-white sm:bottom-4 sm:left-5 sm:right-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-white backdrop-blur-md mb-1">
                  <GraduationCap size={13} className="text-ueh-gold" /> Cơ sở B - UEH (279 Nguyễn Tri Phương)
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug">
                  Hội ngộ cựu sinh viên TCDN4 K33 bên biểu tượng UEH xanh
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gọn nhẹ: Lịch sinh nhật đặt ngay dưới ảnh lớn theo yêu cầu */}
        <BirthdayBanner />

      </div>
    </section>
  );
}
