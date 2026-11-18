"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronRight, Users, GraduationCap, Sparkles, Shirt } from "lucide-react";
import EmbeddedCommunityChat from "@/components/EmbeddedCommunityChat";
import { useAuth } from "@/components/AuthProvider";

const BANNER_SLIDES = [
  { id: 1, src: "/images/banner-3.png", alt: "TCDN4 K33 - Hội Ngộ 15 Năm (3)", caption: "Hội ngộ 15 Năm TCDN4" },
  { id: 2, src: "/images/banner-1.png", alt: "TCDN4 K33 - Hội Ngộ 15 Năm", caption: "Giảng đường UEH thân yêu" },
  { id: 3, src: "/images/banner-2.png", alt: "TCDN4 K33 - Hội Ngộ 15 Năm (2)", caption: "Thanh xuân gắn kết TC10 • TC11 • TC12" },
];

export default function Hero() {
  const { user, openLogin, openProfile } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Tự động xoay vòng ảnh slider 3s
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const scrollTo = (id: string) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleRegisterClick = () => {
    if (!user) {
      openLogin();
    } else {
      openProfile();
    }
  };

  return (
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-slate-100/70 via-white to-slate-50 px-4 pb-14 pt-8 sm:pt-12 sm:pb-20">
      {/* Background Subtle Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(#003B5C 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto max-w-5xl text-center">
        
        {/* Logo TCDN4 đặt tinh tế phía trên dòng Chào mừng trở lại theo yêu cầu */}
        <div className="mb-3.5 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-tcdn4.png"
            alt="Logo TCDN4 K33 UEH"
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-sm transition-transform hover:scale-105"
          />
        </div>

        {/* Badge Chào mừng */}
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

        {/* 2. KHU VỰC ẢNH BANNER & ĐỒNG PHỤC (2 CỘT TRÊN DESKTOP, CỘT TRÁI SLIDER 3 ẢNH 3S, CỘT PHẢI ÁO ĐỒNG PHỤC) */}
        <div className="relative mx-auto max-w-5xl mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
            
            {/* Cột trái (8 Cols trên Desktop): Slider 3 ảnh lớn tự động 3s */}
            <div 
              className="lg:col-span-8 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-2 shadow-xl sm:p-2.5 flex flex-col justify-center"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="relative aspect-[16/9] sm:aspect-[21/11] w-full overflow-hidden rounded-2xl bg-slate-100">
                {BANNER_SLIDES.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                      idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-20 pointer-events-none" />

                {/* Caption & Indicator Dots */}
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-30 flex items-center justify-between text-white">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-ueh/90 px-3 py-1 text-xs sm:text-sm font-bold text-white backdrop-blur-md shadow-md border border-white/20">
                    <GraduationCap size={15} className="text-ueh-gold" /> {BANNER_SLIDES[currentSlide].caption}
                  </span>
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                    {BANNER_SLIDES.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentSlide ? "w-6 bg-ueh-orange" : "w-2 bg-white/60 hover:bg-white"
                        }`}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải (4 Cols trên Desktop): Thẻ Áo Polo Kỷ Niệm TC4 Uniform (3) - Ẩn trên Mobile */}
            <div className="hidden lg:flex lg:col-span-4 flex-col justify-between rounded-3xl border border-orange-200/90 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50 p-3.5 shadow-xl">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-white border border-orange-100 p-1 shadow-inner flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/uniform-3.png"
                  alt="Áo Polo Kỷ Niệm 15 Năm TCDN4"
                  className="h-full w-full object-contain object-center transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-ueh px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                    <Sparkles size={11} className="text-ueh-gold" /> Đồng Phục 15 Năm
                  </span>
                </div>
              </div>

              <div className="mt-3 text-left">
                <h4 className="text-sm font-black text-ueh">Áo Polo Kỷ Niệm TCDN4</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Chất liệu Cotton cá sấu 4 chiều cao cấp, thêu logo kỷ niệm 15 năm K33 UEH sang trọng.
                </p>
              </div>

              <button
                onClick={handleRegisterClick}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-ueh py-2.5 px-3 text-xs font-bold text-white hover:bg-ueh-light transition-all shadow-xs"
              >
                <Shirt size={14} className="text-ueh-gold" />
                <span>Đăng ký nhận áo & size</span>
              </button>
            </div>

          </div>
        </div>

        {/* Nút bấm Button Đăng ký và Khám phá danh bạ (Nằm ngay bên dưới hình ảnh) */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 mb-8">
          <button
            onClick={handleRegisterClick}
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

        {/* 3. Thẻ thống kê VUI trích từ phiếu đăng ký */}
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

        {/* 4. Box Chat & Sinh nhật chạy ngang */}
        <EmbeddedCommunityChat />

      </div>
    </section>
  );
}
