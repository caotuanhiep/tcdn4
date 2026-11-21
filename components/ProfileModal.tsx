"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Camera,
  Calendar, 
  Briefcase, 
  Building, 
  MapPin, 
  Phone, 
  X, 
  Check, 
  Sparkles,
  Cake,
  Heart,
  Baby,
  Globe,
  Shirt,
  MessageSquare,
  QrCode,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Upload,
  Loader2
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { getSupabase } from "@/lib/supabase/client";

const DEFAULT_AVATARS = [
  { id: "boy", src: "/images/avatar-boy.png", label: "Mặc định 1" },
  { id: "girl", src: "/images/avatar-girl.png", label: "Mặc định 2" },
];

const OTHER_PROVINCES_PRESETS = [
  "Đà Nẵng",
  "Nha Trang (Khánh Hòa)",
  "Thừa Thiên Huế",
  "Cần Thơ",
  "Hải Phòng",
  "Bình Dương",
  "Đồng Nai",
  "Bà Rịa - Vũng Tàu",
  "Lâm Đồng (Đà Lạt)",
  "Quảng Nam",
  "Bình Định (Quy Nhơn)",
];

const OVERSEAS_PRESETS = [
  "Úc (Australia)",
  "Mỹ (USA)",
  "Singapore",
  "Canada",
  "Nhật Bản",
  "Châu Âu",
];

import { DEFAULT_BANK_INFO, getBankInfo, fetchBankInfo, BankConfig } from "@/lib/bank";

