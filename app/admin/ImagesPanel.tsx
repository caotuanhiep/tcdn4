"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { Loader2, Pin, PinOff, Trash2, Upload, Plus, Image as ImageIcon, Link2, CheckCircle2, FolderHeart, Tag } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ToastProvider";

const MEMORIES_STORAGE_KEY = "tcdn4_memories_gallery";

export const DEFAULT_TOPICS = [
  "Thời sinh viên",
  "Cuộc sống hiện tại",
  "Dã ngoại & du lịch",
  "Họp lớp, hẹn hò",
  "Hội ngộ 15 năm (2026)",
  "Chưa phân loại",
];

const INITIAL_ADMIN_PHOTOS = [
  {
    id: "g-1",
    image_url: "/images/ueh-group.jpg",
    user_id: "admin",
    is_pinned: true,
    created_at: new Date().toISOString(),
    title: "Tập thể TCDN4 K33 trước Cơ sở B - UEH",
    topic: "Thời sinh viên",
    category: "Thời sinh viên",
  },
];

export default function ImagesPanel() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>(INITIAL_ADMIN_PHOTOS);
  const [loading, setLoading] = useState(false);
  
  // Topic Filter & Upload Topic
  const [selectedFilterTopic, setSelectedFilterTopic] = useState("all");
  const [uploadTopic, setUploadTopic] = useState("Thời sinh viên");
  const [isCustomTopic, setIsCustomTopic] = useState(false);
  const [customTopicName, setCustomTopicName] = useState("");

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [uploadUrl, setUploadUrl] = useState("");
  const [photoTitle, setPhotoTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadingToSupabase, setUploadingToSupabase] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    // 1. Tải ảnh đồng bộ từ API Cloud (/api/gallery) lưu trên Supabase Storage
    try {
      const res = await fetch("/api/gallery");
      if (res.ok) {
        const data = await res.json();
        if (data.photos && Array.isArray(data.photos)) {
          data.photos.forEach((p: any) => {
            let topic = p.topic || p.category || "Chưa phân loại";
            if (topic === "Kỷ niệm" || !topic) topic = "Chưa phân loại";
            list.push({
              id: p.id,
              image_url: p.imgSrc || p.image_url,
              user_id: p.uploader || "Ban liên lạc (Admin)",
              is_pinned: !!p.isPinned,
              created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
              title: p.title || "Ảnh kỷ niệm",
              topic: topic,
              category: topic,
              source: "supabase",
            });
            seenIds.add(p.id);
          });
        }
      }
    } catch (err) {
      console.warn("Lỗi tải ảnh từ /api/gallery:", err);
    }

    // 2. Kết hợp với ảnh trong localStorage nếu có
    try {
      const stored = localStorage.getItem(MEMORIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            if (!seenIds.has(p.id)) {
              let topic = p.topic || p.category || "Chưa phân loại";
              if (topic === "Kỷ niệm" || !topic) topic = "Chưa phân loại";
              list.push({
                id: p.id,
                image_url: p.imgSrc || p.image_url,
                user_id: p.uploader || "Thành viên",
                is_pinned: !!p.isPinned,
                created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
                title: p.title || "Ảnh kỷ niệm",
                topic: topic,
                category: topic,
                source: "memories",
              });
              seenIds.add(p.id);
            }
          });
        }
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

  const allAvailableTopics = useMemo(() => {
    const set = new Set<string>(DEFAULT_TOPICS);
    items.forEach((it) => {
      if (it.topic && it.topic !== "all") set.add(it.topic);
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedFilterTopic === "all") return items;
    return items.filter((it) => it.topic === selectedFilterTopic);
  }, [items, selectedFilterTopic]);

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setSelectedFiles(files);

    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);

    if (!photoTitle && files.length === 1) {
      setPhotoTitle(files[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUploadNew = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalTopic = isCustomTopic && customTopicName.trim() ? customTopicName.trim() : uploadTopic;

    if (uploadMode === "file") {
      if (selectedFiles.length === 0) {
        toast.error("Vui lòng chọn ít nhất 1 tệp ảnh từ thiết bị!");
        return;
      }

      setUploadingToSupabase(true);
      try {
        const formData = new FormData();
        selectedFiles.forEach((f) => formData.append("files", f));
        formData.append("topic", finalTopic);
        formData.append("uploader", "Ban liên lạc (Admin)");
        formData.append("uploaderClass", "TC10");
        if (photoTitle.trim()) {
          formData.append("title", photoTitle.trim());
        }

        const res = await fetch("/api/gallery", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || "Không thể lưu ảnh lên Cloud");
        }

        const addedItems = (result.addedPhotos || []).map((p: any) => ({
          id: p.id,
          image_url: p.imgSrc,
          user_id: p.uploader,
          is_pinned: !!p.isPinned,
          created_at: new Date(p.createdAt || Date.now()).toISOString(),
          title: p.title,
          topic: p.topic,
          category: p.category,
          source: "supabase",
        }));

        // Đồng bộ vào memories gallery localStorage để các tab mở sẵn cũng thấy ngay
        try {
          const stored = localStorage.getItem(MEMORIES_STORAGE_KEY);
          const list = stored ? JSON.parse(stored) : [];
          localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify([...(result.addedPhotos || []), ...list]));
          window.dispatchEvent(new Event("tcdn4_memories_updated"));
        } catch {}

        setItems((prev) => [...addedItems, ...prev]);
        setSelectedFiles([]);
        setPreviewUrls([]);
        setPhotoTitle("");
        setIsCustomTopic(false);
        setCustomTopicName("");
        setIsUploading(false);
        toast.success(`Đã upload ${addedItems.length} ảnh vào bộ "${finalTopic}" lên Cloud thành công!`);
      } catch (err: any) {
        toast.error(`Lỗi khi tải ảnh: ${err.message || "Vui lòng thử lại"}`);
      } finally {
        setUploadingToSupabase(false);
      }
    } else {
      // Mode URL
      if (!uploadUrl.trim()) {
        toast.error("Vui lòng nhập link ảnh!");
        return;
      }

      const newId = `img-${Date.now()}`;
      const title = photoTitle.trim() || "Ảnh kỷ niệm mới";
      const newPhotoObj = {
        id: newId,
        title,
        imgSrc: uploadUrl.trim(),
        type: "image",
        category: finalTopic,
        topic: finalTopic,
        likes: 1,
        comments: [],
        uploader: "Ban liên lạc (Admin)",
        uploaderClass: "TC10",
        createdAt: Date.now(),
        isPinned: false,
      };

      try {
        await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", photo: newPhotoObj }),
        });
      } catch {}

      const newItem = {
        id: newId,
        image_url: uploadUrl.trim(),
        user_id: "Ban liên lạc (Admin)",
        is_pinned: false,
        created_at: new Date().toISOString(),
        title,
        topic: finalTopic,
        category: finalTopic,
        source: "supabase",
      };

      setItems([newItem, ...items]);
      setUploadUrl("");
      setPhotoTitle("");
      setIsCustomTopic(false);
      setCustomTopicName("");
      setIsUploading(false);

      // Thêm vào memories gallery trong localStorage
      try {
        const stored = localStorage.getItem(MEMORIES_STORAGE_KEY);
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(newPhotoObj);
        localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new Event("tcdn4_memories_updated"));
      } catch {}

      toast.success(`Đã thêm ảnh vào bộ "${finalTopic}" thành công!`);
    }
  };

  const togglePin = async (it: any) => {
    const nextPinned = !it.is_pinned;
    const updated = items.map((x) => (x.id === it.id ? { ...x, is_pinned: nextPinned } : x));
    setItems(updated);

    try {
      await fetch("/api/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: it.id, isPinned: nextPinned }),
      });
    } catch {}

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

    toast.success(nextPinned ? "Đã ghim ảnh lên đầu." : "Đã bỏ ghim ảnh.");
  };

  const remove = async (it: any) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa ảnh này khỏi thư viện?")) return;
    const updated = items.filter((x) => x.id !== it.id);
    setItems(updated);

    try {
      await fetch(`/api/gallery?id=${it.id}`, { method: "DELETE" });
    } catch {}

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

    toast.success("Đã xóa ảnh thành công.");
  };

  return (
    <div>
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ueh">Khu Vực Quản Lý & Upload Hình Ảnh</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin có thể chủ động tải ảnh trực tiếp từ máy / điện thoại lưu lên Supabase Storage hoặc xem và ghim ảnh thành viên đóng góp.
          </p>
        </div>

        <button
          onClick={() => setIsUploading(!isUploading)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white hover:bg-ueh-light transition-all shadow-xs self-start sm:self-auto"
        >
          <Plus size={15} /> Upload Thêm Ảnh Mới
        </button>
      </div>

      {/* Form Upload Thêm Ảnh Chủ Động */}
      {isUploading && (
        <form onSubmit={handleUploadNew} className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/50 p-4 sm:p-5 shadow-md animate-in fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
            <h3 className="text-xs sm:text-sm font-bold uppercase text-ueh flex items-center gap-1.5">
              <Upload size={16} className="text-ueh-orange" /> Upload ảnh lưu trữ lên Supabase
            </h3>
            
            {/* Chuyển chế độ File / URL */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-blue-200/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setUploadMode("file")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  uploadMode === "file" ? "bg-ueh text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ImageIcon size={13} /> Tải từ máy
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("url")}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  uploadMode === "url" ? "bg-ueh text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Link2 size={13} /> Dán link URL
              </button>
            </div>
          </div>

          {uploadMode === "file" ? (
            <div>
              {/* Drag & drop or Click file picker */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-blue-300 rounded-2xl bg-white/80 p-6 text-center hover:bg-blue-50/50 hover:border-ueh transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesSelect}
                  className="hidden"
                />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100/70 text-ueh group-hover:scale-110 transition-transform">
                  <Upload size={22} />
                </div>
                <p className="mt-2 text-xs sm:text-sm font-bold text-slate-700">
                  Nhấn để chọn ảnh từ máy / điện thoại (Hỗ trợ chọn nhiều ảnh)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Định dạng PNG, JPG, WebP — Tự động lưu lên Supabase Storage bucket <code>alumni-media</code>
                </p>
              </div>

              {/* Preview thumbnails */}
              {previewUrls.length > 0 && (
                <div className="mt-3 flex items-center gap-2 overflow-x-auto p-1 no-scrollbar">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-blue-200 shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`preview ${idx}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                  <span className="text-xs font-bold text-ueh pl-2 whitespace-nowrap">
                    Đã chọn {previewUrls.length} ảnh
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <input
                type="text"
                required
                placeholder="Dán link ảnh (https://... hoặc /images/...)"
                value={uploadUrl}
                onChange={(e) => setUploadUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 focus:border-ueh focus:outline-none"
              />
            </div>
          )}

          {/* Lựa chọn Chủ đề bộ ảnh (Đồng bộ với Góc Kỷ Niệm bên ngoài) */}
          <div className="rounded-xl border border-blue-100 bg-white/90 p-3 space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FolderHeart size={14} className="text-ueh-orange" />
              <span>Chủ đề bộ ảnh kỷ niệm:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={isCustomTopic ? "__custom__" : uploadTopic}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setIsCustomTopic(true);
                  } else {
                    setIsCustomTopic(false);
                    setUploadTopic(e.target.value);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-ueh focus:border-ueh focus:outline-none"
              >
                {allAvailableTopics.map((top) => (
                  <option key={top} value={top}>
                    Bộ ảnh: {top}
                  </option>
                ))}
                <option value="__custom__">➕ Tạo chủ đề / bộ ảnh mới...</option>
              </select>

              {isCustomTopic && (
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nhập tên chủ đề mới (VD: Khoảnh khắc bế giảng)..."
                  value={customTopicName}
                  onChange={(e) => setCustomTopicName(e.target.value)}
                  className="w-full rounded-xl border-2 border-ueh bg-blue-50/50 px-3 py-2 text-xs font-bold text-ueh focus:outline-none"
                />
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Ảnh tải lên từ admin sẽ tự động đồng bộ vào đúng bộ bài xòe của chủ đề này ngoài trang chủ.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề ảnh / Ghi chú kỷ niệm:</label>
            <input
              type="text"
              placeholder="VD: Kỷ niệm gặp mặt tại Cơ sở B - UEH..."
              value={photoTitle}
              onChange={(e) => setPhotoTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-ueh focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-blue-100">
            <button
              type="button"
              disabled={uploadingToSupabase}
              onClick={() => {
                setIsUploading(false);
                setSelectedFiles([]);
                setPreviewUrls([]);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={uploadingToSupabase}
              className="flex items-center gap-1.5 rounded-xl bg-ueh px-6 py-2 text-xs font-bold text-white hover:bg-ueh-light shadow-xs disabled:opacity-50"
            >
              {uploadingToSupabase ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span>Đang tải lên Supabase...</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span>Lưu & Đăng Lên Thư Viện</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Thanh lọc Bộ ảnh theo Chủ đề */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedFilterTopic("all")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all shrink-0 ${
            selectedFilterTopic === "all"
              ? "bg-ueh text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:border-ueh hover:text-ueh"
          }`}
        >
          <span>Tất cả</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
            selectedFilterTopic === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
          }`}>
            {items.length}
          </span>
        </button>

        {allAvailableTopics.map((top) => {
          const count = items.filter((it) => it.topic === top).length;
          const isSelected = selectedFilterTopic === top;
          return (
            <button
              key={top}
              onClick={() => setSelectedFilterTopic(top)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? "bg-ueh text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-ueh hover:text-ueh"
              }`}
            >
              <span>{top}</span>
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid Ảnh */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
          Chưa có bức ảnh nào trong chủ đề này.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((it) => (
            <div key={it.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between transition-all hover:shadow-md">
              <div>
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image_url} alt="Ảnh gallery" className="h-full w-full object-cover" />
                  {it.is_pinned && (
                    <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-ueh px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      <Pin size={10} /> Ghim nổi bật
                    </span>
                  )}
                  {it.source === "supabase" && (
                    <span className="absolute right-2 top-2 rounded-md bg-emerald-600/90 backdrop-blur-2xs px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                      Supabase
                    </span>
                  )}
                </div>
                <div className="p-2.5 pb-1">
                  <div className="mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-ueh border border-blue-100">
                      <Tag size={10} className="text-ueh-orange" />
                      {it.topic || "Chưa phân loại"}
                    </span>
                  </div>
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
      )}
    </div>
  );
}
