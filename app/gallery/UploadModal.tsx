"use client";

import { useEffect, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { STORAGE_BUCKET } from "@/types/database";

const MAX_SIZE = 15 * 1024 * 1024;

async function compressImage(file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === "image/png" ? "image/webp" : (file.type || "image/jpeg");
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              const newName = file.name.replace(/\.[^/.]+$/, "") + (outputType === "image/webp" ? ".webp" : ".jpg");
              resolve(new File([blob], newName, { type: outputType }));
            }
          },
          outputType,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export default function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Vui lòng chọn file ảnh (JPG, PNG, WebP).");
    if (f.size > MAX_SIZE) return toast.error("Ảnh vượt quá 15MB.");
    setFile(f);
  }

  async function submit() {
    if (!file || !user) return;
    setBusy(true);
    try {
      const uploadFile = await compressImage(file);
      const supabase = getSupabase();
      const ext = (uploadFile.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, uploadFile, {
        contentType: uploadFile.type,
        upsert: false,
      });
      if (upErr) {
        toast.error(`Upload thất bại: ${upErr.message}`);
        setBusy(false);
        return;
      }

      const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      const { error: insErr } = await supabase
        .from("gallery")
        .insert({ image_url: pub.publicUrl, user_id: user.id, is_pinned: false });
      if (insErr) {
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        toast.error(`Không lưu được ảnh: ${insErr.message}`);
        setBusy(false);
        return;
      }

      toast.success("Cảm ơn bạn đã đóng góp ảnh!");
      setBusy(false);
      onUploaded();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message || "Vui lòng thử lại"}`);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={busy ? undefined : onClose}>
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} disabled={busy} aria-label="Đóng" className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200">
          <X size={18} />
        </button>
        <h3 className="mb-1 text-xl font-extrabold text-slate-900">Đóng góp ảnh</h3>
        <p className="mb-5 text-sm text-slate-500">Hỗ trợ JPG, PNG, WebP (tối đa 5MB).</p>

        <label className="flex h-56 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-ueh">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Xem trước" className="h-full w-full object-contain" />
          ) : (
            <>
              <ImageIcon size={32} className="mb-2" />
              <span className="font-medium">Chọn ảnh từ thiết bị</span>
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>

        <button
          onClick={submit}
          disabled={!file || busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ueh py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          {busy ? "Đang tải lên..." : "Tải lên"}
        </button>
      </div>
    </div>
  );
}
