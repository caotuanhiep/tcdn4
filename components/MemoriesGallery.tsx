"use client";

import { useState } from "react";
import { 
  Camera, 
  Video, 
  Upload, 
  Heart, 
  MessageSquare, 
  Play, 
  Send, 
  X, 
  Sparkles, 
  User, 
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";

interface CommentItem {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  createdAt: string;
}

interface AlbumPhoto {
  id: string;
  title: string;
  imgSrc?: string;
  type: "image" | "video";
  category: string;
  caption?: string;
  likes: number;
  comments: CommentItem[];
  uploader: string;
  color?: string;
  span?: string;
}

const INITIAL_ALBUM: AlbumPhoto[] = [
  {
    id: "photo-1",
    title: "Tập thể TCDN4 K33 trước Cơ sở A - UEH",
    imgSrc: "/images/ueh-group.jpg",
    type: "image",
    category: "Hội ngộ",
    caption: "Kỷ niệm ngày hội ngộ 15 năm K33",
    likes: 28,
    comments: [
      { id: "c1", author: "Lê Hoàng Cường", content: "Mọi người tươi quá, nhìn ai cũng phong độ!", createdAt: "Hôm qua" },
      { id: "c2", author: "Trần Thị Bích", content: "Nhớ trường xưa ghê, hẹn gặp lại mọi người đông đủ!", createdAt: "Hôm nay" },
    ],
    uploader: "Ban Liên Lạc",
    span: "col-span-2 row-span-2",
  },
  {
    id: "photo-2",
    title: "Lễ Tốt Nghiệp 2011",
    type: "image",
    category: "Lễ Tốt Nghiệp",
    caption: "Ngày nhận bằng tốt nghiệp",
    likes: 19,
    comments: [],
    uploader: "TC12",
    color: "from-blue-600 to-indigo-800",
  },
  {
    id: "photo-3",
    title: "Video: 15 Năm Thanh Xuân",
    type: "video",
    category: "Video Recap",
    caption: "Thước phim kỷ niệm sinh viên",
    likes: 35,
    comments: [
      { id: "c3", author: "Phạm Hải Đăng", content: "Xem lại clip xúc động thực sự các bạn ơi!", createdAt: "2 ngày trước" },
    ],
    uploader: "TC10",
    color: "from-purple-600 to-pink-700",
  },
  {
    id: "photo-4",
    title: "Học kỳ Quân sự",
    type: "image",
    category: "Quân sự",
    caption: "Những ngày trên thao trường",
    likes: 22,
    comments: [],
    uploader: "Nguyễn Văn A",
    color: "from-emerald-700 to-teal-900",
  },
  {
    id: "photo-5",
    title: "Canteen Giờ Giải Lao",
    type: "image",
    category: "Giảng đường",
    caption: "Trưa chép bài và uống nước mía",
    likes: 18,
    comments: [],
    uploader: "TC11",
    color: "from-amber-600 to-orange-800",
  },
  {
    id: "photo-6",
    title: "Đêm Gala Gặp Gỡ 10 Năm",
    type: "image",
    category: "Hội ngộ",
    caption: "Gặp lại sau 10 năm ra trường",
    likes: 25,
    comments: [],
    uploader: "Ban Liên Lạc",
    color: "from-sky-600 to-blue-800",
  },
  {
    id: "photo-7",
    title: "Chuyến Dã Ngoại Vũng Tàu",
    type: "image",
    category: "Dã ngoại",
    caption: "Chuyến đi biển năm 3 đại học",
    likes: 17,
    comments: [],
    uploader: "Hoàng Minh Em",
    color: "from-teal-600 to-cyan-800",
  },
  {
    id: "photo-8",
    title: "Đội Văn Nghệ TCDN4 K33",
    type: "image",
    category: "Văn nghệ",
    caption: "Hội diễn văn nghệ truyền thống UEH",
    likes: 20,
    comments: [],
    uploader: "Ngô Mỹ Linh",
    color: "from-rose-600 to-pink-800",
  },
  {
    id: "photo-9",
    title: "Bảo Vệ Đề Tài Khóa Luận",
    type: "image",
    category: "Học tập",
    caption: "Kỷ niệm ngày bảo vệ tốt nghiệp K33",
    likes: 24,
    comments: [],
    uploader: "TC12",
    color: "from-indigo-600 to-purple-800",
  },
];

// Hàm nén ảnh Client-side bằng Canvas
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
  const { user, profile, openLogin } = useAuth();
  const toast = useToast();

  const [photos, setPhotos] = useState<AlbumPhoto[]>(INITIAL_ALBUM);
  const [activePhoto, setActivePhoto] = useState<AlbumPhoto | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [likedPhotoIds, setLikedPhotoIds] = useState<string[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(9); // 9 mục lấp đầy hoàn hảo 3 hàng grid 4 cột

  // New photo form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Kỷ niệm chung");
  const [newCaption, setNewCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleToggleLike = (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!user) {
      toast.error("Vui lòng đăng nhập để thả tim cho bức ảnh này!");
      openLogin();
      return;
    }

    const isLiked = likedPhotoIds.includes(photoId);
    if (isLiked) {
      setLikedPhotoIds(likedPhotoIds.filter((id) => id !== photoId));
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, likes: Math.max(0, p.likes - 1) } : p))
      );
      if (activePhoto?.id === photoId) {
        setActivePhoto((prev) => prev ? { ...prev, likes: Math.max(0, prev.likes - 1) } : null);
      }
    } else {
      setLikedPhotoIds([...likedPhotoIds, photoId]);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, likes: p.likes + 1 } : p))
      );
      if (activePhoto?.id === photoId) {
        setActivePhoto((prev) => prev ? { ...prev, likes: prev.likes + 1 } : null);
      }
      toast.success("Đã thả tim kỷ niệm!");
    }
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
    setPhotos((prev) => prev.map((p) => (p.id === activePhoto.id ? updatedPhoto : p)));
    setCommentInput("");
    toast.success("Đã đăng bình luận!");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setIsCompressing(true);
      try {
        const compressedBase64 = await compressImageFile(file, 1400, 0.75);
        setFilePreview(compressedBase64);
        setSelectedFile(file);
        toast.success("Đã tối ưu & nén ảnh thành công!");
      } catch {
        toast.error("Không thể xử lý ảnh, vui lòng thử lại!");
      } finally {
        setIsCompressing(false);
      }
    } else {
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Vui lòng nhập tên ảnh / khoảnh khắc!");
      return;
    }

    const authorName = profile?.full_name || (user ? "Thành viên lớp" : "Khách");
    const newItem: AlbumPhoto = {
      id: `p-${Date.now()}`,
      title: newTitle.trim(),
      imgSrc: filePreview || undefined,
      type: selectedFile?.type.startsWith("video/") ? "video" : "image",
      category: newCategory,
      caption: newCaption.trim() || undefined,
      likes: 1,
      comments: [],
      uploader: authorName,
      color: "from-blue-600 to-sky-700",
    };

    setPhotos([newItem, ...photos]);
    setIsUploadOpen(false);
    setNewTitle("");
    setNewCaption("");
    setSelectedFile(null);
    setFilePreview(null);
    toast.success("Đã đóng góp ảnh kỷ niệm thành công!");
  };

  const displayedPhotos = photos.slice(0, visibleCount);

  return (
    <section id="memories" className="scroll-mt-16 bg-gradient-to-b from-slate-50 via-blue-50/40 to-slate-100/70 py-14 sm:py-20 relative border-t border-slate-200/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Header với Tiêu đề Cực To */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3.5 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-2.5">
              <Sparkles size={14} className="text-ueh-orange" /> Thư viện ảnh & video
            </div>
            <h2 className="text-3xl font-black text-ueh sm:text-5xl lg:text-6xl tracking-tight leading-tight">
              Góc Kỷ Niệm TCDN4
            </h2>
            <div className="mt-2.5 h-1 w-20 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
            <p className="mt-3 max-w-xl text-xs sm:text-sm text-slate-600">
              Kho lưu trữ hình ảnh 15 năm. Mỗi bức ảnh là một mảnh ghép thanh xuân được anh chị em cùng đóng góp.
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-ueh px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-ueh-light transition-all self-start md:self-end"
          >
            <Upload size={15} /> Đóng Góp Ảnh Mới
          </button>
        </div>

        {/* Album Grid Cân Đối (Bo góc chuẩn rounded-2xl, thông tin cực kỳ gọn gàng trên ảnh) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 auto-rows-[160px] sm:auto-rows-[190px]">
          {displayedPhotos.map((item) => {
            const isLiked = likedPhotoIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => setActivePhoto(item)}
                className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer flex flex-col justify-between ${item.span || ""}`}
              >
                {/* Image View or Gradient Background */}
                <div className="relative h-full w-full overflow-hidden bg-slate-900">
                  {item.imgSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imgSrc}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${item.color || "from-[#003B5C] to-indigo-900"} flex flex-col items-center justify-center p-3 text-center`}>
                      {item.type === "video" ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-xs mb-1.5 group-hover:scale-110 transition-transform">
                          <Play size={18} className="ml-0.5 text-ueh-gold" />
                        </div>
                      ) : (
                        <Camera size={24} className="text-white/60 mb-1 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-xs font-bold text-white/95 line-clamp-1">{item.title}</span>
                    </div>
                  )}

                  {/* Gradient Overlay tối nhẹ phía dưới */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                  {/* GỌN GÀNG TRÊN ẢNH: BỎ TAG, BỎ COMMENT RƯỜM RÀ. CHỈ GHI AI ĐÓNG GÓP + CAPTION NHỎ */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                    <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                      <span className="flex items-center gap-1 text-sky-200 truncate">
                        <User size={11} className="shrink-0" /> {item.uploader}
                      </span>
                      {/* Nút thả tim nhỏ gọn */}
                      <button
                        onClick={(e) => handleToggleLike(item.id, e)}
                        className={`flex items-center gap-0.5 text-[10px] shrink-0 transition-colors ${
                          isLiked ? "text-rose-400 font-bold" : "text-white/80 hover:text-white"
                        }`}
                      >
                        <Heart size={11} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
                        <span>{item.likes}</span>
                      </button>
                    </div>

                    {item.caption && (
                      <p className="text-[10px] text-slate-300 line-clamp-1 mt-0.5 font-normal">
                        {item.caption}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CƠ CHẾ XEM THÊM KHI CÓ NHIỀU ẢNH */}
        {photos.length > displayedPhotos.length && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 4)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:border-ueh hover:text-ueh shadow-xs transition-all"
            >
              Xem thêm ảnh kỷ niệm ({photos.length - displayedPhotos.length})
              <ChevronDown size={15} />
            </button>
          </div>
        )}

      </div>

      {/* Modal xem chi tiết ảnh và bình luận */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl md:flex-row animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute right-3.5 top-3.5 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Left: Image / Video Display */}
            <div className="flex flex-1 items-center justify-center bg-black p-4 md:p-6">
              {activePhoto.imgSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activePhoto.imgSrc}
                  alt={activePhoto.title}
                  className="max-h-[60vh] md:max-h-[75vh] w-auto rounded-xl object-contain"
                />
              ) : (
                <div className={`h-64 md:h-80 w-full rounded-xl bg-gradient-to-br ${activePhoto.color || "from-blue-600 to-indigo-900"} flex flex-col items-center justify-center p-6 text-center`}>
                  <Camera size={44} className="text-white/50 mb-2" />
                  <h3 className="text-base font-bold text-white">{activePhoto.title}</h3>
                </div>
              )}
            </div>

            {/* Right: Info & Comments */}
            <div className="flex w-full flex-col justify-between border-t border-white/10 bg-slate-900 p-4 sm:p-5 md:w-80 md:border-l md:border-t-0">
              <div>
                <div className="mb-3">
                  <h3 className="text-sm sm:text-base font-black text-white">{activePhoto.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Đóng góp bởi: <strong className="text-white">{activePhoto.uploader}</strong></p>
                  {activePhoto.caption && (
                    <p className="mt-1.5 text-xs text-slate-300 italic border-l-2 border-ueh-gold pl-2">
                      "{activePhoto.caption}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 py-2 border-y border-white/10 text-xs">
                  <button
                    onClick={() => handleToggleLike(activePhoto.id)}
                    className="flex items-center gap-1.5 font-bold text-rose-400 hover:text-rose-300"
                  >
                    <Heart size={15} className={likedPhotoIds.includes(activePhoto.id) ? "fill-rose-500 text-rose-500" : ""} />
                    <span>{activePhoto.likes} thích</span>
                  </button>
                  <span className="text-slate-400">• {activePhoto.comments.length} bình luận</span>
                </div>

                {/* Comment list */}
                <div className="my-2.5 max-h-44 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {activePhoto.comments.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">Chưa có bình luận nào.</p>
                  ) : (
                    activePhoto.comments.map((c) => (
                      <div key={c.id} className="rounded-lg bg-white/5 p-2 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-sky-300 mb-0.5">
                          <span>{c.author}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{c.createdAt}</span>
                        </div>
                        <p className="text-slate-200">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Form Bình luận */}
              <form onSubmit={handleAddComment} className="mt-2 flex gap-1.5">
                <input
                  type="text"
                  placeholder="Viết cảm nghĩ..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 rounded-xl border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="rounded-xl bg-ueh px-3 py-1.5 text-xs font-bold text-white hover:bg-ueh-light disabled:opacity-50"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal đóng góp ảnh có tính năng NÉN ẢNH tự động */}
      {isUploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setIsUploadOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute right-3.5 top-3.5 rounded-lg bg-slate-100 p-1 text-slate-400 hover:bg-slate-200"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-black text-ueh mb-1 flex items-center gap-1.5">
              <Upload size={17} className="text-ueh-orange" /> Đóng Góp Ảnh Kỷ Niệm
            </h3>
            <p className="text-xs text-slate-500 mb-3.5">
              Ảnh tải lên sẽ được tự động nén tối ưu dung lượng và sắc nét.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn ảnh từ máy (Tự động nén):
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-ueh hover:file:bg-blue-100 cursor-pointer"
                />
                {isCompressing && (
                  <p className="text-[11px] text-ueh font-semibold mt-1">Đang nén ảnh tối ưu...</p>
                )}
                {filePreview && (
                  <div className="mt-2 h-24 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={filePreview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên ảnh / Khoảnh khắc *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nhóm bạn TC10 tại Canteen..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-ueh focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Caption ngắn (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="VD: Buổi trưa cùng nhau ôn thi cuối kỳ..."
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-ueh focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isCompressing}
                className="w-full rounded-xl bg-ueh py-2.5 text-xs font-bold text-white hover:bg-ueh-light transition-colors shadow-xs mt-2 disabled:opacity-50"
              >
                Lưu và Chia Sẻ Ảnh
              </button>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}
