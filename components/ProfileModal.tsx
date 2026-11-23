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
  Loader2,
  Copy,
  CheckCheck,
  ArrowRight,
  UserCheck
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { getSupabase } from "@/lib/supabase/client";
import { DEFAULT_BANK_INFO, getBankInfo, fetchBankInfo, BankConfig } from "@/lib/bank";
import { getAvatarInitials } from "@/lib/avatar";

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

const SHIRT_SIZES = [
  "S (Nam)", "M (Nam)", "L (Nam)", "XL (Nam)", "2XL (Nam)", "3XL (Nam)",
  "S (Nữ)", "M (Nữ)", "L (Nữ)", "XL (Nữ)"
];

function removeVietnameseTones(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export default function ProfileModal({
  onClose,
  initialTab = "info",
}: {
  onClose: () => void;
  initialTab?: "info" | "attendance";
}) {
  const { user, profile, updateProfile } = useAuth();
  const toast = useToast();
  const [bankInfo, setBankInfo] = useState<BankConfig>(DEFAULT_BANK_INFO);

  const [activeTab, setActiveTab] = useState<"info" | "attendance">(initialTab);

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

  // Điểm danh Hội ngộ 15 Năm: chỉ gán giá trị nếu profile đã lưu rõ ràng
  const [attendanceStatus, setAttendanceStatus] = useState<"attending" | "not_attending" | "unregistered">(
    profile?.attendance_status === "attending"
      ? "attending"
      : profile?.attendance_status === "not_attending"
      ? "not_attending"
      : "unregistered"
  );
  const [shirtSize, setShirtSize] = useState(profile?.shirt_size || "L (Nam)");
  const [deliveryAddress, setDeliveryAddress] = useState(profile?.delivery_address || "");
  const [guestsCount, setGuestsCount] = useState(0);
  const [showShirtSizePopup, setShowShirtSizePopup] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Lời nhắn lưu bút nếu không tham gia trực tiếp
  const [guestbookMessage, setGuestbookMessage] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Đọc thông tin phiếu đăng ký hiện tại (nếu có)
  const [myRegistration, setMyRegistration] = useState<any>(null);

  // Đồng bộ state khi profile nạp từ server
  useEffect(() => {
    if (profile) {
      if (profile.full_name && !fullName) setFullName(profile.full_name);
      if (profile.class_name && !className) setClassName(profile.class_name);
      if (profile.job_title && !jobTitle) setJobTitle(profile.job_title);
      if (profile.company && !company) setCompany(profile.company);
      if (profile.phone && !phone) setPhone(profile.phone);
      if (profile.avatar_url && !avatarUrl) setAvatarUrl(profile.avatar_url);
      if (profile.birthday && !birthday) setBirthday(profile.birthday);
      if (profile.bio && !bio) setBio(profile.bio);
      if (profile.attendance_status === "attending") setAttendanceStatus("attending");
      else if (profile.attendance_status === "not_attending") setAttendanceStatus("not_attending");
      if (profile.shirt_size && !shirtSize) setShirtSize(profile.shirt_size);
    }
  }, [profile]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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

  // Đọc trạng thái đăng ký của user hiện tại & đồng bộ với localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tcdn4_registrations");
      const list = stored ? JSON.parse(stored) : [];
      const userPhone = (phone || profile?.phone || "").replace(/[^0-9]/g, "");
      const myReg = list.find((r: any) => {
        if (user?.id && r.id === user.id) return true;
        if (userPhone && userPhone.length >= 9 && (r.phone || "").replace(/[^0-9]/g, "") === userPhone) return true;
        return false;
      });
      if (myReg) {
        setMyRegistration(myReg);
        if (myReg.shirtSize) setShirtSize(myReg.shirtSize);
        if (myReg.address) setDeliveryAddress(myReg.address);
        setAttendanceStatus("attending");
      }
    } catch {}
  }, [user, profile, phone, fullName]);

  // Luôn tự động kiểm tra đối soát SePay trực tiếp từ Server để cập nhật tức thì
  useEffect(() => {
    let active = true;

    async function checkServerRegistration() {
      try {
        const res = await fetch(`/api/registrations?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = await res.json();
        const list = data?.registrations || data?.items || [];
        if (!Array.isArray(list)) return;

        const userPhone = (phone || profile?.phone || "").replace(/[^0-9]/g, "");

        const serverReg = list.find((r: any) => {
          if (user?.id && r.id === user.id) return true;
          if (userPhone && userPhone.length >= 9 && (r.phone || "").replace(/[^0-9]/g, "") === userPhone) return true;
          return false;
        });

        if (serverReg && active) {
          setMyRegistration((prev: any) => {
            // Khi trạng thái chuyển thành confirmed (SePay webhook vừa khớp lệnh)
            if (prev?.status !== "confirmed" && serverReg.status === "confirmed") {
              toast.success("Tuyệt vời! Hệ thống SePay đã xác nhận thanh toán thành công! 🎉");
              setShowQrModal(false);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("tcdn4_registration_updated"));
              }
            }
            return serverReg;
          });
          if (serverReg.shirtSize) setShirtSize(serverReg.shirtSize);
          if (serverReg.address) setDeliveryAddress(serverReg.address);
          setAttendanceStatus("attending");

          // Cập nhật lại localStorage để toàn app đồng bộ
          try {
            const stored = localStorage.getItem("tcdn4_registrations");
            const localList: any[] = stored ? JSON.parse(stored) : [];
            const idx = localList.findIndex((r: any) =>
              (user?.id && r.id === user.id) ||
              (userPhone && userPhone.length >= 9 && (r.phone || "").replace(/[^0-9]/g, "") === userPhone)
            );
            if (idx >= 0) {
              localList[idx] = { ...localList[idx], ...serverReg };
            } else {
              localList.unshift(serverReg);
            }
            localStorage.setItem("tcdn4_registrations", JSON.stringify(localList));
          } catch {}
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra đối soát SePay:", err);
      }
    }

    checkServerRegistration();

    // Nếu đang mở popup VietQR hoặc trạng thái đăng ký là pending, polling mỗi 3 giây
    let interval: NodeJS.Timeout | null = null;
    if (showQrModal || myRegistration?.status === "pending") {
      interval = setInterval(checkServerRegistration, 3000);
    }

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [showQrModal, myRegistration?.status, phone, fullName, user?.id, profile?.phone, profile?.full_name]);

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

  const cleanNameNoTones = fullName 
    ? removeVietnameseTones(fullName.trim().toUpperCase()).replace(/[^A-Z0-9 ]/g, "") 
    : "TEN";
  const cleanPhoneDigits = phone ? phone.trim().replace(/[^0-9]/g, "") : "SDT";
  const transferSyntax = `TCDN4 ${cleanNameNoTones} ${cleanPhoneDigits}`;
  const qrUrl = `https://img.vietqr.io/image/${bankInfo.bankCode}-${bankInfo.accountNumber}-compact2.png?amount=${bankInfo.amount}&addInfo=${encodeURIComponent(transferSyntax)}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper gửi thông báo điểm danh thành viên mới vào Zalo Bot (chỉ gửi lần đầu tiên khi điểm danh, không spam)
  const triggerCheckinNotificationIfNeeded = () => {
    // Nếu hồ sơ trước đó đã có số điện thoại lưu sẵn, nghĩa là thành viên này đã từng lưu hồ sơ trước đó rồi
    const hasAlreadySavedBefore = Boolean(profile?.phone && profile.phone.trim().length > 0);
    const checkinKey = `tcdn4_zalo_checkin_${user?.id || phone.trim()}`;
    const alreadyNotified = Boolean(
      hasAlreadySavedBefore ||
      profile?.has_checked_in ||
      (typeof window !== "undefined" && localStorage.getItem(checkinKey))
    );

    if (!alreadyNotified) {
      try {
        fetch("/api/zalo-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "checkin",
            userId: user?.id,
            phone: phone.trim(),
            fullName: fullName.trim(),
            className,
            jobTitle: jobTitle.trim(),
            company: company.trim(),
            location: specificLocation.trim() || (location === "hcm" ? "TP.HCM" : location === "hn" ? "Hà Nội" : "Tỉnh khác"),
          }),
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(checkinKey, "true");
        }
      } catch {}
    }
  };

  // 1. Chỉ lưu thông tin cá nhân (Tab 1) & đóng modal
  const handleSaveProfileOnly = async () => {
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ và tên của bạn!");
      return;
    }
    if (!phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại / Zalo để liên hệ!");
      return;
    }

    setSaving(true);
    try {
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
        has_checked_in: true,
      });

      triggerCheckinNotificationIfNeeded();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("tcdn4_profile_updated"));
      }

      toast.success("Cập nhật thông tin điểm danh thành công!");
      onClose();
    } catch (err: any) {
      toast.error(`Có lỗi xảy ra: ${err.message || "Vui lòng thử lại"}`);
    } finally {
      setSaving(false);
    }
  };

  // 2. Lưu thông tin cá nhân & Tự động bật sang Tab 2 Đăng ký gặp mặt 15 năm (Yêu cầu bước 6 & 7)
  const handleSaveAndContinue = async () => {
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ và tên của bạn!");
      return;
    }
    if (!phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại / Zalo để liên hệ!");
      return;
    }

    setSaving(true);
    try {
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
        has_checked_in: true,
      });

      triggerCheckinNotificationIfNeeded();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("tcdn4_profile_updated"));
      }

      toast.success("Đã cập nhật thông tin điểm danh! Mời bạn đăng ký tham gia 15 năm & chọn áo");
      setActiveTab("attendance");
    } catch (err: any) {
      toast.error(`Có lỗi xảy ra: ${err.message || "Vui lòng thử lại"}`);
    } finally {
      setSaving(false);
    }
  };

  // 3. Đăng ký tham gia sự kiện 15 năm & Nhận mã QR thanh toán (Tab 2)
  const handleRegisterAttendance = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Vui lòng hoàn tất Họ tên và Số điện thoại ở Bước 1!");
      setActiveTab("info");
      return;
    }

    setSaving(true);
    try {
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

      // Cập nhật profile (lưu đầy đủ họ tên, SĐT, lớp đã đăng ký)
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        class_name: className,
        attendance_status: "attending",
        shirt_size: shirtSize,
        delivery_address: deliveryAddress.trim(),
        has_checked_in: true,
      });

      // Lưu localStorage
      try {
        const stored = localStorage.getItem("tcdn4_registrations");
        const list = stored ? JSON.parse(stored) : [];
        const existingIdx = list.findIndex(
          (x: any) =>
            x.phone === phone.trim() ||
            x.fullName === fullName.trim() ||
            (user?.id && x.id === user.id)
        );
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...regEntry };
        } else {
          list.unshift(regEntry);
        }
        localStorage.setItem("tcdn4_registrations", JSON.stringify(list));
        setMyRegistration(regEntry);
      } catch {}

      // Gửi lên API server
      try {
        await fetch("/api/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(regEntry),
        });
      } catch {}

      // Bắn thông báo Zalo Bot thông báo có người đăng ký tham gia họp lớp
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
            address: deliveryAddress.trim() || "Tại sự kiện Cơ sở B",
            paidAmount: bankInfo.amount,
            guestsCount,
          }),
        });
      } catch {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("tcdn4_profile_updated"));
        window.dispatchEvent(new Event("tcdn4_registration_updated"));
      }

      toast.success("Đăng ký thành công! Đang mở mã VietQR để hoàn tất chuyển khoản...");
      setShowQrModal(true);
    } catch (err: any) {
      toast.error(`Có lỗi xảy ra: ${err.message || "Vui lòng thử lại"}`);
    } finally {
      setSaving(false);
    }
  };

  // 4. Không tham gia trực tiếp -> gửi lời nhắn nhủ vào Sổ lưu bút
  const handleDeclineAndSendWish = async () => {
    setSaving(true);
    try {
      await updateProfile({
        attendance_status: "not_attending",
        shirt_size: shirtSize,
        delivery_address: deliveryAddress.trim(),
        has_checked_in: true,
      });

      if (guestbookMessage.trim()) {
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

      toast.success("Cảm ơn bạn! Lời nhắn nhủ đã được lưu vào Sổ Lưu Bút K33.");
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
        className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl overflow-y-auto max-h-[92vh] sm:max-h-[88vh] overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute right-3.5 top-3.5 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header Tiêu đề gọn gàng */}
        <div className="mb-3 pr-8">
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-black text-ueh tracking-tight">
              Điểm Danh & Hồ Sơ Thành Viên
            </h3>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-ueh border border-blue-100">
              K33 UEH
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-snug">
            Cập nhật danh bạ TC10 • TC11 • TC12 & đăng ký gặp mặt 15 năm (12/12/2026).
          </p>
        </div>

        {/* 2 Tabs chuyển đổi mượt mà */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-3.5">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
              activeTab === "info"
                ? "bg-white text-ueh shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserCheck size={14} className={activeTab === "info" ? "text-ueh" : ""} />
            <span>1. Thông tin cá nhân</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
              activeTab === "attendance"
                ? "bg-white text-ueh-orange shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shirt size={14} className={activeTab === "attendance" ? "text-ueh-orange" : ""} />
            <span>2. Đăng ký gặp mặt 15 năm</span>
            {myRegistration?.status === "confirmed" ? (
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            ) : myRegistration?.status === "pending" ? (
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            ) : null}
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: THÔNG TIN CÁ NHÂN (ĐIỂM DANH)                      */}
        {/* ========================================================= */}
        {activeTab === "info" && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Avatar Section: Gọn gàng, chạm vào avatar để đổi ảnh ngay */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-200/80 bg-slate-50/70">
              <label className="relative shrink-0 cursor-pointer group" title="Chạm vào để tải ảnh từ máy / điện thoại">
                <div className="h-16 w-16 sm:h-18 sm:w-18 overflow-hidden rounded-full ring-3 ring-blue-100 shadow-md bg-gradient-to-br from-blue-600 to-ueh flex items-center justify-center text-white font-black text-xl relative">
                  {uploadingAvatar ? (
                    <Loader2 size={20} className="animate-spin text-white" />
                  ) : avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    getAvatarInitials(fullName)
                  )}

                  {/* Lớp phủ đổi ảnh khi hover */}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera size={16} className="text-ueh-gold mb-0.5" />
                    <span className="text-[9px] font-bold">Đổi ảnh</span>
                  </div>
                </div>

                {/* Icon Camera góc dưới */}
                <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-ueh text-white shadow-sm border border-white">
                  <Camera size={10} className="text-ueh-gold" />
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
                <div className="text-xs font-bold text-slate-800">
                  {uploadingAvatar ? "Đang tải ảnh..." : "Ảnh đại diện thành viên"}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 mb-1.5">
                  Chạm ảnh để tải lên từ điện thoại / máy tính (rõ mặt để bạn bè nhận ra nhé).
                </div>

                {/* 2 Option ảnh mặc định gợi ý duy nhất */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">
                    Mặc định:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {DEFAULT_AVATARS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAvatarUrl(item.src)}
                        title={`Chọn ${item.label}`}
                        className={`h-7 w-7 overflow-hidden rounded-full border-2 transition-all hover:scale-105 ${
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
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Họ và Tên *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Cao Tuấn Hiệp"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-ueh focus:outline-none focus:ring-1 focus:ring-ueh"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Lớp sinh viên
                </label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
                >
                  <option value="TC10">Lớp TC10 - K33 UEH</option>
                  <option value="TC11">Lớp TC11 - K33 UEH</option>
                  <option value="TC12">Lớp TC12 - K33 UEH</option>
                </select>
              </div>
            </div>

            {/* Số điện thoại & Ngày sinh */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Số điện thoại / Zalo *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0972555211 (dùng đối soát SePay)"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Ngày sinh nhật của bạn
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                />
              </div>
            </div>

            {/* Khu vực sinh sống */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 sm:p-3">
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-700 mb-1.5">
                <MapPin size={13} className="text-rose-500" /> Khu vực sinh sống hiện tại
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 mb-2">
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
                    className={`rounded-lg py-1.5 px-2 text-xs font-bold text-center border transition-all ${
                      location === item.id
                        ? "bg-ueh text-white border-ueh shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {location === "other" ? (
                <div className="mt-2 pt-2 border-t border-slate-200/80">
                  <span className="text-[10px] font-bold text-ueh block mb-1">
                    📍 Chọn nhanh tỉnh / thành phố:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {OTHER_PROVINCES_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSpecificLocation(preset)}
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold border transition-all ${
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
                    placeholder="Hoặc điền tỉnh thành: Đà Nẵng, Nha Trang, Huế..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>
              ) : location === "overseas" ? (
                <div className="mt-2 pt-2 border-t border-slate-200/80">
                  <span className="text-[10px] font-bold text-ueh-orange block mb-1">
                    🌏 Quốc gia / Thành phố sinh sống:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {OVERSEAS_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSpecificLocation(preset)}
                        className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold border transition-all ${
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
                    placeholder="VD: Sydney (Úc), California (Mỹ)..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  value={specificLocation}
                  onChange={(e) => setSpecificLocation(e.target.value)}
                  placeholder="Quận / Huyện cụ thể (VD: Quận 1, Quận 7, Cầu Giấy...)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                />
              )}
            </div>

            {/* Hôn nhân & F1 */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-700 mb-1.5">
                  <Heart size={13} className="text-rose-500" /> Tình trạng hôn nhân
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMaritalStatus("married")}
                    className={`rounded-lg py-1.5 px-2 text-xs font-bold text-center border transition-all ${
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
                    className={`rounded-lg py-1.5 px-2 text-xs font-bold text-center border transition-all ${
                      maritalStatus === "single"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    🌟 Độc thân vui tính
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-700 mb-1.5">
                  <Baby size={13} className="text-emerald-600" /> Số con cái (F1 & Nhóc tì)
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[0, 1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setChildrenCount(num)}
                      className={`rounded-lg py-1.5 text-xs font-bold text-center border transition-all ${
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

            {/* Chức danh & Công ty */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Chức danh / Nghề nghiệp
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="VD: Giám đốc Tài chính, CEO..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Công ty / Doanh nghiệp
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="VD: SMLIFE, VinaCapital..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                />
              </div>
            </div>

            {/* Tiểu sử ngắn */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                Đôi dòng chia sẻ ngắn (Bio)
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="VD: Rất vui được gặp lại mọi người sau 15 năm!"
                className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
              />
            </div>

            {/* Nút hành động gọn gàng */}
            <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleSaveProfileOnly}
                disabled={saving}
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-98 transition-all"
              >
                {saving ? "Đang lưu..." : "Chỉ lưu thông tin (Đóng)"}
              </button>

              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ueh to-ueh-light px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg hover:opacity-95 disabled:opacity-50 active:scale-98 transition-all"
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} className="text-ueh-gold" />
                )}
                <span>Lưu & Tiếp tục đăng ký 15 năm →</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ĐĂNG KÝ CHƯƠNG TRÌNH GẶP MẶT 15 NĂM                */}
        {/* ========================================================= */}
        {activeTab === "attendance" && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Thẻ Trạng thái Tham gia 15 Năm (Chỉ hiện trong Tab 2 khi ĐÃ đăng ký) */}
            {myRegistration?.status === "confirmed" ? (
              <div className="flex items-center justify-between gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50/90 px-3 py-2 text-emerald-900 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div className="text-xs font-bold text-emerald-950 truncate">
                    ĐÃ XÁC NHẬN THAM GIA • Áo: {myRegistration.shirtSize || shirtSize}
                  </div>
                </div>
                <span className="rounded-md bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">100% OK</span>
              </div>
            ) : myRegistration?.status === "pending" ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 sm:p-3 text-amber-900 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                    <QrCode size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-950 truncate">
                      ĐÃ ĐĂNG KÝ THAM GIA • Chờ chuyển khoản
                    </div>
                    <div className="text-[10px] text-amber-800 truncate">
                      Size áo: {myRegistration?.shirtSize || shirtSize} • {bankInfo.amountText}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-ueh transition-colors"
                >
                  <QrCode size={12} className="text-ueh-gold" />
                  <span>Mã QR</span>
                </button>
              </div>
            ) : attendanceStatus === "not_attending" ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                <span className="text-[11px] font-medium text-slate-600 truncate">Trạng thái: Đã gửi lời chúc (Không tham gia)</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceStatus("attending");
                  }}
                  className="rounded-lg bg-ueh px-2.5 py-1 text-[11px] font-bold text-white hover:bg-ueh-light shrink-0"
                >
                  Đổi ý tham gia
                </button>
              </div>
            ) : null}

            {/* Lựa chọn Tham gia hoặc Không tham gia */}
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3">
              <div className="text-[11px] font-bold uppercase text-ueh mb-2 flex items-center justify-between">
                <span>Bạn có tham gia gặp mặt Thứ 7 ngày 12/12 không?</span>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  Hạn chốt: 30/11
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAttendanceStatus("attending")}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    attendanceStatus === "attending"
                      ? "bg-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/20"
                      : "bg-white/80 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    attendanceStatus === "attending" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                  }`}>
                    {attendanceStatus === "attending" && <Check size={10} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">🟢 Tôi sẽ tham gia</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Có mặt tại Cơ sở B UEH (279 Nguyễn Tri Phương, Q.10) lúc 9:00 sáng Thứ 7 ngày 12/12/2026.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendanceStatus("not_attending")}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    attendanceStatus === "not_attending"
                      ? "bg-white border-orange-500 shadow-xs ring-2 ring-orange-500/20"
                      : "bg-white/80 border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    attendanceStatus === "not_attending" ? "border-orange-500 bg-orange-500 text-white" : "border-slate-300"
                  }`}>
                    {attendanceStatus === "not_attending" && <Check size={10} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">🟠 Rất tiếc không thể tham gia</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Gửi lời nhắn nhủ thân thương và chúc mừng vào Sổ lưu bút K33.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* NẾU ĐI: CHỌN ÁO, SỐ NGƯỜI, ĐỊA CHỈ NHẬN ÁO & KINH PHÍ */}
            {attendanceStatus === "attending" && (
              <div className="space-y-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 uppercase">
                    <Shirt size={14} className="text-ueh-gold" />
                    <span>Chọn size Áo Polo Kỷ Niệm 15 Năm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowShirtSizePopup(true)}
                    className="text-[11px] font-bold text-ueh hover:underline"
                  >
                    Bảng số đo ↗
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {SHIRT_SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShirtSize(s)}
                      className={`rounded-lg py-1.5 px-1 text-xs font-bold text-center border transition-all ${
                        shirtSize === s
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Địa chỉ nhận áo (hoặc nhận trực tiếp tại tiệc)
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="VD: Nhận trực tiếp tại ngày họp Cơ sở B hoặc địa chỉ nhà..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>

                {/* Box Kinh phí & VietQR */}
                <div className="rounded-xl border border-emerald-300 bg-white p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Kinh phí tham dự</div>
                    <div className="text-sm sm:text-base font-black text-slate-900">{bankInfo.amountText} / thành viên</div>
                    <div className="text-[10px] text-emerald-700 font-medium">Bao gồm tiệc VIP, áo Polo & kỷ yếu 15 năm</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-ueh active:scale-98 transition-all shrink-0"
                  >
                    <QrCode size={13} className="text-ueh-gold" /> Mã VietQR
                  </button>
                </div>
              </div>
            )}

            {/* NẾU KHÔNG ĐI: GỬI LƯU BÚT */}
            {attendanceStatus === "not_attending" && (
              <div className="space-y-3 rounded-xl border border-orange-200/80 bg-orange-50/40 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-900 uppercase">
                  <MessageSquare size={14} className="text-ueh-orange" />
                  <span>Gửi lời nhắn thân thương vào Sổ Lưu Bút K33</span>
                </div>
                <textarea
                  rows={2}
                  value={guestbookMessage}
                  onChange={(e) => setGuestbookMessage(e.target.value)}
                  placeholder="VD: Chúc tập thể TC10, TC11, TC12 có buổi họp mặt 15 năm thật nhiều kỷ niệm và tiếng cười!..."
                  className="w-full rounded-xl border border-orange-200 bg-white p-2.5 text-xs focus:border-ueh focus:outline-none"
                />

                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-600 mb-1">
                    <Shirt size={13} /> Đăng ký nhận Áo Polo gửi ship tận nơi (tùy chọn)
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

            {/* Button Actions của Tab 2 */}
            <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-98 transition-all"
              >
                ← Quay lại Thông tin cá nhân
              </button>

              {attendanceStatus === "attending" ? (
                <button
                  type="button"
                  onClick={handleRegisterAttendance}
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ueh to-ueh-light px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg hover:opacity-95 disabled:opacity-50 active:scale-98 transition-all"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <QrCode size={15} className="text-ueh-gold" />
                  )}
                  <span>Đăng ký tham gia & Nhận mã QR</span>
                </button>
              ) : attendanceStatus === "not_attending" ? (
                <button
                  type="button"
                  onClick={handleDeclineAndSendWish}
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-98 transition-all"
                >
                  <MessageSquare size={15} />
                  <span>Gửi lời nhắn nhủ & Lời chúc</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAttendanceStatus("attending")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-ueh active:scale-98 transition-all"
                >
                  <span>Chọn đăng ký tham gia →</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* POPUP BẢNG THÔNG SỐ SIZE ÁO POLO                          */}
        {/* ========================================================= */}
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
                className="mt-4 w-full rounded-xl bg-ueh py-2 text-xs font-bold text-white hover:bg-ueh-light"
              >
                Đã hiểu, quay lại chọn size
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* POPUP VIETQR & SEPAY TỰ ĐỘNG XÁC MINH (BƯỚC 7)           */}
        {/* ========================================================= */}
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

              <div className="flex h-11 w-11 mx-auto mb-2 items-center justify-center rounded-2xl bg-ueh text-white shadow-xs">
                <QrCode size={22} className="text-ueh-gold" />
              </div>
              <div className="text-base font-black text-slate-900">Mã Chuyển Khoản VietQR</div>
              <div className="text-xs text-slate-500 mb-3">Mở ứng dụng ngân hàng bất kỳ để quét mã</div>

              {/* Ảnh QR Code tự động điền sẵn nội dung & số tiền */}
              <div className="mx-auto w-52 overflow-hidden rounded-2xl border-2 border-emerald-300 bg-white p-2 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="VietQR TCDN4" className="w-full h-auto rounded-lg" />
              </div>

              {/* Thông tin chuyển khoản chi tiết */}
              <div className="mt-3.5 text-xs text-slate-700 space-y-2 text-left bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Ngân hàng:</span>
                  <span className="font-bold text-slate-900">{bankInfo.bankName}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">{bankInfo.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(bankInfo.accountNumber, "account", "Số tài khoản")}
                      className="p-1 rounded-md text-ueh hover:bg-blue-100"
                      title="Sao chép số tài khoản"
                    >
                      {copiedKey === "account" ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Người thụ hưởng:</span>
                  <span className="font-bold text-slate-900">{bankInfo.accountName}</span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Số tiền:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-emerald-600">{bankInfo.amountText}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(String(bankInfo.amount), "amount", "Số tiền")}
                      className="p-1 rounded-md text-ueh hover:bg-blue-100"
                      title="Sao chép số tiền"
                    >
                      {copiedKey === "amount" ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50/90 p-2.5 border border-blue-200 mt-2">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] uppercase font-bold text-ueh">Cú pháp chuyển khoản:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(transferSyntax, "syntax", "Cú pháp chuyển khoản")}
                      className="text-[10px] font-bold text-ueh flex items-center gap-1 hover:underline"
                    >
                      {copiedKey === "syntax" ? <CheckCheck size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>Sao chép</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs font-bold text-ueh break-all">{transferSyntax}</div>
                </div>
              </div>

              {/* Thông báo SePay tự động & Live Polling indicator */}
              <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-left flex items-start gap-2 shadow-2xs">
                <span className="relative flex h-2.5 w-2.5 mt-1 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="space-y-0.5">
                  <div className="font-bold text-emerald-950 flex items-center gap-1">
                    <span>Đối soát tự động qua SePay</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">Trực tiếp</span>
                  </div>
                  <div className="text-[10.5px] text-emerald-800 leading-snug">
                    Hệ thống đang lắng nghe giao dịch 24/7 và sẽ tự động duyệt ngay khi tiền về tài khoản mà không cần gửi biên lai!
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowQrModal(false);
                  onClose();
                  toast.success("Cảm ơn bạn! Hệ thống SePay sẽ tự động cập nhật trạng thái khi giao dịch thành công.");
                }}
                className="mt-3.5 w-full rounded-xl bg-ueh py-2.5 text-xs font-bold text-white hover:bg-ueh-light transition-all shadow-md"
              >
                Tôi đã chuyển khoản xong
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}