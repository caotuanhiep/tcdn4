"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Camera,
  MapPin,
  X,
  Check,
  Sparkles,
  Heart,
  Baby,
  Shirt,
  MessageSquare,
  QrCode,
  CheckCircle2,
  Loader2,
  Copy,
  CheckCheck,
  UserCheck,
  Users,
  Minus,
  Plus,
  Save,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useAlumniData } from "@/components/AlumniDataProvider";
import { useToast } from "@/components/ToastProvider";
import { getSupabase } from "@/lib/supabase/client";
import { authFetch, broadcastDataUpdate } from "@/lib/api";
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
  "S (Nữ)", "M (Nữ)", "L (Nữ)", "XL (Nữ)",
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
  const { registrations, refresh: refreshAlumniData } = useAlumniData();
  const toast = useToast();

  const [bankInfo, setBankInfo] = useState<BankConfig>(DEFAULT_BANK_INFO);
  const [activeTab, setActiveTab] = useState<"info" | "attendance">(initialTab);

  // Phiếu đăng ký hiện tại lấy trực tiếp từ nguồn dữ liệu chuẩn (DB + Cloud)
  const myRegistration = useMemo(() => {
    if (!user) return null;
    const myId = user.id.toLowerCase();
    const myPhone = (profile?.phone || "").replace(/[^0-9]/g, "");
    return (
      registrations.find((r) => {
        if (r.id && r.id.toLowerCase() === myId) return true;
        const rPhone = (r.phone || "").replace(/[^0-9]/g, "");
        if (myPhone.length >= 9 && rPhone === myPhone) return true;
        return false;
      }) || null
    );
  }, [registrations, user, profile?.phone]);

  // Chỉ lấy tên/ảnh mặc định từ Google KHI CHƯA TỪNG CÓ HỒ SƠ TRONG DATABASE
  const initialFullName =
    profile?.full_name ||
    (!profile ? ((user?.user_metadata?.full_name || user?.user_metadata?.name || "") as string) : "");
  const initialAvatarUrl =
    profile?.avatar_url ||
    (!profile ? ((user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "") as string) : "");

  // Form state — khởi tạo 1 lần duy nhất khi mở modal để KHÔNG BAO GIỜ bị background refresh ghi đè khi người dùng đang gõ
  const [fullName, setFullName] = useState(initialFullName);
  const [className, setClassName] = useState(profile?.class_name || "TC10");
  const [jobTitle, setJobTitle] = useState(profile?.job_title || "");
  const [company, setCompany] = useState(profile?.company || "");
  const [location, setLocation] = useState(
    profile?.location_region === "dn" ? "other" : profile?.location_region || "hcm"
  );
  const [specificLocation, setSpecificLocation] = useState(profile?.specific_location || "");
  const [birthday, setBirthday] = useState(profile?.birthday || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [bio, setBio] = useState(profile?.bio || "");
  const [maritalStatus, setMaritalStatus] = useState<string>(profile?.marital_status || "married");
  const [childrenCount, setChildrenCount] = useState<number>(profile?.children_count ?? 1);

  const isFeeExemptMember =
    profile?.attendance_status === "attending_free" ||
    myRegistration?.registrationType === "attending_free";

  const [attendanceStatus, setAttendanceStatus] = useState<"attending" | "not_attending" | "unregistered">(
    profile?.attendance_status === "attending" || profile?.attendance_status === "attending_free"
      ? "attending"
      : profile?.attendance_status === "shirt_only" || profile?.attendance_status === "not_attending"
      ? "not_attending"
      : myRegistration?.registrationType === "shirt_only"
      ? "not_attending"
      : myRegistration
      ? "attending"
      : "unregistered"
  );
  const [wantShirtWhenAbsent, setWantShirtWhenAbsent] = useState<boolean>(
    profile?.attendance_status === "shirt_only"
      ? true
      : profile?.attendance_status === "not_attending"
      ? false
      : true
  );
  const [shirtSize, setShirtSize] = useState(profile?.shirt_size || myRegistration?.shirtSize || "L (Nam)");
  const [deliveryAddress, setDeliveryAddress] = useState(
    profile?.delivery_address || myRegistration?.address || ""
  );
  const initialGuestsCount = myRegistration?.guestsCount || 0;
  const [bringGuests, setBringGuests] = useState<boolean>(initialGuestsCount > 0);
  const [guestsCount, setGuestsCount] = useState<number>(initialGuestsCount > 0 ? initialGuestsCount : 1);
  const guestsTouchedRef = useRef(false);
  const [guestbookMessage, setGuestbookMessage] = useState("");

  const [showShirtSizePopup, setShowShirtSizePopup] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Theo dõi lần thanh toán chuyển từ pending -> confirmed khi đang mở QR
  const prevRegStatusRef = useRef<string | undefined>(myRegistration?.status);
  useEffect(() => {
    if (prevRegStatusRef.current !== "confirmed" && myRegistration?.status === "confirmed" && showQrModal) {
      toast.success("Tuyệt vời! Hệ thống SePay đã xác nhận thanh toán thành công!");
      setShowQrModal(false);
    }
    prevRegStatusRef.current = myRegistration?.status;
  }, [myRegistration?.status, showQrModal, toast]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Đồng bộ số người thân từ myRegistration nếu dữ liệu tải xong sau khi mở modal (chỉ khi user chưa tự chỉnh)
  useEffect(() => {
    if (guestsTouchedRef.current || !myRegistration) return;
    const regGuests = Number(myRegistration.guestsCount) || 0;
    setBringGuests(regGuests > 0);
    setGuestsCount(regGuests > 0 ? regGuests : 1);
  }, [myRegistration]);

  // Tải thông tin ngân hàng mới nhất từ server
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

  // Chỉ polling đối soát SePay khi người dùng ĐANG MỞ mã QR và chưa xác nhận thanh toán
  useEffect(() => {
    if (!showQrModal || myRegistration?.status === "confirmed") return;
    const interval = setInterval(() => {
      void refreshAlumniData();
    }, 4000);
    return () => clearInterval(interval);
  }, [showQrModal, myRegistration?.status, refreshAlumniData]);

  // Upload avatar trực tiếp lên Supabase Storage
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
        toast.error(`Không tải ảnh lên cloud được: ${uploadError.message}`);
      } else {
        const { data: publicData } = getSupabase()
          .storage
          .from("alumni-media")
          .getPublicUrl(filePath);
        setAvatarUrl(publicData.publicUrl);
        toast.success("Tải ảnh đại diện lên thành công! Nhấn Lưu để cập nhật hồ sơ.");
      }
    } catch (err: any) {
      toast.error(`Lỗi tải ảnh: ${err?.message || "Vui lòng thử lại"}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const isShirtOnlyMode = attendanceStatus === "not_attending" && wantShirtWhenAbsent;
  const activeFeeAmount = isShirtOnlyMode ? bankInfo.shirtOnlyAmount || 250000 : bankInfo.amount;
  const activeFeeText = isShirtOnlyMode
    ? bankInfo.shirtOnlyAmountText || "250.000 VNĐ"
    : bankInfo.amountText;

  const cleanNameNoTones = fullName
    ? removeVietnameseTones(fullName.trim().toUpperCase()).replace(/[^A-Z0-9 ]/g, "")
    : "TEN";
  const cleanPhoneDigits = phone ? phone.trim().replace(/[^0-9]/g, "") : "SDT";
  const transferSyntax = isShirtOnlyMode
    ? `${bankInfo.syntaxPrefix || "TCDN4"} AO ${cleanNameNoTones} ${cleanPhoneDigits}`
    : `${bankInfo.syntaxPrefix || "TCDN4"} ${cleanNameNoTones} ${cleanPhoneDigits}`;
  const qrUrl = `https://img.vietqr.io/image/${bankInfo.bankCode}-${bankInfo.accountNumber}-compact2.png?amount=${activeFeeAmount}&addInfo=${encodeURIComponent(transferSyntax)}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Đã sao chép ${label}!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Gửi thông báo điểm danh Zalo Bot chỉ 1 lần duy nhất cho thành viên mới (chưa từng lưu SĐT trong DB)
  const triggerCheckinNotificationIfNeeded = () => {
    const hasAlreadySavedInDb = Boolean(profile?.phone && profile.phone.trim().length > 0);
    if (hasAlreadySavedInDb) return;

    try {
      void fetch("/api/zalo-bot", {
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
          location:
            specificLocation.trim() ||
            (location === "hcm" ? "TP.HCM" : location === "hn" ? "Hà Nội" : "Tỉnh khác"),
        }),
      });
    } catch {}
  };

  const buildProfilePayload = () => ({
    full_name: fullName.trim(),
    class_name: className,
    job_title: jobTitle.trim(),
    company: company.trim(),
    location_region: location,
    specific_location:
      location === "overseas" ? specificLocation.trim() || "Quốc tế" : specificLocation.trim(),
    birthday: birthday || null,
    phone: phone.trim(),
    avatar_url: avatarUrl || null,
    bio: bio.trim(),
    marital_status: maritalStatus,
    children_count: Number(childrenCount),
  });

  // 1. Lưu thông tin cá nhân (Tab 1) -> ghi đè thẳng DB gốc & đóng modal
  const handleSaveProfileOnly = async () => {
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ và tên của bạn!");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(buildProfilePayload());
      triggerCheckinNotificationIfNeeded();
      toast.success("Đã lưu thông tin cá nhân vào hệ thống!");
      onClose();
    } catch (err: any) {
      toast.error(`Không thể lưu hồ sơ: ${err?.message || "Vui lòng thử lại"}`);
    } finally {
      setSaving(false);
    }
  };

  // 2. Lưu thông tin cá nhân & chuyển sang Tab 2 Đăng ký gặp mặt 15 năm
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
      await updateProfile(buildProfilePayload());
      triggerCheckinNotificationIfNeeded();
      toast.success("Đã lưu hồ sơ! Mời bạn cập nhật đăng ký gặp mặt 15 năm.");
      setActiveTab("attendance");
    } catch (err: any) {
      toast.error(`Không thể lưu hồ sơ: ${err?.message || "Vui lòng thử lại"}`);
    } finally {
      setSaving(false);
    }
  };

  // 3. Đăng ký / Cập nhật tham gia sự kiện 15 năm (Tab 2) -> Ghi thẳng DB gốc + Cloud manifest
  const handleRegisterAttendance = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Vui lòng hoàn tất Họ tên và Số điện thoại ở Bước 1!");
      setActiveTab("info");
      return;
    }

    const resolvedGuestsCount = bringGuests ? Math.max(1, Math.min(10, Math.floor(Number(guestsCount) || 1))) : 0;

    setSaving(true);
    try {
      // Ghi đè toàn bộ thông tin cá nhân + trạng thái tham gia + size áo + địa chỉ vào bảng profiles
      // (API /api/profile sẽ đồng thời cập nhật registrations-manifest.json kèm số người thân trên Cloud)
      const nextAttendingStatus = isFeeExemptMember ? "attending_free" : "attending";
      await updateProfile({
        ...buildProfilePayload(),
        attendance_status: nextAttendingStatus,
        shirt_size: shirtSize,
        delivery_address: deliveryAddress.trim(),
        guests_count: resolvedGuestsCount,
      });

      // Luôn gọi /api/zalo-bot — server tự chống trùng theo settings/zalo-registrations.json
      // (bảo đảm lần đầu chốt Bước 2 LUÔN bắn tin, còn lần sau đổi size áo sẽ không spam)
      try {
        await fetch("/api/zalo-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "registration",
            registrationType: nextAttendingStatus,
            userId: user?.id,
            fullName: fullName.trim(),
            className,
            shirtSize,
            phone: phone.trim(),
            address: deliveryAddress.trim() || "Tại sự kiện Cơ sở B",
            paidAmount: isFeeExemptMember ? 0 : bankInfo.amount,
            guestsCount: resolvedGuestsCount,
          }),
        });
      } catch {}

      if (
        isFeeExemptMember ||
        (myRegistration?.status === "confirmed" && myRegistration?.registrationType !== "shirt_only")
      ) {
        toast.success("Đã cập nhật thông tin tham dự & size áo mới nhất!");
        onClose();
      } else {
        toast.success("Đã lưu đăng ký tham gia 15 năm! Mời bạn quét mã VietQR để hoàn tất.");
        setShowQrModal(true);
      }
    } catch (err: any) {
      toast.error(`Không thể lưu đăng ký: ${err?.message || "Vui lòng thử lại"}`);
    } finally {
      setSaving(false);
    }
  };

  // 3b. Không tham gia trực tiếp nhưng ĐĂNG KÝ NHẬN ÁO KỶ NIỆM 15 NĂM (250.000đ) -> Ghi DB + Manifest + Mở QR 250k
  const handleRegisterShirtOnly = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Vui lòng hoàn tất Họ tên và Số điện thoại ở Bước 1!");
      setActiveTab("info");
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error("Vui lòng nhập địa chỉ nhận ship áo kỷ niệm tận nơi!");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        ...buildProfilePayload(),
        attendance_status: "shirt_only",
        shirt_size: shirtSize,
        delivery_address: deliveryAddress.trim(),
        guests_count: 0,
      });

      if (guestbookMessage.trim()) {
        const trimmedWish = guestbookMessage.trim();
        try {
          await authFetch("/api/guestbook", {
            method: "POST",
            body: JSON.stringify({
              name: fullName.trim() || "Thành viên K33",
              className,
              message: trimmedWish,
            }),
          });
          broadcastDataUpdate("guestbook");
        } catch {}
      }

      try {
        await fetch("/api/zalo-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "registration",
            registrationType: "shirt_only",
            userId: user?.id,
            fullName: fullName.trim(),
            className,
            shirtSize,
            phone: phone.trim(),
            address: deliveryAddress.trim(),
            paidAmount: bankInfo.shirtOnlyAmount || 250000,
            guestsCount: 0,
          }),
        });
      } catch {}

      if (myRegistration?.status === "confirmed" && myRegistration?.registrationType === "shirt_only") {
        toast.success("Đã cập nhật size áo & địa chỉ ship áo kỷ niệm 15 năm!");
        onClose();
      } else {
        toast.success(
          `Đã lưu đăng ký nhận Áo kỷ niệm 15 năm (${bankInfo.shirtOnlyAmountText || "250.000 VNĐ"})! Mời bạn quét mã VietQR để hoàn tất.`
        );
        setShowQrModal(true);
      }
    } catch (err: any) {
      toast.error(`Không thể lưu đăng ký nhận áo: ${err?.message || "Vui lòng thử lại"}`);
    } finally {
      setSaving(false);
    }
  };

  // 4. Chọn không tham gia trực tiếp & không nhận áo -> Lưu vào DB gốc, gỡ khỏi danh sách & lưu lời chúc Cloud
  const handleDeclineAndSendWish = async () => {
    setSaving(true);
    try {
      await updateProfile({
        ...buildProfilePayload(),
        attendance_status: "not_attending",
        shirt_size: shirtSize,
        delivery_address: deliveryAddress.trim(),
        guests_count: 0,
      });

      if (guestbookMessage.trim()) {
        const trimmedWish = guestbookMessage.trim();
        try {
          await authFetch("/api/guestbook", {
            method: "POST",
            body: JSON.stringify({
              name: fullName.trim() || "Thành viên K33",
              className,
              message: trimmedWish,
            }),
          });
          broadcastDataUpdate("guestbook");
        } catch {}

        // Đẩy luôn lời nhắn lưu bút của thành viên không đi được sang nhóm Zalo
        try {
          await fetch("/api/zalo-bot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "guestbook",
              fromDecline: true,
              fullName: fullName.trim() || "Thành viên K33",
              className,
              message: trimmedWish,
              shirtSize: deliveryAddress.trim() ? shirtSize : "",
              deliveryAddress: deliveryAddress.trim(),
            }),
          });
        } catch {}
      }

      toast.success("Đã cập nhật trạng thái vào hệ thống. Cảm ơn bạn!");
      onClose();
    } catch (err: any) {
      toast.error(`Có lỗi xảy ra: ${err?.message || "Vui lòng thử lại"}`);
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

        {/* Header */}
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

        {/* 2 Tabs */}
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

        {/* TAB 1: THÔNG TIN CÁ NHÂN */}
        {activeTab === "info" && (
          <div className="space-y-3 animate-in fade-in duration-150">
            {/* Avatar Section */}
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

                  <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera size={16} className="text-ueh-gold mb-0.5" />
                    <span className="text-[9px] font-bold">Đổi ảnh</span>
                  </div>
                </div>

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
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold focus:border-ueh focus:outline-none"
                >
                  <option value="TC10">Lớp TC10 - K33 UEH</option>
                  <option value="TC11">Lớp TC11 - K33 UEH</option>
                  <option value="TC12">Lớp TC12 - K33 UEH</option>
                </select>
              </div>
            </div>

            {/* SĐT & Ngày sinh */}
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
                    Chọn nhanh tỉnh / thành phố:
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
                    Quốc gia / Thành phố sinh sống:
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
                    Đã kết hôn
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
                    Độc thân vui tính
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-700 mb-1.5">
                  <Baby size={13} className="text-emerald-600" /> Số con cái (F1)
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

            {/* Bio */}
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

            {/* Actions Tab 1 */}
            <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleSaveProfileOnly}
                disabled={saving}
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-98 transition-all disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu thông tin & Đóng"}
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

        {/* TAB 2: ĐĂNG KÝ CHƯƠNG TRÌNH GẶP MẶT 15 NĂM */}
        {activeTab === "attendance" && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            {/* Trạng thái hiện tại */}
            {attendanceStatus === "attending" && myRegistration?.status === "confirmed" && myRegistration?.registrationType !== "shirt_only" ? (
              <div className="flex items-center justify-between gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50/90 px-3 py-2 text-emerald-900 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div className="text-xs font-bold text-emerald-950 truncate">
                    {isFeeExemptMember ? "ĐÃ XÁC NHẬN (MIỄN PHÍ HỌP LỚP)" : "ĐÃ XÁC NHẬN THAM GIA"} • Áo: {myRegistration.shirtSize || shirtSize}
                    {(myRegistration.guestsCount || 0) > 0 ? ` • +${myRegistration.guestsCount} người thân` : ""}
                  </div>
                </div>
                <span className="rounded-md bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                  100% OK
                </span>
              </div>
            ) : attendanceStatus === "attending" && myRegistration?.status === "pending" && myRegistration?.registrationType !== "shirt_only" ? (
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
                      Size áo: {myRegistration?.shirtSize || shirtSize}
                      {(myRegistration?.guestsCount || 0) > 0 ? ` • +${myRegistration.guestsCount} người thân` : ""} • {bankInfo.amountText}
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
            ) : attendanceStatus === "not_attending" && myRegistration?.registrationType === "shirt_only" && myRegistration?.status === "confirmed" ? (
              <div className="flex items-center justify-between gap-2.5 rounded-xl border border-emerald-300 bg-emerald-50/90 px-3 py-2 text-emerald-900 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <div className="text-xs font-bold text-emerald-950 truncate">
                    ĐÃ XÁC NHẬN ĐẶT ÁO KỶ NIỆM ({bankInfo.shirtOnlyAmountText}) • Áo: {myRegistration.shirtSize || shirtSize}
                  </div>
                </div>
                <span className="rounded-md bg-emerald-200/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                  100% OK
                </span>
              </div>
            ) : attendanceStatus === "not_attending" && myRegistration?.registrationType === "shirt_only" && myRegistration?.status === "pending" ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 sm:p-3 text-amber-900 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ueh-orange text-white">
                    <Shirt size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-amber-950 truncate">
                      ĐÃ ĐĂNG KÝ NHẬN ÁO KỶ NIỆM • Chờ chuyển khoản
                    </div>
                    <div className="text-[10px] text-amber-800 truncate">
                      Size áo: {myRegistration?.shirtSize || shirtSize} • {bankInfo.shirtOnlyAmountText} (Ship tận nơi)
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWantShirtWhenAbsent(true);
                    setShowQrModal(true);
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-ueh transition-colors"
                >
                  <QrCode size={12} className="text-ueh-gold" />
                  <span>Mã QR</span>
                </button>
              </div>
            ) : attendanceStatus === "not_attending" ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-orange-300 bg-orange-50/80 px-3 py-2 text-xs text-orange-950 shadow-2xs">
                <span className="text-[11px] font-medium text-orange-900 truncate">
                  Trạng thái: <strong>Không tham gia trực tiếp</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setAttendanceStatus("attending")}
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
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      attendanceStatus === "attending"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {attendanceStatus === "attending" && <Check size={10} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Tôi sẽ tham gia</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Có mặt tại Cơ sở B UEH lúc 9:00 sáng 12/12/2026 • Kinh phí{" "}
                      <strong className="text-emerald-700">{bankInfo.amountText}</strong>.
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
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      attendanceStatus === "not_attending"
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {attendanceStatus === "not_attending" && <Check size={10} strokeWidth={3} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Rất tiếc không thể tham gia</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Vẫn có thể nhận Áo kỷ niệm 15 năm (
                      <strong className="text-ueh-orange">{bankInfo.shirtOnlyAmountText}</strong>) &amp; gửi lời chúc K33.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Nếu tham gia */}
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

                {/* Dẫn theo người thân (vợ/chồng, con cái...) */}
                <div className="rounded-xl border border-emerald-200 bg-white p-2.5 sm:p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-900">
                      <Users size={14} className="text-emerald-600" />
                      <span>Dẫn theo người thân (Vợ/Chồng, Con...)</span>
                    </div>
                    {bringGuests && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        +{guestsCount} người thân
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        guestsTouchedRef.current = true;
                        setBringGuests(false);
                      }}
                      className={`rounded-lg py-1.5 px-2 text-xs font-bold text-center border transition-all ${
                        !bringGuests
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Đi một mình
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        guestsTouchedRef.current = true;
                        setBringGuests(true);
                        if (guestsCount < 1) setGuestsCount(1);
                      }}
                      className={`rounded-lg py-1.5 px-2 text-xs font-bold text-center border transition-all ${
                        bringGuests
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50"
                      }`}
                    >
                      Có dẫn theo người thân
                    </button>
                  </div>

                  {bringGuests && (
                    <div className="pt-1.5 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-600">
                          Số lượng người thân đi cùng:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Giảm số người thân"
                            onClick={() => {
                              guestsTouchedRef.current = true;
                              setGuestsCount((prev) => Math.max(1, prev - 1));
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="min-w-[2.25rem] text-center text-sm font-black text-emerald-700">
                            {guestsCount}
                          </span>
                          <button
                            type="button"
                            aria-label="Tăng số người thân"
                            onClick={() => {
                              guestsTouchedRef.current = true;
                              setGuestsCount((prev) => Math.min(10, prev + 1));
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              guestsTouchedRef.current = true;
                              setGuestsCount(num);
                            }}
                            className={`rounded-lg py-1 text-[11px] font-bold border transition-all ${
                              guestsCount === num
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50"
                            }`}
                          >
                            +{num} người
                          </button>
                        ))}
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-snug">
                        Tổng số chỗ ngồi gia đình bạn: <strong className="text-emerald-700">{1 + guestsCount} người</strong> (bao gồm bạn và {guestsCount} người thân) để BLL sắp xếp bàn tiệc chu đáo.
                      </p>
                    </div>
                  )}
                </div>

                {/* Box Kinh phí & VietQR */}
                <div className="rounded-xl border border-emerald-300 bg-white p-2.5 sm:p-3 flex items-center justify-between shadow-2xs">
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Kinh phí tham dự</div>
                    <div className="text-sm sm:text-base font-black text-slate-900">
                      {isFeeExemptMember ? "Miễn phí (0 VNĐ)" : `${bankInfo.amountText} / thành viên`}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium">
                      {isFeeExemptMember
                        ? "Ưu đãi miễn chi phí họp lớp dành cho thành viên ở tỉnh xa • Bao gồm tiệc VIP & áo Polo"
                        : "Bao gồm tiệc VIP, áo Polo & kỷ yếu 15 năm"}
                    </div>
                  </div>
                  {!isFeeExemptMember && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setShowQrModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-ueh active:scale-98 transition-all shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <QrCode size={13} className="text-ueh-gold" /> Mã VietQR
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Nếu không tham gia */}
            {attendanceStatus === "not_attending" && (
              <div className="space-y-3 rounded-xl border border-orange-200/90 bg-orange-50/45 p-3">
                {/* Lựa chọn nhận Áo kỷ niệm 15 năm (250.000đ) hay chỉ gửi lời chúc */}
                <div className="rounded-xl border border-orange-200 bg-white p-2.5 sm:p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-orange-950">
                      <Shirt size={14} className="text-ueh-orange shrink-0" />
                      <span>Bạn có muốn nhận Áo Polo Kỷ Niệm 15 Năm?</span>
                    </div>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black text-ueh-orange shrink-0">
                      {bankInfo.shirtOnlyAmountText}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setWantShirtWhenAbsent(true)}
                      className={`rounded-lg py-2 px-2.5 text-xs font-bold text-center border transition-all cursor-pointer ${
                        wantShirtWhenAbsent
                          ? "bg-ueh-orange text-white border-ueh-orange shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-orange-50"
                      }`}
                    >
                      Có, nhận áo kỷ niệm ({bankInfo.shirtOnlyAmountText})
                    </button>
                    <button
                      type="button"
                      onClick={() => setWantShirtWhenAbsent(false)}
                      className={`rounded-lg py-2 px-2.5 text-xs font-bold text-center border transition-all cursor-pointer ${
                        !wantShirtWhenAbsent
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      Không nhận áo, chỉ gửi lời chúc
                    </button>
                  </div>
                </div>

                {/* Chọn size áo + Địa chỉ ship + Box chi phí 250.000đ & Mã VietQR */}
                {wantShirtWhenAbsent && (
                  <div className="space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-950 uppercase">
                        <Shirt size={14} className="text-ueh-orange" />
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
                              ? "bg-ueh-orange text-white border-ueh-orange shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-orange-50"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Địa chỉ nhận ship áo kỷ niệm tận nơi *
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="VD: Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP..."
                        className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                      />
                    </div>

                    {/* Box Chi phí Áo Kỷ Niệm 250.000đ & VietQR */}
                    <div className="rounded-xl border border-orange-300 bg-white p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <div className="text-[10px] text-orange-700 font-bold uppercase">
                          Chi phí Áo Kỷ Niệm 15 Năm
                        </div>
                        <div className="text-sm sm:text-base font-black text-slate-900">
                          {bankInfo.shirtOnlyAmountText} / áo
                        </div>
                        <div className="text-[10px] text-orange-700 font-medium">
                          Không tham dự tiệc • Bao gồm Áo Polo K33 kỷ niệm &amp; gửi ship tận nơi
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setShowQrModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-ueh-orange px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-orange-600 active:scale-98 transition-all shrink-0 disabled:opacity-50 cursor-pointer"
                      >
                        <QrCode size={13} className="text-amber-100" /> Mã VietQR
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-1 border-t border-orange-200/70 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-orange-900 uppercase">
                    <MessageSquare size={14} className="text-ueh-orange" />
                    <span>Gửi lời nhắn thân thương vào Sổ Lưu Bút K33 (tùy chọn)</span>
                  </div>
                  <textarea
                    rows={2}
                    value={guestbookMessage}
                    onChange={(e) => setGuestbookMessage(e.target.value)}
                    placeholder="VD: Chúc tập thể TC10, TC11, TC12 có buổi họp mặt 15 năm thật nhiều kỷ niệm và tiếng cười!..."
                    className="w-full rounded-xl border border-orange-200 bg-white p-2.5 text-xs focus:border-ueh focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Actions Tab 2 */}
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
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ueh to-ueh-light px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg hover:opacity-95 disabled:opacity-50 active:scale-98 transition-all cursor-pointer"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : myRegistration?.status === "confirmed" && myRegistration?.registrationType !== "shirt_only" ? (
                    <Save size={15} className="text-ueh-gold" />
                  ) : (
                    <QrCode size={15} className="text-ueh-gold" />
                  )}
                  <span>
                    {myRegistration?.status === "confirmed" && myRegistration?.registrationType !== "shirt_only"
                      ? "Lưu cập nhật thông tin"
                      : "Lưu & Đăng ký tham gia (Nhận mã QR)"}
                  </span>
                </button>
              ) : attendanceStatus === "not_attending" && wantShirtWhenAbsent ? (
                <button
                  type="button"
                  onClick={handleRegisterShirtOnly}
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ueh-orange to-amber-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : myRegistration?.status === "confirmed" && myRegistration?.registrationType === "shirt_only" ? (
                    <Save size={15} />
                  ) : (
                    <QrCode size={15} />
                  )}
                  <span>
                    {myRegistration?.status === "confirmed" && myRegistration?.registrationType === "shirt_only"
                      ? "Lưu cập nhật size & địa chỉ áo"
                      : `Lưu & Nhận áo kỷ niệm (QR ${bankInfo.shirtOnlyAmountText})`}
                  </span>
                </button>
              ) : attendanceStatus === "not_attending" ? (
                <button
                  type="button"
                  onClick={handleDeclineAndSendWish}
                  disabled={saving}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  <span>Lưu lựa chọn (Chỉ gửi lời chúc)</span>
                </button>
              ) : (
                <div className="w-full sm:w-auto text-center py-2 px-3 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
                  Vui lòng bấm chọn 1 trong 2 phương án ở trên
                </div>
              )}
            </div>
          </div>
        )}

        {/* POPUP BẢNG THÔNG SỐ SIZE ÁO POLO */}
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

        {/* POPUP VIETQR & SEPAY TỰ ĐỘNG XÁC MINH */}
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

              <div
                className={`flex h-11 w-11 mx-auto mb-2 items-center justify-center rounded-2xl text-white shadow-xs ${
                  isShirtOnlyMode ? "bg-ueh-orange" : "bg-ueh"
                }`}
              >
                {isShirtOnlyMode ? (
                  <Shirt size={22} className="text-amber-100" />
                ) : (
                  <QrCode size={22} className="text-ueh-gold" />
                )}
              </div>
              <div className="text-base font-black text-slate-900">
                {isShirtOnlyMode ? "Mã VietQR Nhận Áo Kỷ Niệm 15 Năm" : "Mã Chuyển Khoản VietQR"}
              </div>
              <div className="text-xs text-slate-500 mb-3">
                {isShirtOnlyMode
                  ? "Phí Áo Polo K33 kỷ niệm (không dự tiệc • gửi ship tận nơi)"
                  : "Phí tham dự Gặp mặt 15 năm (tiệc VIP, áo Polo & kỷ yếu)"}
              </div>

              <div
                className={`mx-auto w-52 overflow-hidden rounded-2xl border-2 bg-white p-2 shadow-sm ${
                  isShirtOnlyMode ? "border-orange-300" : "border-emerald-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="VietQR TCDN4" className="w-full h-auto rounded-lg" />
              </div>

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
                  <span className="text-slate-500">
                    {isShirtOnlyMode ? "Chi phí áo kỷ niệm:" : "Số tiền:"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-black ${
                        isShirtOnlyMode ? "text-ueh-orange" : "text-emerald-600"
                      }`}
                    >
                      {activeFeeText}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(String(activeFeeAmount), "amount", "Số tiền")}
                      className="p-1 rounded-md text-ueh hover:bg-blue-100"
                      title="Sao chép số tiền"
                    >
                      {copiedKey === "amount" ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div
                  className={`rounded-xl p-2.5 border mt-2 ${
                    isShirtOnlyMode
                      ? "bg-orange-50/90 border-orange-200"
                      : "bg-blue-50/90 border-blue-200"
                  }`}
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span
                      className={`text-[10px] uppercase font-bold ${
                        isShirtOnlyMode ? "text-ueh-orange" : "text-ueh"
                      }`}
                    >
                      {isShirtOnlyMode ? "Cú pháp CK đặt áo kỷ niệm:" : "Cú pháp chuyển khoản:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(transferSyntax, "syntax", "Cú pháp chuyển khoản")}
                      className={`text-[10px] font-bold flex items-center gap-1 hover:underline ${
                        isShirtOnlyMode ? "text-ueh-orange" : "text-ueh"
                      }`}
                    >
                      {copiedKey === "syntax" ? <CheckCheck size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>Sao chép</span>
                    </button>
                  </div>
                  <div
                    className={`font-mono text-xs font-bold break-all ${
                      isShirtOnlyMode ? "text-orange-950" : "text-ueh"
                    }`}
                  >
                    {transferSyntax}
                  </div>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-left flex items-start gap-2 shadow-2xs">
                <span className="relative flex h-2.5 w-2.5 mt-1 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="space-y-0.5">
                  <div className="font-bold text-emerald-950 flex items-center gap-1">
                    <span>Đối soát tự động qua SePay</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
                      Trực tiếp
                    </span>
                  </div>
                  <div className="text-[10.5px] text-emerald-800 leading-snug">
                    Hệ thống đang lắng nghe giao dịch 24/7 và sẽ tự động duyệt ngay khi tiền về tài khoản!
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  const targetStatus = isShirtOnlyMode ? "shirt_only" : "attending";
                  if (profile?.attendance_status !== targetStatus) {
                    if (isShirtOnlyMode) {
                      if (!deliveryAddress.trim()) {
                        setShowQrModal(false);
                        toast.error("Vui lòng nhập địa chỉ nhận ship áo rồi bấm Lưu & Nhận áo kỷ niệm!");
                        return;
                      }
                      await handleRegisterShirtOnly();
                      setShowQrModal(false);
                      onClose();
                      return;
                    }
                    await handleRegisterAttendance();
                    setShowQrModal(false);
                    onClose();
                    return;
                  }
                  setShowQrModal(false);
                  onClose();
                  toast.success("Cảm ơn bạn! Hệ thống SePay sẽ tự động cập nhật trạng thái khi giao dịch thành công.");
                }}
                className={`mt-3.5 w-full rounded-xl py-2.5 text-xs font-bold text-white transition-all shadow-md disabled:opacity-50 cursor-pointer ${
                  isShirtOnlyMode
                    ? "bg-ueh-orange hover:bg-orange-600"
                    : "bg-ueh hover:bg-ueh-light"
                }`}
              >
                {saving ? "Đang lưu..." : "Tôi đã chuyển khoản xong"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
