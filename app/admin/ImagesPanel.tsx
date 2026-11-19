"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pin, PinOff, Trash2, Upload, Plus, Image as ImageIcon } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";

const MEMORIES_STORAGE_KEY = "tcdn4_memories_gallery";

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
  const [photoTitle, setPhotoTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const load = useCallback(async () => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    // 1. Tải ảnh từ Góc Kỷ Niệm (tcdn4_memories_gallery do thành viên đóng góp)
    try {
      const stored = localStorage.getItem(MEMORIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            list.push({
              id: p.id,
              image_url: p.imgSrc || p.image_url,
              user_id: p.uploader || "Thành viên",
              is_pinned: !!p.isPinned,
              created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
              title: p.title || "Ảnh kỷ niệm",
              source: "memories",
            });
            seenIds.add(p.id);
          });
        }
      }
    } catch {}

    // 2. Tải ảnh từ Supabase gallery
    try {
      const { data, error } = await getSupabase()
        .from("gallery")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        data.forEach((d: any) => {
          if (!seenIds.has(d.id)) {
            list.push({ ...d, source: "supabase" });
            seenIds.add(d.id);
          }
        });
      }
    } catch {}

    if (list.length === 0) {
      setItems(INITIAL_ADMIN_PHOTOS);
    } else {
      list.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setItems(list);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener("storage", load);
    window.addEventListener("tcdn4_memories_updated", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("tcdn4_memories_updated", load);
    };
  }, [load]);

  const handleUploadNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadUrl.trim()) return;

    const newId = `img-${Date.now()}`;
    const title = photoTitle.trim() || "Ảnh kỷ niệm mới";
    const newItem = {
      id: newId,
      image_url: uploadUrl.trim(),
      user_id: "Ban liên lạc (Admin)",
      is_pinned: false,
      created_at: new Date().toISOString(),
      title,
      source: "memories",
    };

    setItems([newItem, ...items]);
    setUploadUrl("");
    setPhotoTitle("");
    setIsUploading(false);

    // Thêm vào memories gallery trong localStorage
    try {
      const stored = localStorage.getItem(MEMORIES_STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [];
      list.unshift({
        id: newId,
        title,
        imgSrc: uploadUrl.trim(),
        type: "image",
        category: "Kỷ niệm",
        likes: 1,
        comments: [],
        uploader: "Ban liên lạc (Admin)",
        uploaderClass: "TC10",
        createdAt: Date.now(),
        isPinned: false,
      });
      localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event("tcdn4_memories_updated"));
    } catch {}

    // Thử thêm vào Supabase nếu bảng gallery sẵn sàng
    try {
      await getSupabase().from("gallery").insert({
        id: newId,
        image_url: uploadUrl.trim(),
        user_id: "admin",
        is_pinned: false,
        created_at: new Date().toISOString(),
        title,
      });
    } catch {}

    toast.success("Đã thêm ảnh vào kho lưu trữ thành công!");
  };

  const togglePin = async (it: any) => {
    const nextPinned = !it.is_pinned;
    const updated = items.map((x) => (x.id === it.id ? { ...x, is_pinned: nextPinned } : x));
    setItems(updated);

    // Cập nhật vào memories localStorage
    try {
      const stored = localStorage.getItem(MEMORIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const nextMemories = parsed.map((p: any) =>
            p.id === it.id ? { ...p, isPinned: nextPinned } : p
          );
          localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(nextMemories));
          window.dispatchEvent(new Event("tcdn4_memories_updated"));
        }
      }
    } catch {}

    // Cập nhật Supabase
    try {
      await getSupabase().from("gallery").update({ is_pinned: nextPinned }).eq("id", it.id);
    } catch {}

    toast.success(nextPinned ? "Đã ghim ảnh lên đầu." : "Đã bỏ ghim ảnh.");
  };

  const remove = async (it: any) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh này khỏi thư viện?")) return;
    const updated = items.filter((x) => x.id !== it.id);
    setItems(updated);

    // Xóa trong memories localStorage
    try {
      const stored = localStorage.getItem(MEMORIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const nextMemories = parsed.filter((p: any) => p.id !== it.id);
          localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(nextMemories));
          window.dispatchEvent(new Event("tcdn4_memories_updated"));
        }
      }
    } catch {}

    // Xóa trong Supabase
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
            Admin và Ban liên lạc có thể xem toàn bộ ảnh thành viên đóng góp, ghim ảnh lên đầu hoặc xóa/upload trực tiếp hình ảnh.
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
        <form onSubmit={handleUploadNew} className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-xs animate-in fade-in space-y-3">
          <h3 className="text-xs font-bold uppercase text-ueh">Thêm ảnh vào thư viện kỷ niệm:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Dán link ảnh (https://... hoặc /images/...)"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-ueh focus:outline-none"
            />
            <input
              type="text"
              placeholder="Tiêu đề ảnh (VD: Kỷ niệm Cơ sở B...)"
              value={photoTitle}
              onChange={(e) => setPhotoTitle(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-ueh focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-ueh px-5 py-1.5 text-xs font-bold text-white hover:bg-ueh-light shadow-xs"
            >
              Lưu Ảnh
            </button>
          </div>
        </form>
      )}

      {/* Grid Ảnh */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((it) => (
          <div key={it.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between">
            <div>
              <div className="relative aspect-video bg-slate-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.image_url} alt="Ảnh gallery" className="h-full w-full object-cover" />
                {it.is_pinned && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-ueh px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    <Pin size={10} /> Ghim nổi bật
                  </span>
                )}
              </div>
              <div className="p-2.5 pb-1">
                <p className="text-xs font-bold text-slate-800 truncate" title={it.title}>{it.title || "Ảnh kỷ niệm"}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Đăng bởi: {it.user_id || "Thành viên"}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-1.5 p-2.5 pt-1 border-t border-slate-100">
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
