"use client";

import { Calendar, ChevronRight, Users, GraduationCap, Sparkles } from "lucide-react";
import BirthdayBanner from "@/components/BirthdayBanner";
import EmbeddedCommunityChat from "@/components/EmbeddedCommunityChat";

export default function Hero() {
  const scrollTo = (id: string) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-slate-100/70 via-white to-slate-50 px-4 pb-14 pt-8 sm:pt-14 sm:pb-20">
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
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-4 py-1.5 text-xs sm:text-sm font-bold text-ueh shadow-2xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ueh-orange opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ueh-orange" />
          </span>
          <span>Chào mừng trở lại, TCDN4 - K33 UEH</span>
        </div>

        {/* 1. Tiêu Đề Cực To Ấn Tượng */}
        <h1 className="mb-4 text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-ueh leading-[1.08]">
          15 Năm Hội Ngộ <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-ueh via-ueh-light to-ueh-orange bg-clip-text text-transparent">
            TCDN4 Alumni Hub
          </span>
        </h1>

        {/* Description ngắn gọn */}
        <p className="mx-auto mb-6 max-w-2xl text-sm sm:text-base md:text-lg font-normal leading-relaxed text-slate-600">
          Hành trình 15 năm gắn kết. Nơi lưu giữ thanh xuân, kết nối hiện tại và mở ra những cơ hội hợp tác mới cho tập thể{" "}
          <strong className="font-semibold text-ueh">TC10 - TC11 - TC12</strong>.
        </p>

        {/* 2. Ảnh lớn Cơ sở A - UEH được đưa LÊN TRÊN các nút bấm Button */}
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-xl sm:p-3 mb-8">
          <div className="relative aspect-[16/9] sm:aspect-[21/10] w-full overflow-hidden rounded-2xl bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/ueh-group.jpg"
              alt="Cơ sở A - UEH"
              className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Nội dung ảnh chỉ để Cơ sở A - UEH, bỏ mô tả dài theo yêu cầu */}
            <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5 text-left text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ueh/90 px-3.5 py-1 text-xs sm:text-sm font-bold text-white backdrop-blur-md shadow-md border border-white/20">
                <GraduationCap size={16} className="text-ueh-gold" /> Cơ sở A - UEH
              </span>
            </div>
          </div>
        </div>

        {/* Nút bấm Button Đăng ký và Khám phá danh bạ (Nằm ngay bên dưới hình ảnh) */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 mb-8">
          <button
            onClick={() => scrollTo("event")}
            className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-ueh px-8 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-blue-900/25 transition-all hover:bg-ueh-light hover:-translate-y-0.5"
          >
            <Calendar size={18} className="text-ueh-gold" />
            Đăng ký Sự kiện 15 Năm
            <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => scrollTo("directory")}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border-2 border-slate-300 bg-white px-8 py-3.5 text-sm sm:text-base font-bold text-slate-700 shadow-xs transition-all hover:border-ueh hover:text-ueh hover:-translate-y-0.5"
          >
            <Users size={18} className="text-ueh" />
            Khám phá Danh bạ
          </button>
        </div>

        {/* 3. Thẻ thống kê VUI trích từ phiếu đăng ký (Số người đăng ký, xuất ngoại, F1, háo hức) */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4 mb-4">
          <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-3.5 sm:p-4 text-center shadow-xs transition-transform hover:-translate-y-0.5">
            <div className="text-2xl sm:text-4xl font-black text-ueh">35+</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 mt-1">Đăng ký Hội ngộ 15 Năm</div>
            <div className="text-[10px] text-slate-400">Các bạn TC10 • TC11 • TC12</div>
            <div className="absolute top-0 right-0 h-1 w-full bg-ueh" />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white p-3.5 sm:p-4 text-center shadow-xs transition-transform hover:-translate-y-0.5">
            <div className="text-2xl sm:text-4xl font-black text-ueh-orange">16 Bạn</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 mt-1">Xuất ngoại & Định cư</div>
            <div className="text-[10px] text-slate-400">Úc, Mỹ, Singapore, Canada...</div>
            <div className="absolute top-0 right-0 h-1 w-full bg-ueh-orange" />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-3.5 sm:p-4 text-center shadow-xs transition-transform hover:-translate-y-0.5">
            <div className="text-2xl sm:text-4xl font-black text-emerald-700">168+</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 mt-1">F1 & Nhóc tì (Con cái)</div>
            <div className="text-[10px] text-slate-400">Gia tài lớn nhất sau 15 năm</div>
            <div className="absolute top-0 right-0 h-1 w-full bg-emerald-600" />
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-3.5 sm:p-4 text-center shadow-xs transition-transform hover:-translate-y-0.5">
            <div className="text-2xl sm:text-4xl font-black text-ueh-light">100%</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 mt-1">Háo hức gặp lại nhau</div>
            <div className="text-[10px] text-slate-400">Thanh xuân không bao giờ tắt</div>
            <div className="absolute top-0 right-0 h-1 w-full bg-ueh-light" />
          </div>
        </div>

        {/* 4. Hiển thị Box Chat ngay bên dưới mấy cái thẻ thống kê */}
        <EmbeddedCommunityChat />

        {/* Lịch sinh nhật sắp tới */}
        <BirthdayBanner />

      </div>
    </section>
  );
}