const SHIRT_SIZES = [
  "S (Nam)", "M (Nam)", "L (Nam)", "XL (Nam)", "2XL (Nam)", "3XL (Nam)",
  "S (Nữ)", "M (Nữ)", "L (Nữ)", "XL (Nữ)"
];

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, profile, updateProfile } = useAuth();
  const toast = useToast();
  const [bankInfo, setBankInfo] = useState<BankConfig>(DEFAULT_BANK_INFO);

  const [activeTab, setActiveTab] = useState<"info" | "attendance">("info");

  // Thông tin cá nhân
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [className, setClassName] = useState(profile?.class_name || "TC10");
  const [jobTitle, setJobTitle] = useState(profile?.job_title || "");
  const [company, setCompany] = useState(profile?.company || "");
  const [location, setLocation] = useState(profile?.location_region === "dn" ? "other" : (profile?.location_region || "hcm"));
  const [specificLocation, setSpecificLocation] = useState(profile?.specific_location || "");
  const [birthday, setBirthday] = useState(profile?.birthday || "1989-11-20");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [bio, setBio] = useState(profile?.bio || "");

  // Hôn nhân & F1
  const [maritalStatus, setMaritalStatus] = useState<string>(profile?.marital_status || "married");
  const [childrenCount, setChildrenCount] = useState<number>(profile?.children_count ?? 1);

  // Điểm danh Hội ngộ 15 Năm
  const [attendanceStatus, setAttendanceStatus] = useState<"attending" | "not_attending">(
    (profile?.attendance_status as any) === "not_attending" ? "not_attending" : "attending"
  );
  const [shirtSize, setShirtSize] = useState(profile?.shirt_size || "L (Nam)");
  const [deliveryAddress, setDeliveryAddress] = useState(profile?.delivery_address || "");
  const [guestsCount, setGuestsCount] = useState(0);
  const [showShirtSizePopup, setShowShirtSizePopup] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    setBankInfo(getBankInfo());
    let cancelled = false;
    fetchBankInfo().then((cfg) => {
      if (!cancelled) setBankInfo(cfg);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Lời nhắn lưu bút & Ảnh kỷ niệm (nếu không đi trực tiếp)
  const [guestbookMessage, setGuestbookMessage] = useState("");
  const [memoryPhotoUrl, setMemoryPhotoUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Xử lý upload avatar từ máy / điện thoại trực tiếp lên Supabase Storage
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Vui lòng chọn ảnh dung lượng dưới 5MB!");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `avatar_${user?.id || "guest"}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await getSupabase()
        .storage
        .from("alumni-media")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        // Fallback đọc dạng data URL nếu bucket chưa cấp quyền upload client
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAvatarUrl(ev.target?.result as string);
          toast.success("Đã chọn ảnh đại diện mới!");
        };
        reader.readAsDataURL(file);
      } else {
        const { data: publicData } = getSupabase()
          .storage
          .from("alumni-media")
          .getPublicUrl(filePath);

        setAvatarUrl(publicData.publicUrl);
        toast.success("Tải ảnh đại diện lên thành công!");
      }
    } catch (err: any) {
      toast.error(`Lỗi tải ảnh: ${err.message || "Vui lòng thử lại"}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const cleanName = fullName ? fullName.trim().toUpperCase() : "TÊN";
  const cleanPhone = phone ? phone.trim() : "SĐT";
  const transferSyntax = `TCDN4 - ${cleanName} - ${cleanPhone}`;
  // Không cố định nội dung chuyển khoản trong mã QR
  const qrUrl = `https://img.vietqr.io/image/${bankInfo.bankCode}-${bankInfo.accountNumber}-compact2.png?amount=${bankInfo.amount}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ và tên của bạn!");
      return;
    }

    setSaving(true);

    try {
      // 1. Cập nhật hồ sơ cá nhân vào Supabase Profiles
      await updateProfile({
        full_name: fullName.trim(),
        class_name: className,
        job_title: jobTitle.trim(),
        company: company.trim(),
        location_region: location,
        specific_location: location === "overseas" ? (specificLocation.trim() || "Quốc tế") : specificLocation.trim(),
        birthday: birthday,
        phone: phone.trim(),
        avatar_url: avatarUrl,
        bio: bio.trim(),
        marital_status: maritalStatus,
        children_count: Number(childrenCount),
        attendance_status: attendanceStatus,
        shirt_size: shirtSize,
        delivery_address: deliveryAddress.trim(),
      });

      // Bắn thông báo Điểm danh thành viên mới vào Zalo Bot
      try {
        fetch("/api/zalo-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "checkin",
            fullName: fullName.trim(),
            className,
            jobTitle: jobTitle.trim(),
            company: company.trim(),
            location: specificLocation.trim() || (location === "hcm" ? "TP.HCM" : location === "hn" ? "Hà Nội" : "Tỉnh khác"),
          }),
        });
      } catch {}

      // 2. Nếu đăng ký tham gia -> cập nhật vào danh sách sự kiện EventSection
      if (attendanceStatus === "attending") {
        const regEntry = {
          id: user?.id || `reg-${Date.now()}`,
          fullName: fullName.trim(),
          className,
          phone: phone.trim(),
          shirtSize,
          address: deliveryAddress.trim() || (location === "hcm" ? "TP.HCM" : location),
          guestsCount,
          status: "pending",
          paidAmount: bankInfo.amount,
          createdAt: new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        };

        try {
          const stored = localStorage.getItem("tcdn4_registrations");
          const list = stored ? JSON.parse(stored) : [];
          const existingIdx = list.findIndex((x: any) => x.phone === phone.trim() || x.fullName === fullName.trim() || (user?.id && x.id === user.id));
          if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...regEntry };
          } else {
            list.unshift(regEntry);
          }
          localStorage.setItem("tcdn4_registrations", JSON.stringify(list));
        } catch {}

        // Gửi lên API server để lưu vào hệ thống đăng ký
        try {
          await fetch("/api/registrations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(regEntry),
          });
        } catch {}

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("tcdn4_registration_updated"));
        }

        // Gửi thông báo đến Bot Zalo
        try {
          fetch("/api/zalo-bot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "registration",
              fullName: fullName.trim(),
              className,
              shirtSize,
              phone: phone.trim(),
              address: deliveryAddress.trim() || "Tại sự kiện",
              paidAmount: bankInfo.amount,
              guestsCount,
            }),
          });
        } catch {}
      }

      // 3. Nếu không tham gia trực tiếp và có gửi lời nhắn Lưu bút -> lưu vào Sổ lưu bút
      if (attendanceStatus === "not_attending" && guestbookMessage.trim()) {
        try {
          const storedGb = localStorage.getItem("tcdn4_guestbook");
          const gbList = storedGb ? JSON.parse(storedGb) : [];
          gbList.unshift({
            id: `gb-${Date.now()}`,
            name: fullName.trim(),
            className,
            time: "Vừa xong",
            message: guestbookMessage.trim(),
            likes: 1,
          });
          localStorage.setItem("tcdn4_guestbook", JSON.stringify(gbList));
        } catch {}
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("tcdn4_profile_updated"));
        window.dispatchEvent(new Event("tcdn4_registration_updated"));
      }

      toast.success("Cập nhật thông tin & điểm danh thành công!");
      onClose();
    } catch (err: any) {
      toast.error(`Có lỗi xảy ra: ${err.message || "Vui lòng thử lại"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-3xl bg-white p-5 sm:p-7 shadow-2xl overflow-y-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-5 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-ueh border border-blue-100 mb-1.5">
            <Sparkles size={13} className="text-ueh-orange" /> Kỷ niệm 15 năm TCDN4 - K33 UEH
          </div>
          <h3 className="text-xl font-black text-ueh sm:text-2xl">
            Điểm Danh & Hồ Sơ Thành Viên
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Đồng bộ thông tin cá nhân vào Danh bạ K33 và xác nhận tham dự hội ngộ ngày 12/12/2026.
          </p>
        </div>

        {/* 2 Tabs Chuyển đổi mượt mà */}
        <div className="flex rounded-2xl bg-slate-100 p-1 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === "info"
                ? "bg-white text-ueh shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User size={15} />
            <span>1. Hồ sơ Danh bạ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
              activeTab === "attendance"
                ? "bg-white text-ueh-orange shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shirt size={15} />
            <span>2. Điểm danh & Áo</span>
            {attendanceStatus === "attending" && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* TAB 1: THÔNG TIN HỒ SƠ DANH BẠ */}
          {activeTab === "info" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Khuyến khích đổi ảnh đại diện cá nhân rõ mặt */}
              <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <Sparkles size={17} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="text-amber-800">Khuyến khích:</strong> Bạn hãy tải lên ảnh đại diện cá nhân rõ mặt để bạn bè cùng khóa TC10, TC11, TC12 dễ dàng nhận ra nhau sau 15 năm nhé!
                </div>
              </div>

              {/* Avatar Section: Chạm vào avatar để đổi ảnh ngay, gợi ý 2 option mặc định gọn gàng */}
              <div className="flex items-center gap-4 p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/70">
                <label className="relative shrink-0 cursor-pointer group" title="Chạm vào để tải ảnh từ máy / điện thoại">
                  <div className="h-20 w-20 sm:h-22 sm:w-22 overflow-hidden rounded-full ring-4 ring-blue-100 shadow-md bg-gradient-to-br from-blue-600 to-ueh flex items-center justify-center text-white font-black text-2xl relative">
                    {uploadingAvatar ? (
                      <Loader2 size={24} className="animate-spin text-white" />
                    ) : avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                    ) : (
                      fullName.trim().charAt(0) || "A"
                    )}

                    {/* Lớp phủ đổi ảnh khi hover */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-2xs flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Camera size={20} className="text-ueh-gold mb-0.5" />
                      <span className="text-[10px] font-bold">Đổi ảnh</span>
                    </div>
                  </div>

                  {/* Icon Camera góc dưới */}
                  <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-ueh text-white shadow-md border-2 border-white group-hover:scale-110 transition-transform">
                    <Camera size={12} className="text-ueh-gold" />
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                    disabled={uploadingAvatar}
                  />
                </label>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">
                    {uploadingAvatar ? "Đang tải ảnh lên..." : "Ảnh đại diện thành viên"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 mb-2.5">
                    Chạm trực tiếp vào ảnh để tải ảnh từ máy hoặc điện thoại.
                  </p>

                  {/* 2 Option ảnh mặc định gợi ý duy nhất */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">
                      Ảnh mặc định:
                    </span>
                    <div className="flex items-center gap-2">
                      {DEFAULT_AVATARS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAvatarUrl(item.src)}
                          title={`Chọn ${item.label}`}
                          className={`h-9 w-9 overflow-hidden rounded-full border-2 transition-all hover:scale-105 ${
                            avatarUrl === item.src
                              ? "border-ueh ring-2 ring-blue-200 scale-105 shadow-xs"
                              : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.src} alt={item.label} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Họ tên & Lớp */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Họ và Tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="VD: Cao Tuấn Hiệp"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold focus:border-ueh focus:outline-none focus:ring-1 focus:ring-ueh"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Lớp sinh viên
                  </label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
                  >
                    <option value="TC10">Lớp TC10 - K33 UEH</option>
                    <option value="TC11">Lớp TC11 - K33 UEH</option>
                    <option value="TC12">Lớp TC12 - K33 UEH</option>
                  </select>
                </div>
              </div>

              {/* KHU VỰC SINH SỐNG & QUỐC TẾ */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-700 mb-2">
                  <MapPin size={14} className="text-rose-500" /> Khu vực sinh sống hiện tại
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-2.5">
                  {[
                    { id: "hcm", label: "TP. Hồ Chí Minh" },
                    { id: "hn", label: "Hà Nội" },
                    { id: "other", label: "Tỉnh khác" },
                    { id: "overseas", label: "Xuất Ngoại" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLocation(item.id)}
                      className={`rounded-xl py-2 px-2.5 text-xs font-bold text-center border transition-all ${
                        location === item.id
                          ? "bg-ueh text-white border-ueh shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Nếu chọn Tỉnh khác -> Hiện danh sách chọn Tỉnh lớn + ô điền thêm */}
                {location === "other" ? (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/80">
                    <span className="text-[11px] font-bold text-ueh block mb-1.5">
                      📍 Chọn nhanh tỉnh / thành phố:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {OTHER_PROVINCES_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSpecificLocation(preset)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all ${
                            specificLocation === preset
                              ? "bg-ueh text-white border-ueh shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-ueh"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={specificLocation}
                      onChange={(e) => setSpecificLocation(e.target.value)}
                      placeholder="Hoặc điền thêm tỉnh thành của bạn (VD: Đà Nẵng, Nha Trang, Huế...)"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs focus:border-ueh focus:outline-none"
                    />
                  </div>
                ) : location === "overseas" ? (
                  /* Nếu chọn Xuất Ngoại -> Hiện danh sách Quốc gia */
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/80">
                    <span className="text-[11px] font-bold text-ueh-orange block mb-1.5">
                      🌏 Bạn đang sinh sống / làm việc tại quốc gia nào?
                    </span>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {OVERSEAS_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSpecificLocation(preset)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all ${
                            specificLocation === preset
                              ? "bg-orange-500 text-white border-orange-500 shadow-2xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-orange-50"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={specificLocation}
                      onChange={(e) => setSpecificLocation(e.target.value)}
                      placeholder="Hoặc nhập cụ thể: VD: Sydney, Úc hoặc California, Mỹ..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs focus:border-ueh focus:outline-none"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={specificLocation}
                    onChange={(e) => setSpecificLocation(e.target.value)}
                    placeholder="Quận / Huyện cụ thể (VD: Quận 1, Quận 7, Cầu Giấy...)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs focus:border-ueh focus:outline-none"
                  />
                )}
              </div>

              {/* HÔN NHÂN & SỐ LƯỢNG CON CÁI (F1) */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-700 mb-1.5">
                    <Heart size={14} className="text-rose-500" /> Tình trạng hôn nhân
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMaritalStatus("married")}
                      className={`rounded-xl py-2 px-2 text-xs font-bold text-center border transition-all ${
                        maritalStatus === "married"
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      💍 Đã kết hôn
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaritalStatus("single")}
                      className={`rounded-xl py-2 px-2 text-xs font-bold text-center border transition-all ${
                        maritalStatus === "single"
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🌟 Độc thân vui tính
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-700 mb-1.5">
                    <Baby size={14} className="text-emerald-600" /> Số con cái (F1 & Nhóc tì)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setChildrenCount(num)}
                        className={`rounded-xl py-2 text-xs font-bold text-center border transition-all ${
                          childrenCount === num
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {num === 3 ? "3+ bé" : `${num} bé`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nghề nghiệp, Công ty & SĐT */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Chức danh / Nghề nghiệp
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="VD: Giám đốc Tài chính, CEO..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Công ty / Doanh nghiệp
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="VD: SMLIFE, VinaCapital..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Số điện thoại / Zalo *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0972555211"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                    Ngày sinh nhật của bạn
                  </label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Đôi dòng chia sẻ ngắn (Bio)
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="VD: Rất vui được gặp lại mọi người sau 15 năm!"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-[11px] text-slate-400">Bước tiếp theo: Điểm danh & Áo kỷ niệm</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("attendance")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-ueh transition-colors"
                >
                  Tiếp theo: Điểm danh 15 Năm <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ĐIỂM DANH & ÁO KỶ NIỆM 15 NĂM */}
          {activeTab === "attendance" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Lựa chọn Có đi hoặc Không đi */}
              <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-3.5">
                <div className="text-xs font-bold uppercase text-ueh mb-2.5 flex items-center justify-between">
                  <span>Bạn có tham gia gặp mặt Thứ 7 ngày 12/12 không?</span>
                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    Hạn chốt: 30/11
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAttendanceStatus("attending")}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
                      attendanceStatus === "attending"
                        ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-white/80 border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      attendanceStatus === "attending" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                    }`}>
                      {attendanceStatus === "attending" && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">🟢 Sẽ tham gia trực tiếp</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Tại Làng Nướng Nam Bộ (302A Tô Hiến Thành, Q.10) lúc 11:30 ngày 12/12
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttendanceStatus("not_attending")}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition-all ${
                      attendanceStatus === "not_attending"
                        ? "bg-white border-orange-500 shadow-md ring-2 ring-orange-500/20"
                        : "bg-white/80 border-slate-200 hover:bg-white"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      attendanceStatus === "not_attending" ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300"
                    }`}>
                      {attendanceStatus === "not_attending" && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">🟠 Tiếc quá, mình ở xa / bận</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Gửi lời chúc Lưu bút & nhận áo kỷ niệm gửi ship tận nơi
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* NẾU ĐI: CHỌN SIZE ÁO & KINH PHÍ */}
              {attendanceStatus === "attending" && (
                <div className="space-y-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-800">
                      <Shirt size={15} /> Chọn Size áo Polo Kỷ niệm
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowShirtSizePopup(true)}
                      className="text-[11px] font-bold text-ueh underline hover:text-ueh-light"
                    >
                      Bảng thông số size áo 📐
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {SHIRT_SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setShirtSize(s)}
                        className={`rounded-xl py-1.5 text-[11px] font-bold text-center border transition-all ${
                          shirtSize === s
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Số người đi cùng / F1
                      </label>
                      <select
                        value={guestsCount}
                        onChange={(e) => setGuestsCount(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                      >
                        <option value={0}>Đi 1 mình (35+ bạn cùng khóa)</option>
                        <option value={1}>Dắt theo 1 người thân / bé</option>
                        <option value={2}>Dắt theo cả gia đình (2 người)</option>
                        <option value={3}>Dắt theo 3 người</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                        Địa chỉ nhận áo (hoặc nhận tại tiệc)
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="VD: Nhận trực tiếp tại Cơ sở B"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Box Kinh phí & VietQR */}
                  <div className="rounded-xl border border-emerald-300 bg-white p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500 font-bold uppercase">Kinh phí tham dự</div>
                      <div className="text-base font-black text-slate-900">1.000.000 VNĐ / thành viên</div>
                      <div className="text-[10px] text-emerald-700 font-medium">Bao gồm tiệc VIP, áo Polo & kỷ yếu 15 năm</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-ueh"
                    >
                      <QrCode size={14} /> Mã VietQR
                    </button>
                  </div>
                </div>
              )}

              {/* NẾU KHÔNG ĐI: GỬI LƯU BÚT & ẢNH KỶ NIỆM */}
              {attendanceStatus === "not_attending" && (
                <div className="space-y-3.5 rounded-2xl border border-orange-200/80 bg-orange-50/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-900 uppercase">
                    <MessageSquare size={15} className="text-ueh-orange" />
                    <span>Gửi lời nhắn thân thương vào Sổ Lưu Bút K33</span>
                  </div>
                  <textarea
                    rows={3}
                    value={guestbookMessage}
                    onChange={(e) => setGuestbookMessage(e.target.value)}
                    placeholder="VD: Chúc tập thể TC10, TC11, TC12 có buổi họp mặt 15 năm thật nhiều kỷ niệm và tiếng cười! Hẹn gặp mọi người vào dịp gần nhất..."
                    className="w-full rounded-xl border border-orange-200 bg-white p-3 text-xs focus:border-ueh focus:outline-none"
                  />

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-600 mb-1">
                      <Shirt size={14} /> Đăng ký nhận Áo Polo gửi ship tận nơi (tùy chọn)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={shirtSize}
                        onChange={(e) => setShirtSize(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                      >
                        {SHIRT_SIZES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Địa chỉ nhận ship áo tận nhà..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Bottom Actions */}
          <div className="mt-6 flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-ueh to-ueh-light px-6 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50"
            >
              <Check size={15} />
              <span>{saving ? "Đang đồng bộ..." : "Lưu & Xác Nhận Điểm Danh"}</span>
            </button>
          </div>
        </form>

        {/* POPUP BẢNG SIZE ÁO */}
        {showShirtSizePopup && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={() => setShowShirtSizePopup(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowShirtSizePopup(false)}
                className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
              <div className="text-center mb-3">
                <div className="text-base font-bold text-ueh flex items-center justify-center gap-1.5">
                  <Shirt size={18} className="text-ueh-orange" /> Bảng Thông Số Size Áo Polo K33
                </div>
                <div className="text-xs text-slate-500">Chất liệu Cotton Cá Sấu Cao Cấp 4 Chiều Co Giãn</div>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="py-2 px-3">Size</th>
                      <th className="py-2 px-3">Chiều cao</th>
                      <th className="py-2 px-3">Cân nặng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    <tr><td className="py-2 px-3 font-bold text-ueh">S</td><td className="py-2 px-3">1m50 - 1m60</td><td className="py-2 px-3">45 - 53 kg</td></tr>
                    <tr className="bg-slate-50/50"><td className="py-2 px-3 font-bold text-ueh">M</td><td className="py-2 px-3">1m60 - 1m68</td><td className="py-2 px-3">54 - 62 kg</td></tr>
                    <tr><td className="py-2 px-3 font-bold text-ueh">L</td><td className="py-2 px-3">1m68 - 1m75</td><td className="py-2 px-3">63 - 70 kg</td></tr>
                    <tr className="bg-slate-50/50"><td className="py-2 px-3 font-bold text-ueh">XL</td><td className="py-2 px-3">1m75 - 1m82</td><td className="py-2 px-3">71 - 80 kg</td></tr>
                    <tr><td className="py-2 px-3 font-bold text-ueh">2XL / 3XL</td><td className="py-2 px-3">Trên 1m80</td><td className="py-2 px-3">Trên 80 kg</td></tr>
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => setShowShirtSizePopup(false)}
                className="mt-4 w-full rounded-xl bg-ueh py-2 text-xs font-bold text-white"
              >
                Đã hiểu, quay lại chọn size
              </button>
            </div>
          </div>
        )}

        {/* POPUP VIETQR */}
        {showQrModal && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={() => setShowQrModal(false)}
          >
            <div
              className="relative w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-2xl animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
              <div className="text-base font-bold text-ueh mb-1">Mã Chuyển Khoản VietQR</div>
              <div className="text-xs text-slate-500 mb-3">Quét mã bằng ứng dụng ngân hàng</div>
              <div className="mx-auto w-52 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-2 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="VietQR" className="w-full h-auto" />
              </div>
              <div className="mt-3 text-xs font-semibold text-slate-700 space-y-1">
                <div>{bankInfo.bankName}</div>
                <div className="font-mono font-bold text-slate-900">{bankInfo.accountNumber} - {bankInfo.accountName}</div>
                <div className="text-emerald-600 font-black mt-1">Số tiền: {bankInfo.amountText}</div>
                <div className="rounded-xl bg-blue-50/80 p-2 text-left border border-blue-200 mt-2">
                  <div className="text-[10px] uppercase font-bold text-ueh">Cú pháp gợi ý:</div>
                  <div className="font-mono text-xs font-bold text-ueh">{transferSyntax}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Không khóa cứng, gợi ý ghi rõ Tên & SĐT để đối soát</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="mt-4 w-full rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-ueh"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
