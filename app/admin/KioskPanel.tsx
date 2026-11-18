"use client";

import { useState, useEffect } from "react";
import { 
  Store, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Phone, 
  Tag, 
  Globe, 
  Users,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { KioskItem, DEFAULT_KIOSK_ITEMS, getKioskItems, saveKioskItems } from "@/lib/kiosk";

export default function KioskPanel() {
  const toast = useToast();
  const [items, setItems] = useState<KioskItem[]>(DEFAULT_KIOSK_ITEMS);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<Partial<KioskItem>>({});

  useEffect(() => {
    setItems(getKioskItems());
  }, []);

  const handleOpenAdd = () => {
    setCurrentItem({
      id: Date.now(),
      name: "",
      type: "Dịch vụ & Sản phẩm",
      owner: "",
      phone: "",
      discount: "Ưu đãi đặc biệt cho K33",
      gradient: "from-blue-600 to-indigo-600",
      link: "",
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (item: KioskItem) => {
    setCurrentItem({ ...item });
    setIsEditing(true);
  };

  const handleDelete = (id: string | number) => {
    if (confirm("Bạn có chắc chắn muốn xóa gian hàng Kiosk này không?")) {
      const updated = items.filter((i) => i.id !== id);
      setItems(updated);
      saveKioskItems(updated);
      toast.success("Đã xóa gian hàng Kiosk!");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem.name?.trim() || !currentItem.owner?.trim()) {
      toast.error("Vui lòng nhập tên thương hiệu và người đại diện!");
      return;
    }

    const itemToSave = currentItem as KioskItem;
    const exists = items.some((i) => i.id === itemToSave.id);
    let updated: KioskItem[];

    if (exists) {
      updated = items.map((i) => (i.id === itemToSave.id ? itemToSave : i));
      toast.success("Đã cập nhật thông tin Kiosk!");
    } else {
      updated = [...items, itemToSave];
      toast.success("Đã thêm mới Kiosk thành công!");
    }

    setItems(updated);
    saveKioskItems(updated);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-ueh flex items-center gap-2">
            <Store className="text-ueh-orange" /> Quản lý Kiosk Doanh Nghiệp
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Thiết lập các gian hàng doanh nghiệp của cựu sinh viên, sản phẩm dịch vụ và ưu đãi nội bộ K33.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-ueh-light transition-all"
        >
          <Plus size={16} /> Thêm gian hàng Kiosk
        </button>
      </div>

      {/* Grid Kiosk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br ${item.gradient || "from-blue-600 to-indigo-600"} text-white flex items-center justify-center font-bold text-base shadow-xs overflow-hidden`}>
                    {item.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.logoUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <Store size={18} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 line-clamp-1">{item.name}</h4>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{item.type}</span>
                  </div>
                </div>
                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-600 border border-rose-100 shrink-0">
                  Nội bộ K33
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl mb-3">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-semibold flex items-center gap-1">
                    <Users size={12} className="text-slate-400" /> {item.owner}
                  </span>
                  {item.phone && (
                    <span className="text-[11px] text-slate-500 font-mono">{item.phone}</span>
                  )}
                </div>
                <div className="text-[11px] font-bold text-ueh bg-blue-50/80 px-2 py-1 rounded-lg border border-blue-100/60 mt-1">
                  🎁 {item.discount}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mr-auto"
                >
                  <ExternalLink size={12} /> Xem link
                </a>
              )}
              <button
                onClick={() => handleOpenEdit(item)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                <Edit3 size={13} /> Sửa
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
              >
                <Trash2 size={13} /> Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Chỉnh Sửa / Thêm Mới Kiosk */}
      {isEditing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsEditing(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-black text-ueh mb-1">
              {items.some((i) => i.id === currentItem.id) ? "Chỉnh sửa Kiosk Doanh Nghiệp" : "Thêm mới Kiosk Doanh Nghiệp"}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Cập nhật thông tin gian hàng để quảng bá đến toàn thể anh chị em K33.
            </p>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên Doanh nghiệp / Thương hiệu</label>
                  <input
                    type="text"
                    required
                    value={currentItem.name || ""}
                    onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    placeholder="VD: SMLIFE, Bamos Coffee"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngành nghề / Sản phẩm</label>
                  <input
                    type="text"
                    value={currentItem.type || ""}
                    onChange={(e) => setCurrentItem({ ...currentItem, type: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    placeholder="VD: Nội thất thông minh, F&B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Người đại diện (Kèm lớp)</label>
                  <input
                    type="text"
                    required
                    value={currentItem.owner || ""}
                    onChange={(e) => setCurrentItem({ ...currentItem, owner: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    placeholder="VD: Nguyễn Văn An (TC10)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại / Zalo</label>
                  <input
                    type="text"
                    value={currentItem.phone || ""}
                    onChange={(e) => setCurrentItem({ ...currentItem, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                    placeholder="VD: 0903 123 456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chính sách ưu đãi nội bộ K33</label>
                <input
                  type="text"
                  required
                  value={currentItem.discount || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, discount: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  placeholder="VD: Giảm 15% cho Alumni K33, Free tư vấn 1:1"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Website hoặc Fanpage Link</label>
                <input
                  type="text"
                  value={currentItem.link || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, link: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Logo URL (Tùy chọn)</label>
                <input
                  type="text"
                  value={currentItem.logoUrl || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, logoUrl: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                  placeholder="https://... hoặc /images/..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-5 py-2 text-xs font-bold text-white hover:bg-ueh-light"
                >
                  <Save size={14} /> Lưu gian hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
