"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { 
  Camera, 
  Upload, 
  Heart, 
  MessageSquare, 
  Send, 
  X, 
  Sparkles, 
  User, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Pin, 
  Layers, 
  LayoutGrid, 
  Trash2, 
  CheckCircle2, 
  Star,
  Eye,
  Plus,
  Loader2
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { getSupabase } from "@/lib/supabase/client";

export interface CommentItem {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  createdAt: string;
}

export interface AlbumPhoto {
  id: string;
  title: string;
  imgSrc: string;
  type: "image" | "video";
  category?: string;
  caption?: string;
  likes: number;
  comments: CommentItem[];
  uploader: string;
  uploaderClass?: string;
  createdAt: number;
  isPinned?: boolean;
}

interface StagedUploadFile {
  id: string;
  file: File;
  preview: string;
  title: string;
  caption: string;
  isPinned: boolean;
}

const STORAGE_KEY = "tcdn4_memories_gallery";

// Hàm nén ảnh Client-side bằng Canvas (chuẩn dung lượng nhẹ 80-150KB nhưng cực sắc nét)
async function compressImageFile(file: File, maxWidth = 1600, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function MemoriesGallery() {
  const { user, profile, openLogin, isAdmin } = useAuth();
  const toast = useToast();

  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [activePhoto, setActivePhoto] = useState<AlbumPhoto | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [likedPhotoIds, setLikedPhotoIds] = useState<string[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"fan" | "grid">("fan");
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [visibleCount, setVisibleCount] = useState<number>(12);

  // Multi-upload state
  const [stagedFiles, setStagedFiles] = useState<StagedUploadFile[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState("");
  const [isSubmittingCloud, setIsSubmittingCloud] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [batchUploaderName, setBatchUploaderName] = useState("");
  const [batchClass, setBatchClass] = useState<"TC10" | "TC11" | "TC12">("TC10");
  const [batchCommonCaption, setBatchCommonCaption] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tải danh sách ảnh từ Supabase (cả khách chưa đăng nhập cũng xem được) và kết hợp localStorage
  const loadStoredPhotos = useCallback(async () => {
    const list: AlbumPhoto[] = [];
    const seenIds = new Set<string>();

    // 1. Tải ảnh từ Supabase Cloud Database (bảng gallery)
    try {
      const { data: dbGallery } = await getSupabase()
        .from("gallery")
        .select("*")
        .order("created_at", { ascending: false });

      if (dbGallery && dbGallery.length > 0) {
        dbGallery.forEach((g: any) => {
          const img = g.image_url || g.url;
          if (img && !seenIds.has(g.id)) {
            list.push({
              id: g.id,
              title: g.title || "Ảnh kỷ niệm",
              imgSrc: img,
              type: "image",
              category: "Kỷ niệm",
              caption: g.caption || undefined,
              likes: g.likes || 1,
              comments: [],
              uploader: g.uploader || "Thành viên K33",
              uploaderClass: g.uploader_class || "TC10",
              createdAt: g.created_at ? new Date(g.created_at).getTime() : Date.now(),
              isPinned: Boolean(g.is_pinned),
            });
            seenIds.add(g.id);
          }
        });
      }
    } catch {}

    // 2. Kết hợp với ảnh trong localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: AlbumPhoto) => {
            if (!seenIds.has(p.id)) {
              list.push(p);
              seenIds.add(p.id);
            }
          });
        }
      }
    } catch {}

    setPhotos(list);
  }, []);

  useEffect(() => {
    loadStoredPhotos();
    window.addEventListener("storage", loadStoredPhotos);
    window.addEventListener("tcdn4_memories_updated", loadStoredPhotos);
    return () => {
      window.removeEventListener("storage", loadStoredPhotos);
      window.removeEventListener("tcdn4_memories_updated", loadStoredPhotos);
    };
  }, [loadStoredPhotos]);

  const savePhotos = (newPhotos: AlbumPhoto[]) => {
    setPhotos(newPhotos);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPhotos));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("tcdn4_memories_updated"));
      }
    } catch {}
  };

  // Sắp xếp: Ảnh Ghim (isPinned) luôn nằm lên đầu, tiếp theo là ảnh mới nhất (createdAt giảm dần)
  const sortedPhotos = useMemo(() => {
    return [...photos].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [photos]);

  // Đảm bảo activeCardIndex hợp lệ
  useEffect(() => {
    if (sortedPhotos.length > 0 && activeCardIndex >= sortedPhotos.length) {
      setActiveCardIndex(Math.max(0, sortedPhotos.length - 1));
    }
  }, [sortedPhotos.length, activeCardIndex]);

  const handleToggleLike = (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!user) {
      toast.error("Vui lòng đăng nhập để thả tim cho bức ảnh này!");
      openLogin();
      return;
    }

    const isLiked = likedPhotoIds.includes(photoId);
    let updatedPhotos: AlbumPhoto[];
    if (isLiked) {
      setLikedPhotoIds(likedPhotoIds.filter((id) => id !== photoId));
      updatedPhotos = photos.map((p) =>
        p.id === photoId ? { ...p, likes: Math.max(0, p.likes - 1) } : p
      );
      if (activePhoto?.id === photoId) {
        setActivePhoto((prev) => (prev ? { ...prev, likes: Math.max(0, prev.likes - 1) } : null));
      }
    } else {
      setLikedPhotoIds([...likedPhotoIds, photoId]);
      updatedPhotos = photos.map((p) =>
        p.id === photoId ? { ...p, likes: p.likes + 1 } : p
      );
      if (activePhoto?.id === photoId) {
        setActivePhoto((prev) => (prev ? { ...prev, likes: prev.likes + 1 } : null));
      }
      toast.success("Đã thả tim kỷ niệm!");
    }
    savePhotos(updatedPhotos);
  };

  const handleTogglePin = (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      toast.error("Vui lòng đăng nhập để ghim ảnh!");
      openLogin();
      return;
    }
    const updated = photos.map((p) => {
      if (p.id === photoId) {
        const nextState = !p.isPinned;
        toast.success(nextState ? "Đã ghim ảnh lên đầu bộ bài!" : "Đã bỏ ghim ảnh");
        return { ...p, isPinned: nextState };
      }
      return p;
    });
    savePhotos(updated);
    if (activePhoto?.id === photoId) {
      setActivePhoto((prev) => (prev ? { ...prev, isPinned: !prev.isPinned } : null));
    }
  };

  const handleDeletePhoto = (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      toast.error("Vui lòng đăng nhập để quản lý ảnh!");
      openLogin();
      return;
    }
    if (!isAdmin && activePhoto?.uploader !== (profile?.full_name || user.email)) {
      toast.error("Chỉ Admin hoặc người đăng ảnh mới có quyền xóa bức ảnh này!");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa ảnh này khỏi góc kỷ niệm?")) return;
    const updated = photos.filter((p) => p.id !== photoId);
    savePhotos(updated);
    if (activePhoto?.id === photoId) {
      setActivePhoto(null);
    }
    toast.success("Đã xóa ảnh khỏi thư viện");
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activePhoto) return;

    if (!user) {
      toast.error("Vui lòng đăng nhập để bình luận!");
      openLogin();
      return;
    }

    const authorName = profile?.full_name || user.email?.split("@")[0] || "Alumni";
    const newComment: CommentItem = {
      id: `c-${Date.now()}`,
      author: authorName,
      avatar: profile?.avatar_url || undefined,
      content: commentInput.trim(),
      createdAt: "Vừa xong",
    };

    const updatedComments = [...activePhoto.comments, newComment];
    const updatedPhoto = { ...activePhoto, comments: updatedComments };

    setActivePhoto(updatedPhoto);
    const updatedAll = photos.map((p) => (p.id === activePhoto.id ? updatedPhoto : p));
    savePhotos(updatedAll);
    setCommentInput("");
    toast.success("Đã đăng bình luận!");
  };

  // Chọn NHIỀU ẢNH cùng lúc và nén tự động từng ảnh
  const handleMultiFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để đóng góp ảnh kỷ niệm!");
      openLogin();
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileList.length === 0) {
      toast.error("Vui lòng chọn các file định dạng hình ảnh!");
      return;
    }

    setIsCompressing(true);
    const newStaged: StagedUploadFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      setCompressProgress(`Đang nén tối ưu ${i + 1}/${fileList.length} ảnh...`);
      try {
        const compressedBase64 = await compressImageFile(f, 1500, 0.75);
        const autoTitle = f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        newStaged.push({
          id: `staged-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          file: f,
          preview: compressedBase64,
          title: autoTitle.length > 40 ? autoTitle.slice(0, 40) : autoTitle,
          caption: "",
          isPinned: false,
        });
      } catch {
        console.error("Lỗi nén ảnh:", f.name);
      }
    }

    setStagedFiles((prev) => [...prev, ...newStaged]);
    setIsCompressing(false);
    setCompressProgress("");
    toast.success(`Đã chuẩn bị ${newStaged.length} ảnh sẵn sàng đăng tải!`);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const updateStagedFile = (id: string, field: "title" | "caption" | "isPinned", value: any) => {
    setStagedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vui lòng đăng nhập để đóng góp ảnh kỷ niệm!");
      openLogin();
      return;
    }

    if (stagedFiles.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 bức ảnh để đăng tải!");
      return;
    }

    setIsSubmittingCloud(true);

    const defaultUploader =
      batchUploaderName.trim() ||
      profile?.full_name ||
      user.email?.split("@")[0] ||
      "Thành viên K33";

    const now = Date.now();
    const newPhotos: AlbumPhoto[] = [];

    for (let idx = 0; idx < stagedFiles.length; idx++) {
      const staged = stagedFiles[idx];
      setUploadProgressText(`Đang tải ảnh ${idx + 1}/${stagedFiles.length} lên Cloud Supabase...`);

      let finalImgUrl = staged.preview;

      // Upload file trực tiếp lên Supabase Storage bucket 'alumni-media'
      try {
        const fileExt = (staged.file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const filePath = `gallery/${user.id}/${now}-${idx}-${Math.random().toString(36).slice(2, 6)}.${fileExt}`;

        const { data: upRes, error: upErr } = await getSupabase()
          .storage
          .from("alumni-media")
          .upload(filePath, staged.file, {
            contentType: staged.file.type || "image/jpeg",
            upsert: true,
          });

        if (!upErr && upRes) {
          const { data: pubData } = getSupabase()
            .storage
            .from("alumni-media")
            .getPublicUrl(filePath);
          if (pubData?.publicUrl) {
            finalImgUrl = pubData.publicUrl;
          }
        }
      } catch (err) {
        console.warn("Storage upload:", err);
      }

      const photoId = `p-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
      const newPhotoItem: AlbumPhoto = {
        id: photoId,
        title: staged.title.trim() || `Ảnh kỷ niệm ${idx + 1}`,
        imgSrc: finalImgUrl,
        type: "image",
        category: "Kỷ niệm",
        caption: staged.caption.trim() || batchCommonCaption.trim() || undefined,
        likes: 1,
        comments: [],
        uploader: defaultUploader,
        uploaderClass: batchClass,
        createdAt: now + idx,
        isPinned: staged.isPinned,
      };

      newPhotos.push(newPhotoItem);

      // Lưu bản ghi vào bảng gallery trên Supabase
      try {
        await getSupabase().from("gallery").insert({
          id: photoId,
          image_url: finalImgUrl,
          title: newPhotoItem.title,
          caption: newPhotoItem.caption || null,
          uploader: defaultUploader,
          uploader_class: batchClass,
          user_id: user.id,
          is_pinned: staged.isPinned,
        });
      } catch {}
    }

    // Gộp ảnh: Ảnh mới upload sẽ đứng lên trước (chỉ đứng sau các ảnh được Ghim)
    const updated = [...newPhotos, ...photos];
    savePhotos(updated);

    // Reset form
    setStagedFiles([]);
    setIsUploadOpen(false);
    setBatchCommonCaption("");
    setActiveCardIndex(0);
    setIsSubmittingCloud(false);
    setUploadProgressText("");
    toast.success(`Đã đăng tải thành công ${newPhotos.length} ảnh kỷ niệm lên Cloud!`);
  };

  return (
    <section id="memories" className="scroll-mt-16 bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100 py-14 sm:py-20 relative border-t border-slate-200/60 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Header với Tiêu đề & Nút Hành động */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3.5 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-2.5">
              <Sparkles size={14} className="text-ueh-orange" /> Thư viện ảnh 15 năm
            </div>
            <h2 className="text-3xl font-black text-ueh sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              Góc Kỷ Niệm TCDN4
            </h2>
            <div className="mt-2.5 h-1 w-20 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
            <p className="mt-3 max-w-xl text-xs sm:text-sm text-slate-600">
              Chiêm ngưỡng bộ bài ký ức thanh xuân. Mỗi bức ảnh là một mảnh ghép kỷ niệm do anh chị em toàn khóa cùng đóng góp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-end">
            {/* Chuyển đổi chế độ xem Xòe bài / Lưới */}
            {sortedPhotos.length > 0 && (
              <div className="flex rounded-xl bg-slate-200/80 p-1 border border-slate-300">
                <button
                  onClick={() => setViewMode("fan")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    viewMode === "fan"
                      ? "bg-white text-ueh shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Chế độ xòe bài ký ức độc đáo"
                >
                  <Layers size={14} /> Xòe Bài
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    viewMode === "grid"
                      ? "bg-white text-ueh shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Chế độ lưới đầy đủ"
                >
                  <LayoutGrid size={14} /> Lưới Album
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (!user) {
                  toast.error("Vui lòng đăng nhập để đóng góp ảnh kỷ niệm!");
                  openLogin();
                  return;
                }
                setIsUploadOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-ueh px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-ueh-light transition-all active:scale-95"
            >
              <Upload size={16} /> Đóng Góp Nhiều Ảnh
            </button>
          </div>
        </div>

        {/* TRƯỜNG HỢP CHƯA CÓ ẢNH NÀO TRONG KHO (EMPTY STATE CỰC ĐẸP) */}
        {sortedPhotos.length === 0 ? (
          <div className="relative rounded-3xl border-2 border-dashed border-blue-200/90 bg-white/80 p-10 sm:p-16 text-center backdrop-blur-sm shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-ueh shadow-inner">
              <Camera size={36} className="text-ueh" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-ueh">
              Góc Kỷ Niệm TCDN4 Đang Chờ Bức Ảnh Đầu Tiên
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm text-slate-500">
              Chưa có ảnh nào trong kho lưu trữ. Bạn có thể chọn và tải lên cùng lúc nhiều bức ảnh kỷ niệm (giảng đường, dã ngoại, lễ tốt nghiệp...) để cùng xòe bộ bài thanh xuân!
            </p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  if (!user) {
                    toast.error("Vui lòng đăng nhập để đóng góp ảnh kỷ niệm!");
                    openLogin();
                    return;
                  }
                  setIsUploadOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-ueh to-ueh-light px-7 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                <Upload size={17} /> Đóng Góp Ảnh Mới Ngay
              </button>
            </div>
          </div>
        ) : viewMode === "fan" ? (
          /* =========================================================================
             CHẾ ĐỘ XÒE BÀI ĐỘC ĐÁO (FANNED-OUT CARD DECK 3D)
             ========================================================================= */
          <div className="relative py-8 sm:py-12">
            
            {/* Bàn nỉ trưng bày bộ bài (Felt Deck Display Canvas) */}
            <div className="relative mx-auto flex h-[380px] sm:h-[460px] md:h-[500px] w-full max-w-5xl items-center justify-center select-none overflow-hidden sm:overflow-visible">
              
              {/* Vòng tròn hào quang phía sau tâm bộ bài */}
              <div className="absolute h-80 w-80 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />

              {/* Các thẻ bài xòe thành cánh cung */}
              {sortedPhotos.map((item, idx) => {
                const diff = idx - activeCardIndex;
                const absDiff = Math.abs(diff);

                // Chỉ hiển thị tối đa 7 lá bài gần tâm nhất để giữ hiệu ứng xòe bài mượt mà
                if (absDiff > 4) return null;

                const isCurrent = diff === 0;
                const isLiked = likedPhotoIds.includes(item.id);

                // Góc xoay và độ dạt theo dạng xòe bài cầm tay
                const rotateDeg = diff * 5.5; // -16.5deg đến +16.5deg
                const translateX = diff * (typeof window !== "undefined" && window.innerWidth < 640 ? 46 : 76);
                const translateY = Math.min(absDiff * 14, 60);
                const zIndex = 30 - absDiff;
                const scale = isCurrent ? 1.05 : Math.max(0.85, 1 - absDiff * 0.05);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isCurrent) {
                        setActivePhoto(item);
                      } else {
                        setActiveCardIndex(idx);
                      }
                    }}
                    style={{
                      transform: `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotateDeg}deg) scale(${scale})`,
                      zIndex,
                    }}
                    className={`group absolute cursor-pointer rounded-2xl bg-white p-2.5 sm:p-3 pb-8 sm:pb-9 shadow-2xl transition-all duration-300 ease-out hover:-translate-y-6 hover:rotate-0 hover:scale-110 hover:z-50 ${
                      isCurrent
                        ? "ring-4 ring-ueh/80 shadow-ueh/30"
                        : "opacity-90 hover:opacity-100"
                    }`}
                  >
                    {/* Thẻ ảnh dạng Polaroid / Card Game cao cấp */}
                    <div className="relative h-48 w-36 sm:h-64 sm:w-48 md:h-76 md:w-56 overflow-hidden rounded-xl bg-slate-900 border border-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imgSrc}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Huy hiệu Ghim Nổi Bật (Vàng Kim) */}
                      {item.isPinned && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-slate-950 shadow-md">
                          <Pin size={11} className="fill-slate-950" /> GHIM ĐẦU
                        </div>
                      )}

                      {/* Nút Xem chi tiết nhanh khi hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-ueh shadow-lg">
                          <Eye size={13} /> Xem Lớn
                        </span>
                      </div>

                      {/* Lớp gradient nhẹ bảo vệ chữ */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                      
                      <div className="absolute bottom-1.5 left-2 right-2 text-white text-[10px] sm:text-xs font-bold truncate">
                        {item.title}
                      </div>
                    </div>

                    {/* Phần lề dưới của ảnh Polaroid */}
                    <div className="mt-2 flex items-center justify-between px-1 text-[10px] sm:text-[11px] text-slate-600 font-semibold">
                      <span className="flex items-center gap-1 truncate text-ueh max-w-[100px] sm:max-w-[130px]">
                        <User size={11} className="shrink-0 text-slate-400" /> {item.uploader}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleToggleLike(item.id, e)}
                          className={`flex items-center gap-0.5 transition-colors ${
                            isLiked ? "text-rose-500 font-bold" : "text-slate-400 hover:text-rose-500"
                          }`}
                          title="Thả tim"
                        >
                          <Heart size={12} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
                          <span>{item.likes}</span>
                        </button>

                        <button
                          onClick={(e) => handleTogglePin(item.id, e)}
                          className={`transition-colors p-0.5 rounded ${
                            item.isPinned ? "text-amber-500" : "text-slate-300 hover:text-amber-500"
                          }`}
                          title={item.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                        >
                          <Pin size={12} className={item.isPinned ? "fill-amber-500" : ""} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Thanh điều khiển lướt thẻ bài (Next / Prev Controller) */}
            <div className="mt-4 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveCardIndex((prev) => Math.max(0, prev - 1))}
                  disabled={activeCardIndex === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-ueh hover:text-ueh disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                  aria-label="Thẻ bài trước"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="text-xs font-bold text-slate-600">
                  Lá bài <strong className="text-ueh text-sm font-black">{activeCardIndex + 1}</strong> / {sortedPhotos.length}
                </div>

                <button
                  onClick={() => setActiveCardIndex((prev) => Math.min(sortedPhotos.length - 1, prev + 1))}
                  disabled={activeCardIndex >= sortedPhotos.length - 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-ueh hover:text-ueh disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                  aria-label="Thẻ bài tiếp theo"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Dải chấm nhỏ hoặc thumbnail lướt nhanh */}
              <div className="flex max-w-md items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {sortedPhotos.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setActiveCardIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === activeCardIndex
                        ? "w-6 bg-ueh-orange"
                        : p.isPinned
                        ? "w-2.5 bg-amber-400"
                        : "w-2 bg-slate-300 hover:bg-slate-400"
                    }`}
                    title={p.title}
                  />
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* =========================================================================
             CHẾ ĐỘ LƯỚI ALBUM ĐẦY ĐỦ (GRID MASONRY)
             ========================================================================= */
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {sortedPhotos.slice(0, visibleCount).map((item) => {
                const isLiked = likedPhotoIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => setActivePhoto(item)}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-2.5 pb-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imgSrc}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />

                      {item.isPinned && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2 py-0.5 text-[9px] font-black text-slate-950 shadow-md">
                          <Pin size={10} className="fill-slate-950" /> Ghim đầu
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="mt-2 px-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-ueh transition-colors truncate">
                          {item.title}
                        </h4>
                        <button
                          onClick={(e) => handleTogglePin(item.id, e)}
                          className={`p-1 transition-colors ${
                            item.isPinned ? "text-amber-500" : "text-slate-300 hover:text-amber-500"
                          }`}
                          title={item.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                        >
                          <Pin size={12} className={item.isPinned ? "fill-amber-500" : ""} />
                        </button>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate max-w-[120px]">{item.uploader}</span>
                        <button
                          onClick={(e) => handleToggleLike(item.id, e)}
                          className={`flex items-center gap-0.5 ${
                            isLiked ? "text-rose-500 font-bold" : "text-slate-400 hover:text-rose-500"
                          }`}
                        >
                          <Heart size={11} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
                          <span>{item.likes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {sortedPhotos.length > visibleCount && (
              <div className="text-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 8)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:border-ueh hover:text-ueh shadow-xs transition-all"
                >
                  Xem thêm ảnh ({sortedPhotos.length - visibleCount})
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* =========================================================================
          MODAL XEM CHI TIẾT ẢNH & BÌNH LUẬN (LIGHTBOX)
          ========================================================================= */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute right-3.5 top-3.5 z-20 rounded-full bg-black/60 p-2 text-white hover:bg-black/90 transition-colors"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>

            {/* Khung ảnh to */}
            <div className="flex flex-1 items-center justify-center bg-black p-2 sm:p-4 min-h-[260px] md:min-h-[460px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.imgSrc}
                alt={activePhoto.title}
                className="max-h-[55vh] md:max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </div>

            {/* Cột bình luận và thông tin */}
            <div className="flex w-full md:w-80 lg:w-96 flex-col justify-between border-t md:border-t-0 md:border-l border-white/10 bg-slate-900/95 p-4 sm:p-5">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                      {activePhoto.title}
                    </h3>
                    <p className="mt-1 text-xs text-sky-300 font-semibold flex items-center gap-1.5">
                      <User size={12} /> {activePhoto.uploader}
                      {activePhoto.uploaderClass && (
                        <span className="rounded bg-blue-900/80 px-1.5 py-0.2 text-[10px] text-sky-200 border border-blue-500/30">
                          {activePhoto.uploaderClass}
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleTogglePin(activePhoto.id, e)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      activePhoto.isPinned
                        ? "bg-amber-400 text-slate-950 shadow-xs"
                        : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    <Pin size={12} className={activePhoto.isPinned ? "fill-slate-950" : ""} />
                    <span>{activePhoto.isPinned ? "Đã ghim" : "Ghim đầu"}</span>
                  </button>
                </div>

                {activePhoto.caption && (
                  <p className="mt-2.5 rounded-xl bg-white/5 p-2.5 text-xs text-slate-300 leading-relaxed border border-white/10 font-normal">
                    {activePhoto.caption}
                  </p>
                )}

                {/* Nút Like & Xóa */}
                <div className="mt-3 flex items-center justify-between border-b border-white/10 pb-3">
                  <button
                    onClick={(e) => handleToggleLike(activePhoto.id, e)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                      likedPhotoIds.includes(activePhoto.id)
                        ? "bg-rose-500 text-white shadow-xs"
                        : "bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    <Heart size={14} className={likedPhotoIds.includes(activePhoto.id) ? "fill-white" : ""} />
                    <span>{activePhoto.likes} Thích</span>
                  </button>

                  <button
                    onClick={(e) => handleDeletePhoto(activePhoto.id, e)}
                    className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 p-1"
                    title="Xóa ảnh này"
                  >
                    <Trash2 size={13} /> Xóa ảnh
                  </button>
                </div>

                {/* Danh sách bình luận */}
                <div className="mt-3">
                  <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                    <MessageSquare size={13} /> Bình luận ({activePhoto.comments.length})
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar pr-1">
                    {activePhoto.comments.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic py-2">
                        Chưa có bình luận nào. Hãy để lại lời nhắn đầu tiên!
                      </p>
                    ) : (
                      activePhoto.comments.map((c) => (
                        <div key={c.id} className="rounded-xl bg-white/5 p-2 text-xs border border-white/5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <strong className="text-sky-300">{c.author}</strong>
                            <span>{c.createdAt}</span>
                          </div>
                          <p className="text-slate-200">{c.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Form bình luận */}
              <form onSubmit={handleAddComment} className="mt-3 flex gap-1.5 pt-2 border-t border-white/10">
                <input
                  type="text"
                  placeholder="Viết cảm nghĩ về bức ảnh..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="rounded-xl bg-ueh px-3.5 py-2 text-xs font-bold text-white hover:bg-ueh-light disabled:opacity-40 transition-colors"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL UPLOAD NHIỀU ẢNH (MULTI-PHOTO UPLOAD VỚI NÉN TỰ ĐỘNG)
          ========================================================================= */}
      {isUploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
          onClick={() => setIsUploadOpen(false)}
        >
          <div
            className="relative my-8 w-full max-w-2xl rounded-3xl bg-white p-5 sm:p-7 shadow-2xl text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-ueh">
                <Upload size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-ueh">Đóng Góp Nhiều Ảnh Kỷ Niệm</h3>
                <p className="text-xs text-slate-500">
                  Chọn một hoặc nhiều ảnh cùng lúc. Ảnh mới đăng sẽ hiển thị lên trước trong bộ bài!
                </p>
              </div>
            </div>

            {!user ? (
              <div className="my-6 rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center">
                <p className="text-sm font-bold text-amber-900 mb-2">
                  Bạn cần đăng nhập tài khoản cựu sinh viên để đóng góp ảnh
                </p>
                <p className="text-xs text-amber-700 mb-4">
                  Vui lòng đăng nhập để hệ thống xác thực danh tính người đóng góp và lưu lại ký ức khóa.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    openLogin();
                  }}
                  className="rounded-xl bg-ueh px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-ueh-light transition-all"
                >
                  Đăng nhập ngay
                </button>
              </div>
            ) : (
              <form onSubmit={handleBatchSubmit} className="mt-5 space-y-4">
              
              {/* Vùng kéo thả / chọn nhiều ảnh */}
              <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4 sm:p-6 text-center hover:bg-blue-50/70 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleMultiFilesSelected}
                  className="hidden"
                  id="multi-photo-input"
                />
                <label
                  htmlFor="multi-photo-input"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <Camera size={32} className="text-ueh mb-2" />
                  <span className="text-xs sm:text-sm font-bold text-ueh">
                    Bấm để chọn nhiều ảnh từ thiết bị
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Hỗ trợ JPG, PNG, WEBP (Tự động nén dung lượng nhẹ & sắc nét)
                  </span>
                </label>

                {isCompressing && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-ueh px-3 py-1 text-xs font-semibold text-white">
                    <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
                    {compressProgress}
                  </div>
                )}
              </div>

              {/* Danh sách ảnh đã chọn chuẩn bị upload */}
              {stagedFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700">
                      Đã chuẩn bị ({stagedFiles.length} ảnh):
                    </span>
                    <button
                      type="button"
                      onClick={() => setStagedFiles([])}
                      className="text-[11px] font-semibold text-rose-600 hover:underline"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar border border-slate-200 rounded-2xl p-2.5 bg-slate-50">
                    {stagedFiles.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl bg-white p-2 border border-slate-200/80 shadow-2xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.preview}
                          alt="Thumbnail"
                          className="h-12 w-14 shrink-0 rounded-lg object-cover border border-slate-100"
                        />

                        <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Tên ảnh..."
                            value={item.title}
                            onChange={(e) => updateStagedFile(item.id, "title", e.target.value)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs focus:bg-white focus:border-ueh focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Chú thích nhỏ (tùy chọn)..."
                            value={item.caption}
                            onChange={(e) => updateStagedFile(item.id, "caption", e.target.value)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs focus:bg-white focus:border-ueh focus:outline-none"
                          />
                        </div>

                        {/* Nút Ghim */}
                        <button
                          type="button"
                          onClick={() => updateStagedFile(item.id, "isPinned", !item.isPinned)}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold shrink-0 transition-colors ${
                            item.isPinned
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                          title="Ghim ảnh này lên đầu bộ bài"
                        >
                          <Pin size={11} className={item.isPinned ? "fill-amber-800" : ""} />
                          <span className="hidden sm:inline">{item.isPinned ? "Đã ghim" : "Ghim"}</span>
                        </button>

                        {/* Xóa ảnh khỏi queue */}
                        <button
                          type="button"
                          onClick={() => removeStagedFile(item.id)}
                          className="rounded-lg p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Bỏ ảnh này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thông tin chung của người đóng góp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên người đóng góp:
                  </label>
                  <input
                    type="text"
                    placeholder={profile?.full_name || "VD: Nguyễn Văn A..."}
                    value={batchUploaderName}
                    onChange={(e) => setBatchUploaderName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-ueh focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thuộc lớp:
                  </label>
                  <select
                    value={batchClass}
                    onChange={(e) => setBatchClass(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-ueh focus:bg-white focus:border-ueh focus:outline-none"
                  >
                    <option value="TC10">Lớp TC10</option>
                    <option value="TC11">Lớp TC11</option>
                    <option value="TC12">Lớp TC12</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú / Chú thích chung cho album (tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="VD: Kỷ niệm dã ngoại Vũng Tàu năm 2 đại học..."
                  value={batchCommonCaption}
                  onChange={(e) => setBatchCommonCaption(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-ueh focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={stagedFiles.length === 0 || isCompressing || isSubmittingCloud}
                  className="flex items-center gap-2 rounded-xl bg-ueh px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-ueh-light transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmittingCloud ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{uploadProgressText || "Đang lưu lên Supabase..."}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={15} /> Đăng Tải {stagedFiles.length > 0 ? `(${stagedFiles.length})` : ""} Ảnh Vào Bộ Bài
                    </>
                  )}
                </button>
              </div>

            </form>
            )}
          </div>
        </div>
      )}

    </section>
  );
}
