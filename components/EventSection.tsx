"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  CalendarCheck,
  Clock,
  MapPin,
  Users,
  Shirt,
  CheckCircle2,
  MessageCircle,
  ChevronRight,
  Sparkles,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useAlumniData } from "@/components/AlumniDataProvider";

const ZALO_GROUP_URL = "https://zalo.me/g/yodibu606";

export default function EventSection() {
  const { user, profile, openLogin, openProfile } = useAuth();
  const { registrations } = useAlumniData();
  const [filterClass, setFilterClass] = useState<string>("all");

  // Bộ đếm lùi (Countdown Timer) tới Thứ 7 ngày 12/12/2026 (9:00 AM)
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    setMounted(true);
    const target = new Date("2026-12-12T09:00:00").getTime();

    const calculateTime = () => {
      const now = Date.now();
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

  const filteredRegistrations =
    filterClass === "all"
      ? registrations
      : registrations.filter((r) => r.className === filterClass);

  const confirmedCount = registrations.filter((r) => r.status === "confirmed").length;
  const shirtOnlyCount = registrations.filter((r) => r.registrationType === "shirt_only").length;
  const attendingOnlyCount = registrations.length - shirtOnlyCount;
  const totalGuestsCount = registrations.reduce(
    (sum, r) => sum + (r.registrationType === "shirt_only" ? 0 : Number(r.guestsCount) || 0),
    0
  );

  // Xác định phiếu đăng ký của người dùng hiện tại từ nguồn dữ liệu gốc
  const currentUserReg = useMemo(() => {
    if (!user) return null;
    const userId = user.id.toLowerCase();
    const userPhone = (profile?.phone || "").replace(/[^0-9]/g, "");

    return (
      registrations.find((r) => {
        if (r.id && r.id.toLowerCase() === userId) return true;
        const rPhone = (r.phone || "").replace(/[^0-9]/g, "");
        if (userPhone.length >= 9 && rPhone === userPhone) return true;
        return false;
      }) || null
    );
  }, [user, profile?.phone, registrations]);

  const handleOpenRegistration = () => {
    if (!user) {
      openLogin();
    } else {
      openProfile("attendance");
    }
  };

  return (
    <section
      id="event"
      className="scroll-mt-16 bg-gradient-to-b from-white via-white to-slate-50/40 py-14 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-3 border border-blue-100">
            <Sparkles size={14} className="text-ueh-orange" /> Kỷ niệm 15 năm tốt nghiệp
          </div>
          <h2 className="text-3xl font-black text-ueh sm:text-5xl lg:text-6xl tracking-tight leading-tight">
            Chương Trình Gặp Mặt 15 Năm
          </h2>
          <div className="mx-auto mt-3 h-1.5 w-24 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-slate-600 leading-relaxed">
            Buổi gặp gỡ thân mật quay lại giảng đường Cơ sở B - UEH, nhận áo kỷ niệm và sẻ chia chặng đường 15 năm cùng bạn bè.
          </p>
        </div>

        {/* Banner Trạng thái Đăng ký & Nộp tiền cho user đã đăng nhập */}
        {user && (
          <div className="mb-8">
            {currentUserReg ? (
              currentUserReg.status === "confirmed" ? (
                <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 uppercase tracking-wide">
                          {currentUserReg.registrationType === "attending_free"
                            ? "✓ Đã xác nhận tham gia • Miễn chi phí họp lớp (Thành viên ở xa)"
                            : currentUserReg.registrationType === "shirt_only"
                            ? "✓ Đã đăng ký nhận Áo kỷ niệm 15 năm & hoàn tất thanh toán"
                            : "✓ Đã đăng ký & hoàn tất đóng phí"}
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                          {currentUserReg.registrationType === "attending_free"
                            ? `Xin chào ${currentUserReg.fullName}! Ban liên lạc trân trọng chào đón bạn từ phương xa về tham dự 15 năm (miễn chi phí họp lớp)`
                            : currentUserReg.registrationType === "shirt_only"
                            ? `Xin chào ${currentUserReg.fullName}! Ban liên lạc đã xác nhận đơn nhận Áo Polo kỷ niệm 15 năm (ship tận nơi) của bạn`
                            : `Xin chào ${currentUserReg.fullName}! Ban liên lạc đã xác nhận đóng phí tham dự 15 năm của bạn`}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                          <span>
                            Lớp: <strong className="text-ueh font-bold">{currentUserReg.className}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Size áo: <strong className="text-ueh font-bold">{currentUserReg.shirtSize}</strong>
                          </span>
                          {(currentUserReg.guestsCount || 0) > 0 && (
                            <>
                              <span>•</span>
                              <span>
                                Đi cùng: <strong className="text-emerald-700 font-bold">+{currentUserReg.guestsCount} người thân</strong>
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-slate-500 truncate max-w-xs">
                            Nơi nhận áo: {currentUserReg.address}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenRegistration}
                      className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors"
                    >
                      Cập nhật size áo / thông tin
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 sm:p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-xs">
                        <Clock size={24} />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800 uppercase tracking-wide">
                          {currentUserReg.registrationType === "shirt_only"
                            ? "Đặt Áo kỷ niệm (250.000đ) - Đang chờ đối soát chuyển khoản"
                            : "Đã đăng ký - Đang chờ đối soát chuyển khoản"}
                        </div>
                        <h4 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                          Phiếu đăng ký của {currentUserReg.fullName} ({currentUserReg.className}) đang chờ khớp lệnh
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl">
                          Hệ thống SePay / Ban liên lạc sẽ đối soát tự động khi tiền về tài khoản. Bạn có thể mở lại mã VietQR hoặc thay đổi size áo bất cứ lúc nào.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenRegistration}
                      className="self-start sm:self-auto shrink-0 flex items-center gap-2 rounded-xl bg-ueh-orange px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-orange-600 transition-all active:scale-95"
                    >
                      <CreditCard size={15} /> Quét mã QR / Sửa đăng ký
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ueh text-white shadow-xs">
                    <Shirt size={22} className="text-ueh-gold" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-ueh">
                      Chào {profile?.full_name || "bạn"}! Bạn chưa đăng ký tham gia họp mặt 15 năm và nhận áo đồng phục TC4
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đăng ký giữ chỗ sớm để Ban tổ chức chuẩn bị áo đúng size và đặt tiệc trưa chu đáo!
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleOpenRegistration}
                  className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-ueh px-5 py-2.5 text-xs font-bold text-white hover:bg-ueh-light transition-all shadow-xs"
                >
                  <Calendar size={14} /> Đăng ký tham gia ngay →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Thẻ Áo Polo Kỷ Niệm hiển thị trên Mobile */}
        <div className="block lg:hidden mb-6 rounded-3xl overflow-hidden border border-orange-200/90 bg-gradient-to-br from-orange-50/90 via-white to-amber-50/60 p-3.5 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="h-28 w-24 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-b from-slate-100 to-blue-50/60 border border-orange-100 p-1 flex items-center justify-center shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/shirt-flat.jpg"
                alt="Áo Polo Kỷ Niệm 15 Năm TCDN4"
                className="h-full w-full object-cover rounded-xl"
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
                onClick={handleOpenRegistration}
                className="mt-2 inline-flex items-center gap-1 rounded-lg bg-ueh-orange px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-orange-600"
              >
                <Shirt size={12} /> Đăng ký nhận áo kỷ niệm TC4
              </button>
            </div>
          </div>
        </div>

        {/* 2 Cards Grid: Thông tin & Lịch trình */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 mb-12">
          {/* Card Thông tin chung */}
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

              {/* Countdown Timer */}
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
                    <div className="text-xl sm:text-2xl font-black leading-none">
                      {mounted ? String(timeLeft.days).padStart(2, "0") : "--"}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-orange-100 mt-1">Ngày</div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-2 text-white shadow-2xs">
                    <div className="text-xl sm:text-2xl font-black leading-none">
                      {mounted ? String(timeLeft.hours).padStart(2, "0") : "--"}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-300 mt-1">Giờ</div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-2 text-white shadow-2xs">
                    <div className="text-xl sm:text-2xl font-black leading-none">
                      {mounted ? String(timeLeft.minutes).padStart(2, "0") : "--"}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-300 mt-1">Phút</div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-2 text-white shadow-2xs">
                    <div className="text-xl sm:text-2xl font-black leading-none text-orange-400">
                      {mounted ? String(timeLeft.seconds).padStart(2, "0") : "--"}
                    </div>
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
                    <div className="text-xs font-semibold text-ueh-orange">Bắt đầu từ: 9:00 AM (Đã chốt)</div>
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
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Địa điểm tổ chức</div>
                    <div className="text-sm font-bold text-slate-900">Sáng: UEH Cơ sở B • Trưa: Làng Nướng Nam Bộ</div>
                    <div className="text-xs text-slate-600 font-medium">279 Nguyễn Tri Phương & 302A Tô Hiến Thành, Q.10</div>
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
                onClick={handleOpenRegistration}
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

              <style
                dangerouslySetInnerHTML={{
                  __html: `
                @keyframes timelineTravel {
                  0% { top: 10px; opacity: 0; transform: translate(-50%, 0) scale(0.7); }
                  10% { opacity: 1; transform: translate(-50%, 0) scale(1); }
                  90% { opacity: 1; transform: translate(-50%, 0) scale(1); }
                  100% { top: calc(100% - 20px); opacity: 0; transform: translate(-50%, 0) scale(0.7); }
                }
                .timeline-live-dot {
                  animation: timelineTravel 4s cubic-bezier(0.4, 0, 0.2, 1) infinite !important;
                }
              `,
                }}
              />

              <div className="space-y-4 relative before:absolute before:inset-0 before:left-[19px] before:h-full before:w-[2px] before:bg-gradient-to-b before:from-ueh via-ueh-light before:to-transparent">
                <div className="absolute left-[19px] top-0 bottom-0 pointer-events-none z-0">
                  <div className="timeline-live-dot absolute h-3.5 w-3.5 rounded-full bg-gradient-to-b from-ueh-orange to-amber-400 shadow-md shadow-orange-500/80 ring-2 ring-orange-200">
                    <span className="absolute inset-0 rounded-full bg-orange-400 animate-ping opacity-75" />
                  </div>
                </div>

                <div className="relative flex items-start gap-3.5 pl-1">
                  <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ueh text-white text-xs font-bold shadow-xs ring-4 ring-white">
                    1
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ueh uppercase tracking-wide">9:00 - 11:00</span>
                      <span className="text-[11px] rounded-md bg-blue-50 px-2 py-0.5 font-medium text-ueh">
                        UEH Cơ sở B - 279 Nguyễn Tri Phương
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">Thăm trường cũ</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Tập trung tại UEH Cơ sở B (279 Nguyễn Tri Phương, Q.10), dạo thăm lại giảng đường thanh xuân, check-in chụp hình lưu niệm tập thể và nhận áo kỷ niệm TC4.
                    </p>
                  </div>
                </div>

                <div className="relative flex items-start gap-3.5 pl-1">
                  <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ueh-light text-white text-xs font-bold shadow-xs ring-4 ring-white">
                    2
                  </div>
                  <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ueh-light uppercase tracking-wide">11:30 - 14:00</span>
                      <span className="text-[11px] rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                        Làng Nướng Nam Bộ
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">Tiệc trưa hội ngộ 15 năm & giao lưu</h4>
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
                      <span className="text-xs font-bold text-ueh-orange uppercase tracking-wide">14:00 trở đi</span>
                      <span className="text-[11px] rounded-md bg-orange-50 px-2 py-0.5 font-medium text-ueh-orange">
                        Tăng 2 & Kết nối
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">Giao lưu tự do, Lưu giữ Kỷ yếu & Kết nối lâu dài</h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Tiếp tục các hoạt động giao lưu tự do, lưu trữ toàn bộ hình ảnh và video sự kiện lên website nội bộ, duy trì mạng lưới hợp tác dài hạn.
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
                    <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2">
                      Tự động
                    </span>
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

        {/* Danh sách người đã đăng ký (realtime trực tiếp từ DB gốc) */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg sm:text-xl font-bold text-ueh flex items-center gap-2">
                  <UserCheck className="text-ueh" size={20} /> Danh sách đã đăng ký ({registrations.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Đã xác nhận: <strong className="text-emerald-600 font-bold">{confirmedCount}</strong> / {registrations.length} bạn
                {shirtOnlyCount > 0 && (
                  <>
                    {" "}• Tham dự: <strong className="text-ueh font-bold">{attendingOnlyCount}</strong> • Chỉ nhận áo:{" "}
                    <strong className="text-ueh-orange font-bold">{shirtOnlyCount}</strong>
                  </>
                )}
                {totalGuestsCount > 0 && (
                  <>
                    {" "}• Người thân đi cùng: <strong className="text-ueh font-bold">+{totalGuestsCount}</strong> (Tổng {attendingOnlyCount + totalGuestsCount} khách dự tiệc)
                  </>
                )}
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
                        <p className="text-xs text-slate-400">
                          Hãy là người đầu tiên đăng ký tham gia họp mặt 15 năm và nhận áo đồng phục kỷ niệm!
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((reg, idx) => (
                    <tr key={`${reg.id || "reg"}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {reg.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={reg.avatarUrl}
                              alt={reg.fullName}
                              className="h-6 w-6 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-[11px] font-bold text-ueh">
                              {idx + 1}
                            </span>
                          )}
                          <span className="whitespace-nowrap">{reg.fullName}</span>
                          {reg.registrationType === "shirt_only" && (
                            <span className="rounded-md bg-orange-50 border border-orange-200 px-1.5 py-0.5 text-[10px] text-ueh-orange font-bold whitespace-nowrap">
                              Chỉ nhận áo
                            </span>
                          )}
                          {(reg.guestsCount || 0) > 0 && reg.registrationType !== "shirt_only" && (
                            <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] text-emerald-700 font-bold whitespace-nowrap">
                              +{reg.guestsCount} người thân
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-ueh border border-blue-100">
                          {reg.className}
                        </span>
                      </td>

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

                      <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {reg.shirtSize}
                      </td>

                      <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate" title={reg.address}>
                        {reg.address}
                      </td>

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
    </section>
  );
}
