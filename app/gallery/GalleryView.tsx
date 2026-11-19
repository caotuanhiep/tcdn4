"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pin, Upload } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import UploadModal from "./UploadModal";
import type { GalleryItem } from "@/types/database";

export default function GalleryView() {
  const { user, openLogin } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("gallery")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(`Không tải được ảnh: ${error.message}`);
    else setItems((data ?? []) as GalleryItem[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="mb-2 text-3xl font-extrabold text-ueh md:text-4xl">Góc ký ức</h1>
          <p className="text-slate-500">Cùng xây dựng thư viện ảnh 15 năm. Mỗi bức ảnh là một mảnh ghép thanh xuân.</p>
        </div>
        <button
          onClick={() => {
            if (!user) {
              toast.error("Vui lòng đăng nhập để đóng góp ảnh!");
              openLogin();
              return;
            }
            setUploadOpen(true);
          }}
          className="flex items-center justify-center gap-2 rounded-full bg-ueh px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-800"
        >
          <Upload size={18} /> Đóng góp ảnh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-ueh">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-20 text-center text-slate-500">Chưa có ảnh nào. Hãy là người đầu tiên đóng góp!</p>
      ) : (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {items.map((it) => (
            <figure key={it.id} className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-slate-200 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.image_url}
                alt="Ảnh kỷ niệm TCDN4"
                loading="lazy"
                className="w-full transition-transform duration-300 group-hover:scale-105"
              />
              {it.is_pinned && (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-ueh px-2.5 py-1 text-xs font-bold text-white shadow">
                  <Pin size={12} /> Nổi bật
                </span>
              )}
            </figure>
          ))}
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={() => {
            setUploadOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
