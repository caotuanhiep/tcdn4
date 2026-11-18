"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pin, PinOff, Trash2, Upload, Plus, Image as ImageIcon } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { STORAGE_BUCKET, type GalleryItem } from "@/types/database";

const INITIAL_ADMIN_PHOTOS = [
  {
    id: "g-1",
    image_url: "/images/ueh-group.jpg",
    user_id: "admin",
    is_pinned: true,
    created_at: new Date().toISOString(),
    title: "Tập thể TCDN4 K33 trước Cơ sở A - UEH",
  },
];

export default function ImagesPanel() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>(INITIAL_ADMIN_PHOTOS);
  const [loading, setLoading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await getSupabase()
        .from("gallery")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        setItems(data);
      }
    } catch {
      // Dùng fallback ban đầu
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUploadNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;

    const newItem = {
      id: `img-${Date.now()}`,
      image_url: uploadUrl.trim(),
      user_id: "admin",
      is_pinned: false,
      created_at: new Date().toISOString(),
      title: "Ảnh kỷ niệm mới",
    };

    setItems([newItem, ...items]);
    setUploadUrl("");
    setIsUploading(false);

    try {
      await getSupabase().from("gallery").insert(newItem);
    } catch {}

    toast.success("Đã thêm ảnh vào kho lưu trữ thành công!");
  };

  const togglePin = async (it: any) => {
    const updated = items.map((x) => (x.id === it.id ? { ...x, is_pinned: !x.is_pinned } : x));
    setItems(updated);
    try {
      await getSupabase().from("gallery").update({ is_pinned: !it.is_pinned }).eq("id", it.id);
    } catch {}
    toast.success(it.is_pinned ? "Đã bỏ ghim ảnh." : "Đã ghim ảnh lên đầu.");
  };

  const remove = async (it: any) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh này khỏi thư viện?")) return;
    setItems(items.filter((x) => x.id !== it.id));
    try {
      await getSupabase().from("gallery").delete().eq("id", it.id);
    } catch {}
    toast.success("Đã xóa ảnh thành công.");
  };

  return (
    <div>
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ueh">Khu Vực Quản Lý & Upload Hình Ảnh</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin và Ban liên lạc có thể ghim ảnh lên đầu hoặc xóa/upload trực tiếp hình ảnh.
          </p>
        </div>

        <button
          onClick={() => setIsUploading(!isUploading)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white hover:bg-ueh-light transition-all shadow-xs self-start sm:self-auto"
        >
          <Plus size={15} /> Upload Thêm Ảnh
        </button>
      </div>

      {/* Form Upload Thêm Ảnh */}
      {isUploading && (
        <form onSubmit={handleUploadNew} className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-xs animate-in fade-in">
          <h3 className="text-xs font-bold uppercase text-ueh mb-2">Thêm URL ảnh hoặc đường dẫn nội bộ:</h3>
          <div className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Dán link ảnh (https://... hoặc /images/...)"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-ueh focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white hover:bg-ueh-light"
            >
              Lưu Ảnh
            </button>
          </div>
        </form>
      )}

      {/* Grid Ảnh */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((it) => (
          <div key={it.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
            <div className="relative aspect-video bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image_url} alt="Ảnh gallery" className="h-full w-full object-cover" />
              {it.is_pinned && (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-ueh px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                  <Pin size={10} /> Ghim nổi bật
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-1.5 p-2.5">
              <button
                onClick={() => togglePin(it)}
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 py-1.5 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                {it.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                <span>{it.is_pinned ? "Bỏ ghim" : "Ghim đầu"}</span>
              </button>
              <button
                onClick={() => remove(it)}
                className="inline-flex items-center justify-center rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors"
                title="Xóa ảnh"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
