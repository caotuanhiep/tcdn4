"use client";

import { useState } from "react";
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
  Cake
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
];

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, profile, updateProfile } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [className, setClassName] = useState(profile?.class_name || "TC10");
  const [jobTitle, setJobTitle] = useState(profile?.job_title || "");
  const [company, setCompany] = useState(profile?.company || "");
  const [location, setLocation] = useState(profile?.location_region || "hcm");
  const [birthday, setBirthday] = useState(profile?.birthday || "1989-11-20");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Vui lòng nhập họ tên của bạn!");
      return;
    }
    setSaving(true);
    await updateProfile({
      full_name: fullName.trim(),
      class_name: className,
      job_title: jobTitle.trim(),
      company: company.trim(),
      location_region: location,
      birthday: birthday,
      phone: phone.trim(),
      avatar_url: avatarUrl,
    });
    setSaving(false);
    toast.success("Cập nhật thông tin cá nhân thành công!");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-6 text-center">
          <h3 className="text-xl font-black text-ueh sm:text-2xl">
            Hồ Sơ Cựu Sinh Viên
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Cập nhật thông tin và ngày sinh để nhận lời chúc từ bạn bè cùng khóa
          </p>
        </div>

        {/* Avatar Section */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative mb-3">
            <div className="h-20 w-20 overflow-hidden rounded-full ring-4 ring-blue-100 shadow-md bg-gradient-to-br from-blue-600 to-ueh flex items-center justify-center text-white font-black text-2xl">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                fullName.trim().charAt(0) || "A"
              )}
            </div>
          </div>

          {/* Quick Preset Avatars */}
          <div className="flex items-center gap-2">
            {PRESET_AVATARS.map((src, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setAvatarUrl(src)}
                className={`h-8 w-8 overflow-hidden rounded-full ring-2 transition-transform hover:scale-110 ${
                  avatarUrl === src ? "ring-ueh scale-110" : "ring-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="avatar option" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Chọn ảnh đại diện có sẵn</span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
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
                placeholder="VD: Nguyễn Văn Nam"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none focus:ring-1 focus:ring-ueh"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Lớp sinh viên
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
              >
                <option value="TC10">Lớp TC10 - K33 UEH</option>
                <option value="TC11">Lớp TC11 - K33 UEH</option>
                <option value="TC12">Lớp TC12 - K33 UEH</option>
              </select>
            </div>
          </div>

          {/* Birthday Field */}
          <div className="rounded-2xl border border-pink-200 bg-pink-50/60 p-3.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase text-pink-700 mb-1">
              <Cake size={14} className="text-pink-600" /> Ngày sinh nhật của bạn
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full rounded-xl border border-pink-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-pink-500 focus:outline-none"
            />
            <p className="text-[11px] text-pink-600/80 mt-1">
              🎂 Hệ thống sẽ tự động hiển thị lời chúc sinh nhật trên trang chủ khi đến ngày của bạn!
            </p>
          </div>

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
                Công ty / Cơ quan
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="VD: VinaCapital, Big4..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Khu vực sinh sống
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
              >
                <option value="hcm">TP. Hồ Chí Minh</option>
                <option value="hn">Hà Nội</option>
                <option value="dn">Đà Nẵng & Miền Trung</option>
                <option value="overseas">Nước ngoài (Mỹ, Úc, Sing...)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Số điện thoại / Zalo
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0903123456"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-ueh focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
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
              className="flex items-center gap-1.5 rounded-xl bg-ueh px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-800 disabled:opacity-50"
            >
              <Check size={14} /> {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
