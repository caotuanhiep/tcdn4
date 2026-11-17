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
  Users
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
    type: "Giải pháp Digital Marketing & SEO Tổng thể",
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
    <section id="business" className="scroll-mt-16 bg-slate-50 py-16 border-t border-slate-200/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Subtle Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              <Store size={14} className="text-blue-500" /> Mục bổ sung
            </div>
            <h2 className="text-2xl font-black text-slate-800 sm:text-3xl tracking-tight">
              Kiosk Doanh Nghiệp Cựu Sinh Viên
            </h2>
            <p className="mt-1 text-sm text-slate-500 max-w-xl">
              Ủng hộ các thương hiệu, sản phẩm và dịch vụ của anh chị em TCDN4 K33 với chính sách ưu đãi nội bộ độc quyền.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-ueh hover:text-ueh transition-colors shadow-2xs self-start md:self-end"
          >
            <Upload size={14} /> Đăng ký gian hàng Kiosk
          </button>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BUSINESS_ITEMS.map((biz) => (
            <div
              key={biz.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${biz.gradient} text-white shadow-xs`}>
                    <Store size={20} />
                  </div>
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-100 flex items-center gap-1">
                    <Tag size={10} /> Nội bộ
                  </span>
                </div>

                <h3 className="text-lg font-black text-slate-900 group-hover:text-ueh transition-colors">
                  {biz.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {biz.type}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-2">
                  <Users size={12} /> {biz.owner}
                </div>
                <div className="rounded-xl bg-blue-50/80 px-3 py-1.5 text-xs font-bold text-ueh border border-blue-100">
                  {biz.discount}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Modal đăng ký Kiosk */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-black text-ueh mb-1 flex items-center gap-2">
              <Store size={20} className="text-blue-500" /> Đăng Ký Kiosk Doanh Nghiệp
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Dành riêng cho cựu sinh viên TCDN4 K33 muốn giới thiệu sản phẩm/dịch vụ của mình.
            </p>

            <form onSubmit={handleRegisterKiosk} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Tên Doanh Nghiệp / Thương hiệu *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cửa hàng ABC, Công ty XYZ..."
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Ngành nghề & Lĩnh vực hoạt động
                </label>
                <input
                  type="text"
                  placeholder="VD: F&B, Logistics, Nội thất..."
                  value={bizType}
                  onChange={(e) => setBizType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Người đại diện (Họ tên & Lớp) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn A (TC10)"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Chính sách ưu đãi dành cho Alumni K33
                </label>
                <input
                  type="text"
                  placeholder="VD: Giảm giá 20%, tặng quà kèm theo..."
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-ueh px-5 py-2 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Gửi Đăng Ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}
