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
  GraduationCap
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
  caption?: string; // Optional caption as requested!
  likes: number;
  comments: CommentItem[];
  uploader: string;
  color?: string;
}

const INITIAL_ALBUM: AlbumPhoto[] = [
  {
    id: "photo-1",
    title: "Tập thể TCDN4 K33 trước Cơ sở B - UEH",
    imgSrc: "/images/ueh-group.jpg",
    type: "image",
    category: "Hội ngộ",
    caption: "Chụp kỷ niệm tại 279 Nguyễn Tri Phương nhân dịp chuẩn bị 15 năm.",
    likes: 24,
    comments: [
      { id: "c1", author: "Lê Hoàng Cường", content: "Mọi người tươi quá, nhìn ai cũng phong độ!", createdAt: "Hôm qua" },
      { id: "c2", author: "Trần Thị Bích", content: "Nhớ trường xưa ghê, hẹn gặp lại mọi người đông đủ!", createdAt: "Hôm nay" },
    ],
    uploader: "Ban Liên Lạc",
  },
  {
    id: "photo-2",
    title: "Lễ Tốt Nghiệp 2011",
    type: "image",
    category: "Lễ Tốt Nghiệp",
    likes: 19,
    comments: [],
    uploader: "TC12",
    color: "from-blue-600 to-indigo-800",
  },
  {
    id: "photo-3",
    title: "Video Recap: 15 Năm Thanh Xuân",
    type: "video",
    category: "Video Recap",
    caption: "Tổng hợp các thước phim từ thời sinh viên đến nay.",
    likes: 31,
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
    likes: 15,
    comments: [],
    uploader: "Nguyễn Văn A",
    color: "from-emerald-700 to-teal-900",
  },
  {
    id: "photo-5",
    title: "Canteen Cơ sở B",
    type: "image",
    category: "Giảng đường B",
    caption: "Những buổi trưa chép bài và uống nước mía.",
    likes: 18,
    comments: [],
    uploader: "TC11",
    color: "from-amber-600 to-orange-800",
  },
  {
    id: "photo-6",
    title: "Album '15 Năm Trở Về' - Coming soon",
    type: "image",
    category: "Kỷ niệm 15 năm",
    likes: 28,
    comments: [],
    uploader: "Ban Tổ Chức",
    color: "from-cyan-600 to-blue-900",
  },
];

