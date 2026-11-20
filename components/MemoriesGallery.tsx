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
  ChevronLeft, 
  ChevronRight, 
  Pin, 
  Trash2, 
  ArrowLeft, 
  Loader2,
  FolderHeart
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";

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
  topic?: string;
  album?: string;
  subTopic?: string;
  caption?: string;
  likes: number;
  comments: CommentItem[];
  uploader: string;
  uploaderClass?: string;
  createdAt: number;
  isPinned?: boolean;
}

export interface GalleryTaxonomy {
  topics: string[];
  albumsMap: Record<string, string[]>;
}

export const DEFAULT_TAXONOMY: GalleryTaxonomy = {
  topics: [
    "Thời sinh viên",
    "Dã ngoại",
    "Hiện tại",
    "Du lịch, gặp gỡ",
    "Kỷ niệm 15 năm",
    "Khác",
  ],
  albumsMap: {
    "Thời sinh viên": ["Lễ tốt nghiệp", "Ảnh giảng đường", "Đời sinh viên"],
    "Dã ngoại": ["Dã ngoại & Cắm trại", "Chuyến đi thực tế"],
    "Hiện tại": ["Gia đình & Cuộc sống", "Công việc & Sự nghiệp"],
    "Du lịch, gặp gỡ": ["Họp lớp & Hội ngộ", "Du lịch bạn bè"],
    "Kỷ niệm 15 năm": ["Hội ngộ 15 năm (2026)", "Áo kỷ niệm"],
    "Khác": ["Khoảnh khắc khác", "Ảnh đóng góp"],
  },
};

export const DEFAULT_TOPICS = DEFAULT_TAXONOMY.topics;
export const DEFAULT_ALBUMS_MAP = DEFAULT_TAXONOMY.albumsMap;

// Hàm chuẩn hóa chủ đề
export function resolveTopic(t?: string, validTopics?: string[]): string {
  if (!t || t.trim() === "" || t === "Chưa phân loại" || t === "Kỷ niệm" || t === "all") {
    return validTopics && validTopics.length > 0 ? validTopics[0] : "Khác";
  }
  const clean = t.trim();
  if (validTopics && validTopics.length > 0) {
    if (validTopics.includes(clean)) return clean;
    if (clean === "Cuộc sống hiện tại" && validTopics.includes("Hiện tại")) return "Hiện tại";
    if (clean === "Dã ngoại & du lịch" && validTopics.includes("Dã ngoại")) return "Dã ngoại";
    if (clean === "Họp lớp, hẹn hò" && validTopics.includes("Du lịch, gặp gỡ")) return "Du lịch, gặp gỡ";
    if (clean === "Hội ngộ 15 năm (2026)" && validTopics.includes("Kỷ niệm 15 năm")) return "Kỷ niệm 15 năm";
    return validTopics[0];
  }
  return clean;
}

// Hàm chuẩn hóa bộ ảnh trong từng chủ đề
export function resolveAlbum(
  photo: Partial<AlbumPhoto>,
  topic: string,
  albumsMap: Record<string, string[]> = DEFAULT_ALBUMS_MAP
): string {
  const alb = (photo.album || photo.subTopic || "").trim();
  const availableAlbums = albumsMap[topic] || [];
  if (alb && (availableAlbums.length === 0 || availableAlbums.includes(alb))) {
    return alb;
  }
  
  const title = (photo.title || "").toLowerCase();
  if (topic === "Thời sinh viên") {
    if (title.includes("tốt nghiệp") || title.includes("tot nghiep")) {
      if (availableAlbums.includes("Lễ tốt nghiệp")) return "Lễ tốt nghiệp";
    }
    if (title.includes("giảng đường") || title.includes("lớp học") || title.includes("lop")) {
      if (availableAlbums.includes("Ảnh giảng đường")) return "Ảnh giảng đường";
    }
    if (title.includes("sinh viên") || title.includes("ktx") || title.includes("kí túc")) {
      if (availableAlbums.includes("Đời sinh viên")) return "Đời sinh viên";
    }
  }
  return availableAlbums.length > 0 ? availableAlbums[0] : "Ảnh chung";
}

