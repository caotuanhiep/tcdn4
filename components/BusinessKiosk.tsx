"use client";

import { useState } from "react";
import { 
  Store, 
  Tag, 
  Upload, 
  ExternalLink, 
  Coffee, 
  Armchair, 
  Globe2, 
  Megaphone,
  X,
  Users,
  Sparkles
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

interface Business {
  id: number;
  name: string;
  type: string;
  owner: string;
  discount: string;
  gradient: string;
}

const BUSINESS_ITEMS: Business[] = [
  {
    id: 1,
    name: "SMLIFE",
    type: "Nội thất thông minh & Bàn ghế Ergonomic",
    owner: "Nguyễn Văn An (TC10)",
    discount: "Giảm 15% cho Alumni K33",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    id: 2,
    name: "Bamos Coffee",
    type: "F&B - Chuỗi Cà phê Trải nghiệm 24/7",
    owner: "Trần Thị Bích (TC11)",
    discount: "Tặng 1 đồ uống khi check-in",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    id: 3,
    name: "Gowise",
    type: "eSIM Du lịch Quốc tế & Data Roaming",
    owner: "Lê Hoàng Cường (TC12)",
    discount: "Giảm 20% gói Data toàn cầu",
    gradient: "from-sky-500 to-cyan-500",
  },
  {
    id: 4,
    name: "Viwise",
    type: "Giải pháp Digital Marketing & SEO",
    owner: "Phạm Hải Đăng (TC10)",
    discount: "Free Audit Website & Tư vấn 1:1",
    gradient: "from-purple-500 to-indigo-500",
  },
];

export default function BusinessKiosk() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bizName, setBizName] = useState("");
  const [bizType, setBizType] = useState("");
  const [owner, setOwner] = useState("");
  const [discount, setDiscount] = useState("");

  const handleRegisterKiosk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim() || !owner.trim()) {
      toast.error("Vui lòng điền tên doanh nghiệp và người đại diện!");
      return;
    }
    toast.success("Đã ghi nhận thông tin đăng ký Kiosk! Ban liên lạc sẽ liên hệ duyệt hiển thị.");
    setIsModalOpen(false);
    setBizName("");
    setBizType("");
    setOwner("");
    setDiscount("");
  };

  return (
    <section id="business" className="scroll-mt-16 bg-slate-50 py-16 sm:py-24 border-t border-slate-200/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Header với Tiêu đề Cực To */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <Store size={14} className="text-blue-500" /> Hệ sinh thái cựu sinh viên
            </div>
            <h2 className="text-3xl font-black text-slate-900 sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              Kiosk Doanh Nghiệp
            </h2>
            <div className="mt-3 h-1.5 w-24 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
            <p className="mt-4 text-sm sm:text-base text-slate-500 max-w-xl">
              Ủng hộ các thương hiệu, sản phẩm và dịch vụ của anh chị em TCDN4 K33 với chính sách ưu đãi nội bộ độc quyền.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:border-ueh hover:text-ueh transition-all shadow-2xs self-start md:self-end hover:-translate-y-0.5"
          >
            <Upload size={15} /> Đăng ký gian hàng Kiosk
          </button>
        </div>

        {/* 7. Grid Kiosk: 2 CỘT TRÊN MOBILE theo yêu cầu số 7 */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-5 lg:grid-cols-4">
          {BUSINESS_ITEMS.map((biz) => (
            <div
              key={biz.id}
              className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br ${biz.gradient} text-white shadow-xs group-hover:scale-105 transition-transform`}>
                    <Store size={18} />
                  </div>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-rose-600 border border-rose-100 flex items-center gap-1">
                    <Tag size={10} /> Nội bộ
                  </span>
                </div>

                <h3 className="text-sm sm:text-lg font-black text-slate-900 group-hover:text-ueh transition-colors line-clamp-1">
                  {biz.name}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-2">
                  {biz.type}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 mb-2">
                  <Users size={12} className="shrink-0" />
                  <span className="truncate">{biz.owner}</span>
                </div>
                <div className="rounded-xl bg-blue-50/90 px-2.5 py-1.5 text-[10px] sm:text-xs font-bold text-ueh border border-blue-100 text-center leading-snug">
                  {biz.discount}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Modal đăng ký Kiosk Doanh nghiệp */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ueh text-white">
                <Store size={20} />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900">Đăng ký Kiosk Doanh Nghiệp</h3>
                <p className="text-xs text-slate-500">Giới thiệu sản phẩm & ưu đãi cho Alumni K33</p>
              </div>
            </div>

            <form onSubmit={handleRegisterKiosk} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên thương hiệu / Công ty:
                </label>
                <input
                  type="text"
                  placeholder="VD: SMLIFE, Bamos Coffee..."
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-ueh focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngành nghề / Sản phẩm kinh doanh:
                </label>
                <input
                  type="text"
                  placeholder="VD: F&B Cà phê, Nội thất, Dịch vụ..."
                  value={bizType}
                  onChange={(e) => setBizType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-ueh focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đại diện (Họ tên & Lớp):
                </label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A (TC10)"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-ueh focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chính sách ưu đãi nội bộ:
                </label>
                <input
                  type="text"
                  placeholder="VD: Giảm 20%, Tặng quà khi check-in..."
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-ueh focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-ueh py-3 text-xs sm:text-sm font-bold text-white hover:bg-ueh-light transition-colors shadow-md mt-2"
              >
                Gửi Đăng Ký Kiosk
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