export default function MemoriesGallery() {
  const { user, profile, openLogin } = useAuth();
  const toast = useToast();

  const [photos, setPhotos] = useState<AlbumPhoto[]>(INITIAL_ALBUM);
  const [activePhoto, setActivePhoto] = useState<AlbumPhoto | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [likedPhotoIds, setLikedPhotoIds] = useState<string[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // New photo form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Kỷ niệm chung");
  const [newCaption, setNewCaption] = useState("");

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

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Vui lòng nhập tên ảnh/album!");
      return;
    }
    const authorName = profile?.full_name || (user ? "Thành viên lớp" : "Khách");
    const newItem: AlbumPhoto = {
      id: `p-${Date.now()}`,
      title: newTitle.trim(),
      type: "image",
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
    toast.success("Đã thêm ảnh vào album kỷ niệm!");
  };

  return (
    <section id="memories" className="scroll-mt-16 bg-[#001f3f] py-16 sm:py-20 text-white relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-300 uppercase tracking-wide mb-2 border border-white/10">
              <Sparkles size={13} className="text-yellow-400" /> Thư viện ảnh & video
            </div>
            <h2 className="text-2xl font-extrabold sm:text-3xl md:text-4xl tracking-tight">
              Góc Kỷ Niệm TCDN4
            </h2>
            <div className="mt-2.5 h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-cyan-300" />
            <p className="mt-2.5 max-w-xl text-xs sm:text-sm text-blue-200 font-light">
              Kho lưu trữ hình ảnh và video 15 năm. Đăng nhập để thả tim và để lại bình luận cho từng khoảnh khắc!
            </p>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:from-blue-600 hover:to-cyan-600 self-start md:self-end"
          >
            <Upload size={15} /> Đóng Góp Ảnh Mới
          </button>
        </div>

        {/* Album Grid (Visual-first, subtle small captions) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
          {photos.map((item) => {
            const isLiked = likedPhotoIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => setActivePhoto(item)}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col justify-between"
              >
                {/* Image View or Gradient Placeholder */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-800">
                  {item.imgSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imgSrc}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${item.color || "from-blue-700 to-indigo-900"} flex flex-col items-center justify-center p-3 text-center`}>
                      {item.type === "video" ? (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xs mb-1.5 group-hover:scale-110 transition-transform">
                          <Play size={18} className="ml-0.5 text-yellow-300" />
                        </div>
                      ) : (
                        <Camera size={24} className="text-white/60 mb-1 group-hover:scale-110 transition-transform" />
                      )}
                      <span className="text-xs font-bold text-white/90 line-clamp-1">{item.title}</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2">
                    <span className="rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                      {item.category}
                    </span>
                  </div>
                </div>

                {/* Bottom Card Content: Title & Minimal Caption & Interactions */}
                <div className="p-3 bg-[#001730]">
                  <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h3>
                  {item.caption && (
                    <p className="text-[11px] text-blue-200/70 line-clamp-1 mt-0.5">
                      {item.caption}
                    </p>
                  )}

                  {/* Like & Comments Stats Bar */}
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-300">
                    <button
                      onClick={(e) => handleToggleLike(item.id, e)}
                      className={`flex items-center gap-1 transition-colors ${
                        isLiked ? "text-rose-400 font-bold" : "text-blue-300 hover:text-white"
                      }`}
                    >
                      <Heart size={13} className={isLiked ? "fill-rose-500 text-rose-500" : ""} />
                      {item.likes}
                    </button>

                    <div className="flex items-center gap-1 text-slate-400">
                      <MessageSquare size={13} />
                      {item.comments.length}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* MODAL XEM CHI TIẾT ẢNH & BÌNH LUẬN */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl bg-[#001529] border border-white/15 p-5 sm:p-6 text-white shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 hover:text-white"
            >
              <X size={16} />
            </button>

            {/* Media Box */}
            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center mb-4 border border-white/10">
              {activePhoto.imgSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activePhoto.imgSrc}
                  alt={activePhoto.title}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className={`h-full w-full bg-gradient-to-br ${activePhoto.color || "from-blue-700 to-indigo-900"} flex flex-col items-center justify-center p-4 text-center`}>
                  {activePhoto.type === "video" ? (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md mb-2">
                        <Play size={28} className="ml-1 text-yellow-300" />
                      </div>
                      <span className="text-xs text-blue-200">Video Recap 15 năm TCDN4</span>
                    </>
                  ) : (
                    <>
                      <Camera size={36} className="text-white/60 mb-2" />
                      <span className="text-xs text-blue-200">Khoảnh khắc thanh xuân K33</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Title & Likes Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="rounded-md bg-cyan-400/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  {activePhoto.category}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  {activePhoto.title}
                </h3>
                {activePhoto.caption && (
                  <p className="text-xs text-blue-200/80 mt-0.5 italic">
                    "{activePhoto.caption}"
                  </p>
                )}
              </div>

              {/* Like Button */}
              <button
                onClick={() => handleToggleLike(activePhoto.id)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
                  likedPhotoIds.includes(activePhoto.id)
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Heart size={14} className={likedPhotoIds.includes(activePhoto.id) ? "fill-rose-500 text-rose-500" : ""} />
                {activePhoto.likes} Thích
              </button>
            </div>

            {/* Comments Feed */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2.5 flex items-center gap-1.5">
                <MessageSquare size={13} /> Bình luận ({activePhoto.comments.length})
              </h4>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {activePhoto.comments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    Chưa có bình luận nào. Hãy là người đầu tiên để lại lời nhắn!
                  </p>
                ) : (
                  activePhoto.comments.map((c) => (
                    <div key={c.id} className="rounded-xl bg-white/5 p-2.5 border border-white/5 text-xs">
                      <div className="flex items-center justify-between font-bold text-cyan-300 text-[11px]">
                        <span>{c.author}</span>
                        <span className="text-[10px] font-normal text-slate-400">{c.createdAt}</span>
                      </div>
                      <p className="text-slate-200 mt-0.5">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder={user ? "Viết bình luận cho bức ảnh này..." : "Đăng nhập để tham gia bình luận..."}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-cyan-400 transition-colors flex items-center gap-1"
                >
                  <Send size={12} /> Gửi
                </button>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* Modal Upload ảnh mới */}
      {isUploadOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsUploadOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 text-slate-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsUploadOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold text-ueh mb-1 flex items-center gap-1.5">
              <Upload size={18} className="text-blue-600" /> Thêm Ảnh Vào Album Kỷ Niệm
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Chia sẻ hình ảnh đẹp cùng tập thể cựu sinh viên TCDN4 K33
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Tên ảnh / Khoảnh khắc *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Canteen Cơ sở B giờ giải lao..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Chủ đề
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                >
                  <option value="Hội ngộ">Hội ngộ K33</option>
                  <option value="Lễ Tốt Nghiệp">Lễ Tốt Nghiệp 2011</option>
                  <option value="Quân sự">Học quân sự</option>
                  <option value="Giảng đường B">Giảng đường Cơ sở B</option>
                  <option value="Kỷ niệm chung">Kỷ niệm chung</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Chú thích ngắn (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="VD: Nhớ những buổi trưa chép bài cùng nhau..."
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-ueh focus:outline-none"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-ueh px-5 py-2 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Tải Lên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}
