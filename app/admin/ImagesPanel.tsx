"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pin, PinOff, Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";
import { STORAGE_BUCKET, type GalleryItem } from "@/types/database";

function storagePath(url: string) {
  const marker = `/${STORAGE_BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

export default function ImagesPanel() {
  const toast = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("gallery")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(`Không tải được ảnh: ${error.message}`);
    else setItems((data ?? []) as GalleryItem[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function togglePin(it: GalleryItem) {
    setBusyId(it.id);
    const { error } = await getSupabase().from("gallery").update({ is_pinned: !it.is_pinned }).eq("id", it.id);
    if (error) toast.error(`Lỗi: ${error.message}`);
    else {
      toast.success(it.is_pinned ? "Đã bỏ ghim ảnh." : "Đã ghim ảnh.");
      await load();
    }
    setBusyId(null);
  }

  async function remove(it: GalleryItem) {
    if (!window.confirm("Xóa ảnh này vĩnh viễn?")) return;
    setBusyId(it.id);
    const supabase = getSupabase();
    const { error } = await supabase.from("gallery").delete().eq("id", it.id);
    if (error) {
      toast.error(`Không xóa được: ${error.message}`);
    } else {
      const path = storagePath(it.image_url);
      if (path) await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      toast.success("Đã xóa ảnh.");
      setItems((prev) => prev.filter((x) => x.id !== it.id));
    }
    setBusyId(null);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-ueh">Quản lý hình ảnh</h1>
      <p className="mb-6 text-sm text-slate-500">{items.length} ảnh - ảnh ghim hiển thị đầu thư viện.</p>

      {loading ? (
        <div className="flex justify-center py-20 text-ueh">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-20 text-center text-slate-500">Chưa có ảnh nào.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => (
            <div key={it.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="relative aspect-square bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.image_url} alt="Ảnh gallery" loading="lazy" className="h-full w-full object-cover" />
                {it.is_pinned && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-ueh px-2 py-0.5 text-[11px] font-bold text-white">
                    <Pin size={11} /> Ghim
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5">
                <button
                  onClick={() => togglePin(it)}
                  disabled={busyId === it.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-50 py-2 text-xs font-semibold text-ueh transition hover:bg-blue-50 disabled:opacity-50"
                >
                  {busyId === it.id ? <Loader2 size={14} className="animate-spin" /> : it.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {it.is_pinned ? "Bỏ ghim" : "Ghim"}
                </button>
                <button
                  onClick={() => remove(it)}
                  disabled={busyId === it.id}
                  aria-label="Xóa ảnh"
                  className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