// Hàm chuẩn hóa một đối tượng ảnh
export function normalizePhoto(
  p: any, 
  validTopics: string[] = DEFAULT_TOPICS,
  albumsMap: Record<string, string[]> = DEFAULT_ALBUMS_MAP
): AlbumPhoto {
  const topic = resolveTopic(p.topic || p.category, validTopics);
  const album = resolveAlbum(p, topic, albumsMap);
  return {
    id: p.id || `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: p.title || "Ảnh kỷ niệm",
    imgSrc: p.imgSrc || p.image_url || "/images/ueh-group.jpg",
    type: p.type || "image",
    category: topic,
    topic: topic,
    album: album,
    subTopic: album,
    caption: p.caption || "",
    likes: typeof p.likes === "number" ? p.likes : 0,
    comments: Array.isArray(p.comments) ? p.comments : [],
    uploader: p.uploader || p.user_id || "Ban liên lạc (Admin)",
    uploaderClass: p.uploaderClass || "TC10",
    createdAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
    isPinned: Boolean(p.isPinned),
  };
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
const TAXONOMY_STORAGE_KEY = "tcdn4_gallery_taxonomy";

// Hàm nén ảnh Client-side bằng Canvas
async function compressImageFile(file: File, maxWidth = 1920, quality = 0.85): Promise<string> {
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
  const [taxonomy, setTaxonomy] = useState<GalleryTaxonomy>(DEFAULT_TAXONOMY);
  const [activePhoto, setActivePhoto] = useState<AlbumPhoto | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [likedPhotoIds, setLikedPhotoIds] = useState<string[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Điều hướng:
  // selectedTopic: "all" (Xem tất cả các bộ ảnh) hoặc tên chủ đề cụ thể (VD: "Thời sinh viên")
  const [selectedTopic, setSelectedTopic] = useState<string>("Thời sinh viên");
  // selectedAlbum: null (Hiển thị danh sách các bộ ảnh của chủ đề đó) hoặc tên bộ ảnh cụ thể (VD: "Lễ tốt nghiệp")
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  // Multi-upload state
  const [stagedFiles, setStagedFiles] = useState<StagedUploadFile[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState("");
  const [isSubmittingCloud, setIsSubmittingCloud] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [batchUploaderName, setBatchUploaderName] = useState("");
  const [batchClass, setBatchClass] = useState<"TC10" | "TC11" | "TC12">("TC10");
  const [batchCommonCaption, setBatchCommonCaption] = useState("");

  // Upload Topic & Album state
  const [activeUploadTopic, setActiveUploadTopic] = useState<string>(DEFAULT_TOPICS[0]);
  const [activeUploadAlbum, setActiveUploadAlbum] = useState<string>("");
  const [isCustomTopic, setIsCustomTopic] = useState(false);
  const [customTopicName, setCustomTopicName] = useState("");
  const [isCustomAlbum, setIsCustomAlbum] = useState(false);
  const [customAlbumName, setCustomAlbumName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tải danh sách ảnh và cấu trúc taxonomy từ Supabase Cloud và cache localStorage
  const loadStoredPhotos = useCallback(async () => {
    const list: AlbumPhoto[] = [];
    const seenIds = new Set<string>();

    let currentTaxonomy = DEFAULT_TAXONOMY;
    let localTax: (GalleryTaxonomy & { updatedAt?: number }) | null = null;

    // 1. Đọc taxonomy từ cache localStorage trước
    try {
      const storedTax = localStorage.getItem(TAXONOMY_STORAGE_KEY);
      if (storedTax) {
        const parsedTax = JSON.parse(storedTax);
        if (parsedTax && Array.isArray(parsedTax.topics) && parsedTax.topics.length > 0) {
          localTax = parsedTax;
          currentTaxonomy = parsedTax;
          setTaxonomy(parsedTax);
        }
      }
    } catch {}

    // 2. Tải ảnh & taxonomy từ Supabase Cloud qua API /api/gallery (no-store)
    try {
      const res = await fetch("/api/gallery", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.taxonomy && Array.isArray(data.taxonomy.topics) && data.taxonomy.topics.length > 0) {
          const serverUpdated = data.taxonomy.updatedAt || 0;
          const localUpdated = localTax?.updatedAt || 0;
          if (serverUpdated >= localUpdated || !localTax) {
            currentTaxonomy = data.taxonomy;
            setTaxonomy(data.taxonomy);
            try {
              localStorage.setItem(TAXONOMY_STORAGE_KEY, JSON.stringify(data.taxonomy));
            } catch {}
          }
        }
        if (data.photos && Array.isArray(data.photos)) {
          data.photos.forEach((rawP: any) => {
            const p = normalizePhoto(rawP, currentTaxonomy.topics, currentTaxonomy.albumsMap);
            if (!seenIds.has(p.id)) {
              list.push(p);
              seenIds.add(p.id);
            }
          });
        }
      }
    } catch (err) {
      console.warn("Lỗi tải ảnh qua API /api/gallery:", err);
    }

    // 2. Kết hợp với ảnh trong localStorage nếu có
    try {
      const storedTax = localStorage.getItem(TAXONOMY_STORAGE_KEY);
      if (storedTax) {
        const parsedTax = JSON.parse(storedTax);
        if (parsedTax && Array.isArray(parsedTax.topics) && parsedTax.topics.length > 0) {
          currentTaxonomy = parsedTax;
          setTaxonomy(parsedTax);
        }
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((rawP: any) => {
            const p = normalizePhoto(rawP, currentTaxonomy.topics, currentTaxonomy.albumsMap);
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
    const normalized = newPhotos.map((p) => normalizePhoto(p, taxonomy.topics, taxonomy.albumsMap));
    setPhotos(normalized);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("tcdn4_memories_updated"));
      }
    } catch {}
  };

  // Danh sách toàn bộ chủ đề: taxonomy.topics là Source of Truth
  const allTopics = useMemo(() => {
    return taxonomy.topics;
  }, [taxonomy.topics]);

  // Lấy danh sách các bộ ảnh theo chủ đề đã chọn: taxonomy.albumsMap là Source of Truth
  const getAlbumsForTopic = useCallback((topicName: string): string[] => {
    return taxonomy.albumsMap[topicName] || ["Ảnh chung"];
  }, [taxonomy.albumsMap]);

  // Cập nhật album mặc định khi thay đổi upload topic
  useEffect(() => {
    const albums = getAlbumsForTopic(activeUploadTopic);
    if (albums.length > 0 && (!activeUploadAlbum || !albums.includes(activeUploadAlbum))) {
      setActiveUploadAlbum(albums[0]);
    }
  }, [activeUploadTopic, activeUploadAlbum, getAlbumsForTopic]);

  // Danh sách các bộ ảnh trong Chủ đề đang chọn (hoặc tất cả các bộ ảnh nếu chọn "Tất cả")
  const currentTopicAlbums = useMemo(() => {
    if (selectedTopic === "all") {
      const result: {
        name: string;
        topic: string;
        photos: AlbumPhoto[];
        count: number;
        coverPhoto: AlbumPhoto | null;
      }[] = [];

      allTopics.forEach((top) => {
        const albumNames = getAlbumsForTopic(top);
        albumNames.forEach((albName) => {
          const albPhotos = photos
            .filter((p) => p.topic === top && resolveAlbum(p, top, taxonomy.albumsMap) === albName)
            .sort((a, b) => {
              if (a.isPinned && !b.isPinned) return -1;
              if (!a.isPinned && b.isPinned) return 1;
              return (b.createdAt || 0) - (a.createdAt || 0);
            });

          // Chỉ hiện nếu có ảnh hoặc là album mặc định trong taxonomy
          if (albPhotos.length > 0 || (taxonomy.albumsMap[top] && taxonomy.albumsMap[top].includes(albName))) {
            result.push({
              name: albName,
              topic: top,
              photos: albPhotos,
              count: albPhotos.length,
              coverPhoto: albPhotos[0] || null,
            });
          }
        });
      });
      return result;
    }

    const albumNames = getAlbumsForTopic(selectedTopic);
    return albumNames.map((albName) => {
      const albPhotos = photos
        .filter((p) => p.topic === selectedTopic && resolveAlbum(p, selectedTopic, taxonomy.albumsMap) === albName)
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });

      return {
        name: albName,
        topic: selectedTopic,
        photos: albPhotos,
        count: albPhotos.length,
        coverPhoto: albPhotos[0] || null,
      };
    });
  }, [photos, selectedTopic, allTopics, getAlbumsForTopic, taxonomy.albumsMap]);

  // Danh sách ảnh đang hiển thị trong bộ ảnh được chọn
  const currentDisplayPhotos = useMemo(() => {
    if (selectedAlbum) {
      if (selectedTopic === "all") {
        return photos.filter((p) => resolveAlbum(p, p.topic || "Khác", taxonomy.albumsMap) === selectedAlbum);
      }
      return photos.filter(
        (p) => p.topic === selectedTopic && resolveAlbum(p, selectedTopic, taxonomy.albumsMap) === selectedAlbum
      );
    }
    if (selectedTopic === "all") return photos;
    return photos.filter((p) => p.topic === selectedTopic);
  }, [photos, selectedTopic, selectedAlbum, taxonomy.albumsMap]);

  // Sắp xếp ảnh: Ghim lên đầu, tiếp đến là mới nhất
  const sortedPhotos = useMemo(() => {
    return [...currentDisplayPhotos].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [currentDisplayPhotos]);

  // Lightbox navigation
  const handleNextPhoto = useCallback(() => {
    if (!activePhoto || sortedPhotos.length <= 1) return;
    const currentIndex = sortedPhotos.findIndex((p) => p.id === activePhoto.id);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % sortedPhotos.length;
    if (sortedPhotos[nextIndex]) {
      setActivePhoto(sortedPhotos[nextIndex]);
    }
  }, [activePhoto, sortedPhotos]);

  const handlePrevPhoto = useCallback(() => {
    if (!activePhoto || sortedPhotos.length <= 1) return;
    const currentIndex = sortedPhotos.findIndex((p) => p.id === activePhoto.id);
    const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + sortedPhotos.length) % sortedPhotos.length;
    if (sortedPhotos[prevIndex]) {
      setActivePhoto(sortedPhotos[prevIndex]);
    }
  }, [activePhoto, sortedPhotos]);

  // Phím mũi tên & Esc khi xem ảnh
  useEffect(() => {
    if (!activePhoto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        handleNextPhoto();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        handlePrevPhoto();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setActivePhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhoto, handleNextPhoto, handlePrevPhoto]);

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
        p.id === photoId ? { ...p, likes: Math.max(0, (p.likes || 0) - 1) } : p
      );
      if (activePhoto?.id === photoId) {
        setActivePhoto((prev) => (prev ? { ...prev, likes: Math.max(0, (prev.likes || 0) - 1) } : null));
      }
    } else {
      setLikedPhotoIds([...likedPhotoIds, photoId]);
      updatedPhotos = photos.map((p) =>
        p.id === photoId ? { ...p, likes: (p.likes || 0) + 1 } : p
      );
      if (activePhoto?.id === photoId) {
        setActivePhoto((prev) => (prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null));
      }
      toast.success("Đã thả tim kỷ niệm!");
    }
    savePhotos(updatedPhotos);
  };

  const handleTogglePin = (photoId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) {
      toast.error("Chỉ Ban Liên Lạc (Admin) mới có quyền ghim ảnh!");
      return;
    }
    let nextState = false;
    const updated = photos.map((p) => {
      if (p.id === photoId) {
        nextState = !p.isPinned;
        toast.success(nextState ? "Đã ghim ảnh lên đầu bộ ảnh!" : "Đã bỏ ghim ảnh");
        return { ...p, isPinned: nextState };
      }
      return p;
    });
    savePhotos(updated);
    if (activePhoto?.id === photoId) {
      setActivePhoto((prev) => (prev ? { ...prev, isPinned: !prev.isPinned } : null));
    }

    // Đồng bộ lên Cloud
    fetch("/api/gallery", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photoId, isPinned: nextState }),
    }).catch(() => {});
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

    fetch(`/api/gallery?id=${photoId}`, { method: "DELETE" }).catch(() => {});
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

    const currentComments = Array.isArray(activePhoto.comments) ? activePhoto.comments : [];
    const updatedComments = [...currentComments, newComment];
    const updatedPhoto = { ...activePhoto, comments: updatedComments };

    setActivePhoto(updatedPhoto);
    const updatedAll = photos.map((p) => (p.id === activePhoto.id ? updatedPhoto : p));
    savePhotos(updatedAll);
    setCommentInput("");
    toast.success("Đã đăng bình luận!");
  };

  // Chọn nhiều ảnh và nén tự động
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
        const compressedBase64 = await compressImageFile(f, 1600, 0.8);
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

    const rawTopic = isCustomTopic
      ? (customTopicName.trim() || "Khác")
      : (activeUploadTopic || "Khác");
    const finalTopic = resolveTopic(rawTopic);

    // Xác định tên Bộ ảnh
    const rawAlbum = isCustomAlbum
      ? (customAlbumName.trim() || "Ảnh kỷ niệm mới")
      : (activeUploadAlbum.trim() || "Ảnh chung");
    const finalAlbum = rawAlbum.trim() || "Ảnh chung";

    const defaultUploader =
      profile?.full_name?.trim() ||
      user.email?.split("@")[0] ||
      batchUploaderName.trim() ||
      "Cựu sinh viên K33";

    const resolvedClass =
      (profile?.class_name as any) ||
      batchClass ||
      "TC10";

    const now = Date.now();
    const newPhotos: AlbumPhoto[] = [];

    // Gửi lần lượt từng ảnh
    const total = stagedFiles.length;
    for (let i = 0; i < total; i++) {
      const staged = stagedFiles[i];
      setUploadProgressText(`Đang tải ảnh ${i + 1}/${total} vào bộ ảnh "${finalAlbum}"...`);

      try {
        const formData = new FormData();
        formData.append("files", staged.file);
        formData.append("topic", finalTopic);
        formData.append("album", finalAlbum);
        formData.append("subTopic", finalAlbum);
        formData.append("uploader", defaultUploader);
        formData.append("uploaderClass", resolvedClass);
        formData.append("title", staged.title.trim() || `Ảnh kỷ niệm ${i + 1}`);
        if (staged.caption.trim() || batchCommonCaption.trim()) {
          formData.append("caption", staged.caption.trim() || batchCommonCaption.trim());
        }
        if (staged.isPinned && isAdmin) {
          formData.append("isPinned", "true");
        }

        const res = await fetch("/api/gallery", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const result = await res.json();
          if (result.success && Array.isArray(result.addedPhotos)) {
            result.addedPhotos.forEach((ap: any) => {
              newPhotos.push(normalizePhoto(ap, taxonomy.topics, taxonomy.albumsMap));
            });
          }
        }
      } catch (err) {
        console.warn("Lỗi upload qua API, chuyển sang lưu ảnh nén:", err);
      }
    }

    // Fallback nếu có ảnh chưa được server ghi nhận
    if (newPhotos.length === 0) {
      for (let idx = 0; idx < stagedFiles.length; idx++) {
        const staged = stagedFiles[idx];
        const photoId = `p-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`;
        newPhotos.push(normalizePhoto({
          id: photoId,
          title: staged.title.trim() || `Ảnh kỷ niệm ${idx + 1}`,
          imgSrc: staged.preview,
          type: "image",
          category: finalTopic,
          topic: finalTopic,
          album: finalAlbum,
          subTopic: finalAlbum,
          caption: staged.caption.trim() || batchCommonCaption.trim() || undefined,
          likes: 1,
          comments: [],
          uploader: defaultUploader,
          uploaderClass: resolvedClass,
          createdAt: now + idx,
          isPinned: staged.isPinned && isAdmin,
        }, taxonomy.topics, taxonomy.albumsMap));
      }
    }

    // Gộp ảnh vào danh sách
    const updated = [...newPhotos, ...photos];
    savePhotos(updated);

    // Reset form & chuyển thẳng đến bộ ảnh vừa upload
    setStagedFiles([]);
    setIsUploadOpen(false);
    setBatchCommonCaption("");
    setIsSubmittingCloud(false);
    setUploadProgressText("");
    setSelectedTopic(finalTopic);
    setSelectedAlbum(finalAlbum);
    setIsCustomTopic(false);
    setCustomTopicName("");
    setIsCustomAlbum(false);
    setCustomAlbumName("");

    toast.success(`Đã đăng tải thành công ${newPhotos.length} ảnh vào bộ ảnh "${finalAlbum}"!`);
  };

  return (
    <section id="memories" className="scroll-mt-16 bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100 py-12 sm:py-16 relative border-t border-slate-200/60 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* Header với Tiêu đề & Nút Đóng góp ảnh */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3.5 py-1 text-xs font-bold text-ueh uppercase tracking-wide mb-2.5">
              <Sparkles size={14} className="text-ueh-orange" /> Thư viện ảnh 15 năm
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-ueh tracking-tight leading-tight">
              Góc Kỷ Niệm TCDN4
            </h2>
            <div className="mt-2 h-1 w-20 rounded-full bg-gradient-to-r from-ueh to-ueh-orange" />
            <p className="mt-2.5 max-w-xl text-xs sm:text-sm text-slate-600">
              Khám phá các bộ ảnh ký ức thanh xuân của lớp. Bấm vào từng bộ ảnh để mở xem toàn bộ ảnh dạng lưới album.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-end">
            <button
              onClick={() => {
                if (!user) {
                  toast.error("Vui lòng đăng nhập để đóng góp ảnh kỷ niệm!");
                  openLogin();
                  return;
                }
                if (selectedTopic !== "all") {
                  setActiveUploadTopic(selectedTopic);
                  if (selectedAlbum) {
                    setActiveUploadAlbum(selectedAlbum);
                  }
                }
                setIsUploadOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-ueh px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-ueh-light transition-all active:scale-95"
            >
              <Upload size={16} /> Đóng Góp Ảnh
            </button>
          </div>
        </div>

        {/* THANH CHỌN CHỦ ĐỀ CHÍNH - 1 HÀNG DUY NHẤT TRÊN CẢ MOBILE & DESKTOP (KHÔNG NGẮT DÒNG) */}
        <div className="mb-6 flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          <button
            onClick={() => {
              setSelectedTopic("all");
              setSelectedAlbum(null);
            }}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              selectedTopic === "all"
                ? "bg-ueh text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:border-ueh hover:text-ueh"
            }`}
          >
            <span>Tất cả</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              selectedTopic === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {photos.length}
            </span>
          </button>

          {allTopics.map((topic) => {
            const count = photos.filter((p) => p.topic === topic).length;
            const isSelected = selectedTopic === topic;
            return (
              <button
                key={topic}
                onClick={() => {
                  setSelectedTopic(topic);
                  setSelectedAlbum(null);
                }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
                  isSelected
                    ? "bg-ueh text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-ueh hover:text-ueh"
                }`}
              >
                <span>{topic}</span>
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

        {/* =========================================================================
            TRƯỜNG HỢP 1: HIỂN THỊ DANH SÁCH CÁC BỘ ẢNH (KHI CHƯA CHỌN BỘ ẢNH CỤ THỂ)
            - Trình bày dạng card xếp tầng theo hình ảnh mẫu
            - Trên mobile: hiển thị 2 cột (grid-cols-2)
            - Có chữ tên của bộ ảnh ở góc dưới
            - KHÔNG hiển thị số ảnh, KHÔNG có chữ "Xòe bài"
            ========================================================================= */}
        {!selectedAlbum ? (
          currentTopicAlbums.length === 0 ? (
            <div className="relative rounded-3xl border-2 border-dashed border-blue-200/90 bg-white/80 p-8 sm:p-14 text-center backdrop-blur-sm shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-ueh shadow-inner">
                <Camera size={32} className="text-ueh" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-ueh">
                Chưa có bộ ảnh nào trong chủ đề "{selectedTopic}"
              </h3>
              <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-500">
                Hãy là người đầu tiên đóng góp bức ảnh kỷ niệm cho chủ đề này!
              </p>
              <div className="mt-5 flex justify-center">
                <button
                  onClick={() => {
                    if (!user) {
                      toast.error("Vui lòng đăng nhập để đóng góp ảnh!");
                      openLogin();
                      return;
                    }
                    setActiveUploadTopic(selectedTopic !== "all" ? selectedTopic : DEFAULT_TOPICS[0]);
                    setIsUploadOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-ueh px-5 py-2.5 text-xs font-bold text-white shadow-md hover:scale-105 transition-all"
                >
                  <Upload size={15} /> Đóng Góp Ảnh Đầu Tiên
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {currentTopicAlbums.map((alb) => (
                <div
                  key={`${alb.topic}-${alb.name}`}
                  onClick={() => setSelectedAlbum(alb.name)}
                  className="group relative cursor-pointer select-none transition-all duration-300 hover:-translate-y-1"
                  title={`Bấm để mở xem bộ ảnh "${alb.name}"`}
                >
                  {/* Hiệu ứng thẻ xếp tầng phía sau (Stacked photo deck effect) */}
                  <div className="absolute inset-0 rounded-2xl bg-white border border-slate-200/80 shadow-md translate-x-2 -translate-y-1.5 opacity-60 transition-transform duration-300 group-hover:translate-x-2.5 group-hover:-translate-y-2" />
                  <div className="absolute inset-0 rounded-2xl bg-white border border-slate-200/90 shadow-md translate-x-1 -translate-y-0.5 opacity-80 transition-transform duration-300 group-hover:translate-x-1.5 group-hover:-translate-y-1" />

                  {/* Thẻ chính hiển thị ảnh bìa tràn viền */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900 shadow-md border-2 border-white transition-all duration-300 group-hover:shadow-xl">
                    {alb.coverPhoto ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={alb.coverPhoto.imgSrc}
                        alt={alb.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 text-slate-400">
                        <Camera size={28} className="text-slate-300" />
                      </div>
                    )}

                    {/* Lớp phủ chuyển màu đen mượt ở chân ảnh */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-2.5 sm:p-3 pt-8 flex items-end">
                      <span className="text-xs sm:text-sm font-bold text-white drop-shadow-md truncate">
                        {alb.name}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* =========================================================================
              TRƯỜNG HỢP 2: ĐANG MỞ BỘ ẢNH (selectedAlbum !== null)
              - Xổ ra trực tiếp dạng LƯỚI ALBUM (bỏ hẳn kiểu thẻ bài xòe)
              - Có nút quay lại danh sách bộ ảnh gọn gàng
              - Chỉ Admin mới có quyền ghim ảnh
              ========================================================================= */
          <div className="space-y-5">
            {/* Thanh tiêu đề & nút quay lại tối giản */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedAlbum(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-ueh hover:text-ueh shadow-2xs transition-all"
              >
                <ArrowLeft size={14} /> Quay lại danh sách bộ ảnh
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-ueh bg-white px-3.5 py-1.5 rounded-full border border-blue-200/80 shadow-2xs truncate">
                  Bộ ảnh: {selectedAlbum}
                </span>
                
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      toast.error("Vui lòng đăng nhập để đóng góp ảnh!");
                      openLogin();
                      return;
                    }
                    setActiveUploadTopic(selectedTopic !== "all" ? selectedTopic : DEFAULT_TOPICS[0]);
                    setActiveUploadAlbum(selectedAlbum);
                    setIsCustomAlbum(false);
                    setIsUploadOpen(true);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ueh px-3.5 py-1.5 text-xs font-bold text-white hover:bg-ueh-light transition-all shadow-2xs"
                >
                  <Upload size={13} /> Thêm ảnh vào bộ này
                </button>
              </div>
            </div>

            {/* Lưới ảnh trong bộ ảnh */}
            {sortedPhotos.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-blue-200/90 bg-white/80 p-8 sm:p-12 text-center">
                <Camera size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Bộ ảnh "{selectedAlbum}" chưa có ảnh nào</p>
                <button
                  onClick={() => {
                    if (!user) {
                      toast.error("Vui lòng đăng nhập để đóng góp ảnh!");
                      openLogin();
                      return;
                    }
                    setActiveUploadTopic(selectedTopic !== "all" ? selectedTopic : DEFAULT_TOPICS[0]);
                    setActiveUploadAlbum(selectedAlbum);
                    setIsUploadOpen(true);
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white shadow-xs"
                >
                  <Upload size={14} /> Tải ảnh vào bộ này
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {sortedPhotos.slice(0, visibleCount).map((item) => {
                    const isLiked = likedPhotoIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => setActivePhoto(item)}
                        className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-2 sm:p-2.5 pb-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imgSrc}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Badge ghim nổi bật */}
                          {item.isPinned && (
                            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2 py-0.5 text-[9px] font-black text-slate-950 shadow-md">
                              <Pin size={10} className="fill-slate-950" /> Ghim đầu
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <div className="mt-2 px-1">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-ueh transition-colors truncate">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => handleToggleLike(item.id, e)}
                                className={`flex items-center gap-0.5 text-[11px] font-bold ${
                                  isLiked ? "text-rose-500" : "text-slate-400 hover:text-rose-500"
                                }`}
                                title="Thả tim"
                              >
                                <Heart size={12} className={isLiked ? "fill-rose-500" : ""} />
                                <span>{item.likes}</span>
                              </button>

                              {/* CHỈ ADMIN MỚI THẤY VÀ THAO TÁC NÚT GHIM ẢNH */}
                              {isAdmin && (
                                <button
                                  onClick={(e) => handleTogglePin(item.id, e)}
                                  className={`p-1 rounded-full transition-colors ${
                                    item.isPinned ? "text-amber-500 bg-amber-50" : "text-slate-300 hover:text-amber-500 hover:bg-slate-100"
                                  }`}
                                  title={item.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                                >
                                  <Pin size={12} className={item.isPinned ? "fill-amber-500" : ""} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            Bởi: {item.uploader}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {visibleCount < sortedPhotos.length && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 16)}
                      className="rounded-full bg-white px-6 py-2.5 text-xs font-bold text-ueh border border-slate-300 hover:border-ueh shadow-2xs transition-all"
                    >
                      Xem thêm {sortedPhotos.length - visibleCount} ảnh khác...
                    </button>
                  </div>
                )}
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-1 sm:p-3 md:p-6 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative flex h-[96vh] md:h-[90vh] w-full max-w-[98vw] xl:max-w-[1450px] 2xl:max-w-[1600px] flex-col overflow-hidden rounded-2xl sm:rounded-3xl bg-slate-900 text-white shadow-2xl md:flex-row"
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
            <div
              onClick={handleNextPhoto}
              className="relative flex flex-1 h-[58vh] xs:h-[62vh] md:h-full items-center justify-center bg-black p-1 sm:p-3 md:p-6 cursor-pointer select-none group overflow-hidden"
              title="Click vào ảnh để chuyển ảnh kế tiếp (hoặc dùng phím mũi tên ◀ ▶)"
            >
              {sortedPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevPhoto();
                  }}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/20"
                  title="Ảnh trước đó (Phím ◀)"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {sortedPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextPhoto();
                  }}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-all hover:scale-110 shadow-lg border border-white/20"
                  title="Ảnh kế tiếp (Phím ▶ hoặc Click vào ảnh)"
                >
                  <ChevronRight size={22} />
                </button>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePhoto.imgSrc || "/images/ueh-group.jpg"}
                alt={activePhoto.title || "Ảnh kỷ niệm"}
                className="h-full w-full max-h-[56vh] xs:max-h-[60vh] md:max-h-[85vh] object-contain rounded-xl shadow-2xl transition-all duration-200"
              />

              {/* Badge số thứ tự ảnh */}
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-md border border-white/20 shadow-md pointer-events-none">
                <span>
                  Ảnh {Math.max(1, sortedPhotos.findIndex((p) => p.id === activePhoto.id) + 1)} / {Math.max(1, sortedPhotos.length)}
                </span>
                <span className="text-slate-400 hidden sm:inline">• Click ảnh hoặc bấm phím ◀ ▶</span>
              </div>
            </div>

            {/* Cột bình luận và thông tin */}
            <div className="flex flex-1 md:flex-initial w-full md:w-80 lg:w-96 flex-col justify-between border-t md:border-t-0 md:border-l border-white/10 bg-slate-900/95 p-3.5 sm:p-5 overflow-y-auto">
              <div>
                <div className="flex items-start justify-between gap-2 pr-10">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                      {activePhoto.title || "Ảnh kỷ niệm"}
                    </h3>
                    <p className="mt-1 text-xs text-sky-300 font-semibold flex items-center gap-1.5">
                      <User size={12} /> {activePhoto.uploader || "Thành viên TCDN4"}
                      {activePhoto.uploaderClass && (
                        <span className="rounded bg-blue-900/80 px-1.5 py-0.2 text-[10px] text-sky-200 border border-blue-500/30">
                          {activePhoto.uploaderClass}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {activePhoto.album ? `Bộ ảnh: ${activePhoto.album}` : ""}
                    </p>
                  </div>

                  {/* CHỈ ADMIN MỚI THẤY VÀ THAO TÁC NÚT GHIM ĐẦU TRONG LIGHTBOX */}
                  {isAdmin && (
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
                  )}
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
                    <span>{typeof activePhoto.likes === "number" ? activePhoto.likes : 0} Thích</span>
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
                    <MessageSquare size={13} /> Bình luận ({(activePhoto.comments || []).length})
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar pr-1">
                    {(!activePhoto.comments || activePhoto.comments.length === 0) ? (
                      <p className="text-[11px] text-slate-500 italic py-2">
                        Chưa có bình luận nào. Hãy để lại lời nhắn đầu tiên!
                      </p>
                    ) : (
                      activePhoto.comments.map((c) => (
                        <div key={c.id} className="rounded-xl bg-white/5 p-2 text-xs border border-white/5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                            <strong className="text-sky-300">{c.author || "Thành viên"}</strong>
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
          MODAL UPLOAD NHIỀU ẢNH
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
                <h3 className="text-lg font-black text-ueh">Đóng Góp Ảnh Kỷ Niệm</h3>
                <p className="text-xs text-slate-500">
                  Chọn chủ đề và bộ ảnh muốn đăng tải vào góc ký ức TCDN4.
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
              
              {/* Bước 1: Chọn Chủ đề chính */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Chọn chủ đề kỷ niệm:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={isCustomTopic ? "__custom__" : activeUploadTopic}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setIsCustomTopic(true);
                      } else {
                        setIsCustomTopic(false);
                        setActiveUploadTopic(e.target.value);
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-ueh focus:border-ueh focus:outline-none"
                  >
                    {allTopics.map((top) => (
                      <option key={top} value={top}>
                        Chủ đề: {top}
                      </option>
                    ))}
                    {isAdmin && <option value="__custom__">+ Tạo chủ đề mới (Admin)...</option>}
                  </select>

                  {isCustomTopic && (
                    <input
                      type="text"
                      placeholder="Tên chủ đề mới..."
                      value={customTopicName}
                      onChange={(e) => setCustomTopicName(e.target.value)}
                      className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 placeholder:font-normal focus:border-ueh focus:ring-1 focus:ring-ueh focus:outline-none"
                      autoFocus
                    />
                  )}
                </div>

                {/* Bước 2: Chọn Bộ ảnh trong chủ đề đó */}
                <div className="mt-3 pt-3 border-t border-slate-200/80">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    2. Chọn bộ ảnh:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={isCustomAlbum ? "__custom_album__" : activeUploadAlbum}
                      onChange={(e) => {
                        if (e.target.value === "__custom_album__") {
                          setIsCustomAlbum(true);
                        } else {
                          setIsCustomAlbum(false);
                          setActiveUploadAlbum(e.target.value);
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-ueh focus:outline-none"
                    >
                      {getAlbumsForTopic(isCustomTopic && customTopicName.trim() ? customTopicName.trim() : activeUploadTopic).map((alb) => (
                        <option key={alb} value={alb}>
                          Bộ ảnh: {alb}
                        </option>
                      ))}
                      <option value="__custom_album__">+ Tạo bộ ảnh mới bằng tên riêng...</option>
                    </select>

                    {isCustomAlbum && (
                      <input
                        type="text"
                        placeholder="Gõ tên bộ ảnh mới (VD: Lễ tốt nghiệp, Họp mặt...)"
                        value={customAlbumName}
                        onChange={(e) => setCustomAlbumName(e.target.value)}
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 placeholder:font-normal focus:border-ueh focus:ring-1 focus:ring-ueh focus:outline-none"
                        autoFocus
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Vùng chọn ảnh */}
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
                    3. Bấm để chọn nhiều ảnh từ thiết bị
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Hỗ trợ JPG, PNG, WEBP (Tự động nén thông minh từng ảnh để upload siêu tốc)
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
                      Đã chọn ({stagedFiles.length} ảnh):
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
                    {stagedFiles.map((item) => (
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
                            placeholder="Ghi chú thêm (tùy chọn)..."
                            value={item.caption}
                            onChange={(e) => updateStagedFile(item.id, "caption", e.target.value)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs focus:bg-white focus:border-ueh focus:outline-none"
                          />
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => updateStagedFile(item.id, "isPinned", !item.isPinned)}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold shrink-0 transition-colors ${
                              item.isPinned
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                            title="Ghim ảnh này lên đầu bộ ảnh"
                          >
                            <Pin size={11} className={item.isPinned ? "fill-amber-800" : ""} />
                            <span className="hidden sm:inline">{item.isPinned ? "Đã ghim" : "Ghim"}</span>
                          </button>
                        )}

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

              {/* Thông tin người đóng góp */}
              <div className="rounded-2xl bg-gradient-to-r from-blue-50/80 via-sky-50/50 to-slate-50 border border-blue-200/80 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ueh text-white font-black text-xs shadow-2xs">
                    {(profile?.full_name || user?.email || "SV").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-500">Đóng góp với tư cách:</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {profile?.full_name || user?.email?.split("@")[0] || "Cựu sinh viên TCDN4"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 border border-blue-200 shadow-2xs">
                  <span className="text-[10px] font-medium text-slate-500">Lớp:</span>
                  <span className="text-xs font-black text-ueh">
                    {profile?.class_name ? `Lớp ${profile.class_name}` : "TC10"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú chung cho toàn bộ đợt tải (tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="VD: Kỷ niệm chụp tại sân Cơ sở B UEH năm 2011..."
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
                      <Upload size={15} /> Đăng Tải {stagedFiles.length > 0 ? `(${stagedFiles.length})` : ""} Ảnh Vào Bộ Sưu Tập
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
