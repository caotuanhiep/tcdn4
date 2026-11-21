"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronRight, Users, GraduationCap, Sparkles, Shirt, Heart, Smile } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase } from "@/lib/supabase/client";

const BANNER_SLIDES = [
  { id: 1, src: "/images/banner-3.png", alt: "TCDN4 K33 - Hội Ngộ 15 Năm (3)", caption: "Hội ngộ 15 Năm TCDN4" },
  { id: 2, src: "/images/banner-1.png", alt: "TCDN4 K33 - Hội Ngộ 15 Năm", caption: "Giảng đường UEH thân yêu" },
  { id: 3, src: "/images/banner-2.png", alt: "TCDN4 K33 - Hội Ngộ 15 Năm (2)", caption: "Thanh xuân gắn kết TC10 • TC11 • TC12" },
];

const SHIRT_SLIDES = [
  { id: 1, src: "/images/shirt-flat.jpg", alt: "Mẫu Áo Polo Kỷ Niệm 15 Năm TCDN4 (Áo phẳng)" },
  { id: 2, src: "/images/shirt-model.jpg", alt: "Mẫu Áo Polo Kỷ Niệm 15 Năm TCDN4 (Mẫu mặc)" },
];

export default function Hero() {
  const { user, openLogin, openProfile } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentShirtSlide, setCurrentShirtSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Tự động xoay vòng ảnh slider bên trái 3s
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Tự động xoay vòng 2 ảnh áo kỷ niệm bên phải chậm hơn slide trái (5.5s)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentShirtSlide((prev) => (prev + 1) % SHIRT_SLIDES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const [stats, setStats] = useState({
    checkedInCount: 0,
    attendingCount: 0,
    singleCount: 0,
  });

  useEffect(() => {
    let active = true;

    async function loadStats() {
      try {
        // 1. Tải profiles thực tế trực tiếp từ Supabase
        const { data: dbProfiles } = await getSupabase()
          .from("profiles")
          .select("id, full_name, attendance_status, marital_status, phone");

        // 2. Tải danh sách đăng ký sự kiện từ API hoặc localStorage
        let regs: any[] = [];
        try {
          const res = await fetch("/api/registrations", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.items)) {
              regs = data.items;
            }
          }
        } catch {}

        if (regs.length === 0) {
          try {
            const stored = localStorage.getItem("tcdn4_registrations");
            if (stored) regs = JSON.parse(stored);
          } catch {}
        }

        const profiles = dbProfiles || [];
        
        // Tập hợp danh sách thành viên duy nhất (loại bỏ trùng lặp triệt để qua ID, SĐT hoặc Tên)
        interface MemberEntry {
          id?: string;
          name: string;
          phone: string;
          attending: boolean;
          single: boolean;
        }

        const uniqueMembers: MemberEntry[] = [];

        const addOrMerge = (item: {
          id?: string;
          name?: string;
          phone?: string;
          attending: boolean;
          single: boolean;
        }) => {
          const cleanId = (item.id || "").toLowerCase().trim();
          const cleanName = (item.name || "").toLowerCase().trim();
          const cleanPhone = (item.phone || "").replace(/[^0-9]/g, "");

          if (!cleanId && !cleanName && !cleanPhone) return;

          const existing = uniqueMembers.find((m) => {
            if (cleanId && m.id && m.id === cleanId) return true;
            if (cleanPhone && m.phone && m.phone === cleanPhone) return true;
            if (cleanName && m.name && m.name === cleanName) return true;
            return false;
          });

          if (existing) {
            if (item.attending) existing.attending = true;
            if (item.single) existing.single = true;
            if (!existing.id && cleanId) existing.id = cleanId;
            if (!existing.phone && cleanPhone) existing.phone = cleanPhone;
            if (!existing.name && cleanName) existing.name = cleanName;
          } else {
            uniqueMembers.push({
              id: cleanId,
              name: cleanName,
              phone: cleanPhone,
              attending: item.attending,
              single: item.single,
            });
          }
        };

        profiles.forEach((p: any) => {
          addOrMerge({
            id: p.id,
            name: p.full_name,
            phone: p.phone,
            attending: p.attendance_status === "attending",
            single: p.marital_status === "single",
          });
        });

        regs.forEach((r: any) => {
          addOrMerge({
            id: r.id,
            name: r.fullName,
            phone: r.phone,
            attending: true,
            single: false,
          });
        });

        const checkedInCount = uniqueMembers.length;
        const attendingCount = uniqueMembers.filter((m) => m.attending).length;
        const singleCount = uniqueMembers.filter((m) => m.single).length;

        if (active) {
          setStats({
            checkedInCount,
            attendingCount,
            singleCount,
          });
        }
      } catch (err) {
        console.error("Lỗi tải thống kê Hero:", err);
      }
    }

    loadStats();
    window.addEventListener("storage", loadStats);
    window.addEventListener("tcdn4_registration_updated", loadStats);
    window.addEventListener("tcdn4_profile_updated", loadStats);
    return () => {
      active = false;
      window.removeEventListener("storage", loadStats);
      window.removeEventListener("tcdn4_registration_updated", loadStats);
      window.removeEventListener("tcdn4_profile_updated", loadStats);
    };
  }, []);

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
    <section id="home" className="relative overflow-hidden bg-gradient-to-b from-[#EBF5FB] via-[#F4F9FD] to-white px-4 pb-14 pt-8 sm:pt-12 sm:pb-20">
      {/* Background Subtle Dot Pattern fading gently to bottom */}
      <div
        className="pointer-events-none absolute inset-0 opacity-15 [mask-image:linear-gradient(to_bottom,black_20%,transparent_85%)]"
        style={{
          backgroundImage: "radial-gradient(#003B5C 1.2px, transparent 1.2px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-5xl text-center">
        
        {/* Logo TCDN4 đặt tinh tế phía trên dòng Chào mừng trở lại theo yêu cầu (Nền trong suốt, size to gấp đôi) */}
        <div className="mb-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-tcdn4-transparent.png"
            alt="Logo TCDN4 K33 UEH"
            className="h-24 sm:h-28 md:h-32 w-auto object-contain drop-shadow-md transition-transform hover:scale-105"
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

        {/* 1. Tiêu Đề Cực To Ấn Tượng - Ngắt dòng chuẩn trên mobile: Dòng 1 '15 Năm Hội Ngộ', Dòng 2 'TCDN4 Alumni Hub' trọn vẹn 1 dòng */}
        <h1 className="mb-4 text-[28px] sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-ueh leading-[1.18] sm:leading-[1.1]">
          <span className="block">15 Năm Hội Ngộ</span>
          <span className="inline-block whitespace-nowrap bg-gradient-to-r from-ueh via-ueh-light to-ueh-orange bg-clip-text text-transparent">
            TCDN4 Alumni Hub
          </span>
        </h1>

        {/* Description ngắn gọn */}
        <p className="mx-auto mb-6 max-w-2xl text-sm sm:text-base md:text-lg font-normal leading-relaxed text-slate-600">
          Hành trình 15 năm gắn kết. Nơi lưu giữ thanh xuân, kết nối hiện tại và mở ra những cơ hội hợp tác mới cho tập thể{" "}
          <strong className="font-semibold text-ueh">TC10 - TC11 - TC12</strong>.
        </p>

        {/* 2. KHU VỰC ẢNH BANNER & ĐỒNG PHỤC (2 CỘT TRÊN DESKTOP, CỘT TRÁI SLIDER 3 ẢNH 3S, CỘT PHẢI BẠN MẪU MẶC ÁO FULL CHIỀU CAO) */}
        <div className="relative mx-auto max-w-5xl mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
            
            {/* Cột trái (8 Cols trên Desktop): Slider 3 ảnh lớn tự động 3s - Bỏ ghi chú chữ, giữ ảnh to sáng rõ */}
            <div 
              className="lg:col-span-8 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-2 shadow-xl sm:p-2.5 flex flex-col justify-center"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <div className="relative aspect-[16/9] sm:aspect-[21/11] lg:aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-100">
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

                {/* Indicator Dots ở góc dưới */}
                <div className="absolute bottom-3 left-0 right-0 z-30 flex items-center justify-center pointer-events-auto">
                  <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
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

            {/* Cột phải (4 Cols trên Desktop): Slider 2 ảnh áo kỷ niệm tự đổi chậm hơn cột trái - Bo viền đồng điệu */}
            <div className="hidden lg:flex lg:col-span-4 flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-2 sm:p-2.5 shadow-xl">
              <div className="relative flex-1 w-full overflow-hidden rounded-2xl bg-slate-900/5 min-h-[300px]">
                {SHIRT_SLIDES.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                      idx === currentShirtSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.src}
                      alt={slide.alt}
                      className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                ))}

                {/* Badge chuyển ảnh nhỏ gọn & Indicator */}
                <div className="absolute bottom-2.5 left-0 right-0 z-20 flex items-center justify-center">
                  <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                    {SHIRT_SLIDES.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentShirtSlide(idx)}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentShirtSlide ? "w-5 bg-ueh-orange" : "w-1.5 bg-white/60 hover:bg-white"
                        }`}
                        aria-label={`Mẫu áo ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="absolute top-2.5 left-2.5 z-20">
                  <span className="inline-flex items-center gap-1 rounded-full bg-ueh/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                    <Sparkles size={11} className="text-ueh-gold" /> Áo Polo K33
                  </span>
                </div>
              </div>

              <div className="pt-2 px-1">
                <button
                  onClick={handleRegisterClick}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-ueh py-3 px-3 text-xs sm:text-sm font-bold text-white hover:bg-ueh-light transition-all shadow-md hover:shadow-lg"
                >
                  <Shirt size={16} className="text-ueh-gold" />
                  <span>Đăng ký nhận áo kỷ niệm TC4</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Nút bấm Button Đăng ký và Khám phá danh bạ (To lớn, nổi bật trên Desktop) */}
        <div className="flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-5 mb-10">
          <button
            onClick={handleRegisterClick}
            className="group flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full bg-ueh px-8 py-3.5 sm:px-10 sm:py-4.5 text-base sm:text-lg font-black text-white shadow-xl shadow-blue-900/30 transition-all hover:bg-ueh-light hover:-translate-y-1 hover:shadow-2xl active:translate-y-0"
          >
            <Calendar size={20} className="text-ueh-gold" />
            <span>Đăng ký Gặp mặt 15 năm</span>
            <ChevronRight size={20} className="transition-transform group-hover:translate-x-1.5" />
          </button>

          <button
            onClick={() => scrollTo("directory")}
            className="flex w-full sm:w-auto items-center justify-center gap-2.5 rounded-full border-2 border-slate-300 bg-white px-8 py-3.5 sm:px-10 sm:py-4.5 text-base sm:text-lg font-bold text-slate-700 shadow-sm transition-all hover:border-ueh hover:text-ueh hover:-translate-y-1 hover:shadow-md active:translate-y-0"
          >
            <Users size={20} className="text-ueh" />
            <span>Khám phá Danh bạ</span>
          </button>
        </div>

        {/* 3. Thẻ thống kê trực tiếp từ danh sách điểm danh & đăng ký */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4 mb-4">
          {/* Thẻ 1: Số thành viên đã điểm danh */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-3.5 sm:p-4 text-center shadow-xs transition-transform hover:-translate-y-0.5">
            <div className="text-2xl sm:text-4xl font-black text-ueh">
              {stats.checkedInCount > 0 ? `${stats.checkedInCount} Bạn` : "0 Bạn"}
            </div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 mt-1">Số thành viên đã điểm danh</div>
            <div className="text-[10px] text-slate-400">
              Hồ sơ TC10 • TC11 • TC12
            </div>
            <div className="absolute top-0 right-0 h-1 w-full bg-ueh" />
          </div>

          {/* Thẻ 2: Số người đã đăng ký đi gặp mặt 15 năm */}
          <div className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white p-3.5 sm:p-4 text-center shadow-xs transition-transform hover:-translate-y-0.5">
            <div className="text-2xl sm:text-4xl font-black text-ueh-orange">
              {stats.attendingCount > 0 ? `${stats.attendingCount} Bạn` : "0 Bạn"}
            </div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 mt-1">Đăng ký đi gặp mặt 15 năm</div>
            <div className="text-[10px] text-slate-400">Sẵn sàng hội ngộ trực tiếp</div>
            <div className="absolute top-0 right-0 h-1 w-full bg-ueh-orange" />
          </div>

          {/* Thẻ 3: Số người còn độc thân */}
          <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-white p-3.5 sm:p-4 text-center shadow-xs transition-transform hover:-translate-y-0.5">
            <div className="text-2xl sm:text-4xl font-black text-rose-600">
              {stats.singleCount > 0 ? `${stats.singleCount} Bạn` : "0 Bạn"}
            </div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 mt-1">Số người còn độc thân</div>
            <div className="text-[10px] text-slate-400">Hội độc thân vui tính tìm bạn</div>
            <div className="absolute top-0 right-0 h-1 w-full bg-rose-500" />
          </div>

          {/* Thẻ 4: Ghi sẵn 100% người háo hức gặp mặt */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-3.5 sm:p-4 text-center shadow-xs transition-transform hover:-translate-y-0.5">
            <div className="text-2xl sm:text-4xl font-black text-emerald-600">100%</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 mt-1">Người háo hức gặp mặt</div>
            <div className="text-[10px] text-slate-400">
              Tinh thần TCDN4 luôn rực cháy
            </div>
            <div className="absolute top-0 right-0 h-1 w-full bg-emerald-500" />
          </div>
        </div>

      </div>
    </section>
  );
}
