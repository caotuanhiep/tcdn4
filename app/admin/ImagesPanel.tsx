"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { 
  Loader2, 
  Pin, 
  PinOff, 
  Trash2, 
  Upload, 
  Plus, 
  Image as ImageIcon, 
  Link2, 
  FolderHeart, 
  Tag, 
  FolderPlus,
  Layers,
  Settings,
  X,
  Check
} from "lucide-react";
import { useToast } from "@/components/ToastProvider";

const MEMORIES_STORAGE_KEY = "tcdn4_memories_gallery";
const TAXONOMY_STORAGE_KEY = "tcdn4_gallery_taxonomy";

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
export function resolveTopic(t?: string): string {
  if (!t || t.trim() === "" || t === "Chưa phân loại" || t === "Kỷ niệm" || t === "all") {
    return "Khác";
  }
  const clean = t.trim();
  if (clean === "Cuộc sống hiện tại") return "Hiện tại";
  if (clean === "Dã ngoại & du lịch") return "Dã ngoại";
  if (clean === "Họp lớp, hẹn hò") return "Du lịch, gặp gỡ";
  if (clean === "Hội ngộ 15 năm (2026)") return "Kỷ niệm 15 năm";
  return clean;
}

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
    album: "Lễ tốt nghiệp",
  },
];

// Helper nén ảnh thông minh phía Client
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
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === "image/png" ? "image/webp" : (file.type || "image/jpeg");
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              resolve(file);
            } else {
              const newName = file.name.replace(/\.[^/.]+$/, "") + (outputType === "image/webp" ? ".webp" : ".jpg");
              const compressedFile = new File([blob], newName, { type: outputType });
              resolve(compressedFile);
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

export default function ImagesPanel() {
  const toast = useToast();
  const [items, setItems] = useState<any[]>(INITIAL_ADMIN_PHOTOS);
  const [taxonomy, setTaxonomy] = useState<GalleryTaxonomy>(DEFAULT_TAXONOMY);
  
  // Topic Filter & Album Filter
  const [selectedFilterTopic, setSelectedFilterTopic] = useState("all");
  const [selectedFilterAlbum, setSelectedFilterAlbum] = useState("all");

  // Quản lý Taxonomy (Chủ đề & Bộ ảnh)
  const [isTaxonomyManagerOpen, setIsTaxonomyManagerOpen] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [newAlbumInput, setNewAlbumInput] = useState<Record<string, string>>({});

  // Upload Topic & Album
  const [uploadTopic, setUploadTopic] = useState("Thời sinh viên");
  const [isCustomTopic, setIsCustomTopic] = useState(false);
  const [customTopicName, setCustomTopicName] = useState("");
  const [uploadAlbum, setUploadAlbum] = useState("Lễ tốt nghiệp");
  const [isCustomAlbum, setIsCustomAlbum] = useState(false);
  const [customAlbumName, setCustomAlbumName] = useState("");

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [uploadUrl, setUploadUrl] = useState("");
  const [photoTitle, setPhotoTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadingToSupabase, setUploadingToSupabase] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const list: any[] = [];
    const seenIds = new Set<string>();

    let currentTax = DEFAULT_TAXONOMY;

    // 1. Tải ảnh & taxonomy từ API Cloud (/api/gallery)
    try {
      const res = await fetch("/api/gallery");
      if (res.ok) {
        const data = await res.json();
        if (data.taxonomy && Array.isArray(data.taxonomy.topics)) {
          currentTax = data.taxonomy;
          setTaxonomy(data.taxonomy);
          try {
            localStorage.setItem(TAXONOMY_STORAGE_KEY, JSON.stringify(data.taxonomy));
          } catch {}
        }
        if (data.photos && Array.isArray(data.photos)) {
          data.photos.forEach((p: any) => {
            const topic = resolveTopic(p.topic || p.category);
            const alb = (p.album || p.subTopic || (topic === "Thời sinh viên" ? "Lễ tốt nghiệp" : "Ảnh chung")).trim();
            list.push({
              id: p.id,
              image_url: p.imgSrc || p.image_url,
              user_id: p.uploader || "Ban liên lạc (Admin)",
              is_pinned: !!p.isPinned,
              created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
              title: p.title || "Ảnh kỷ niệm",
              topic: topic,
              category: topic,
              album: alb,
              subTopic: alb,
              comments: Array.isArray(p.comments) ? p.comments : [],
              likes: typeof p.likes === "number" ? p.likes : 0,
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
      const storedTax = localStorage.getItem(TAXONOMY_STORAGE_KEY);
      if (storedTax) {
        const parsedTax = JSON.parse(storedTax);
        if (parsedTax && Array.isArray(parsedTax.topics)) {
          currentTax = parsedTax;
          setTaxonomy(parsedTax);
        }
      }

      const stored = localStorage.getItem(MEMORIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            if (!seenIds.has(p.id)) {
              const topic = resolveTopic(p.topic || p.category);
              const alb = (p.album || p.subTopic || "Ảnh chung").trim();
              list.push({
                id: p.id,
                image_url: p.imgSrc || p.image_url,
                user_id: p.uploader || "Thành viên",
                is_pinned: !!p.isPinned,
                created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
                title: p.title || "Ảnh kỷ niệm",
                topic: topic,
                category: topic,
                album: alb,
                subTopic: alb,
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

  // Danh sách chủ đề
  const allAvailableTopics = useMemo(() => {
    const list = [...taxonomy.topics];
    items.forEach((it) => {
      const top = resolveTopic(it.topic);
      if (top && top !== "all" && !list.includes(top)) list.push(top);
    });
    return list;
  }, [taxonomy.topics, items]);

  // Danh sách bộ ảnh của uploadTopic
  const uploadAlbumsList = useMemo(() => {
    const topic = isCustomTopic && customTopicName.trim() ? customTopicName.trim() : uploadTopic;
    const fromTax = taxonomy.albumsMap[topic] || DEFAULT_ALBUMS_MAP[topic] || ["Ảnh chung"];
    const set = new Set<string>(fromTax);
    items.forEach((it) => {
      if (resolveTopic(it.topic) === topic && it.album) set.add(it.album);
    });
    return Array.from(set);
  }, [taxonomy.albumsMap, uploadTopic, isCustomTopic, customTopicName, items]);

  // Cập nhật uploadAlbum khi uploadTopic thay đổi
  useEffect(() => {
    if (uploadAlbumsList.length > 0 && !uploadAlbumsList.includes(uploadAlbum)) {
      setUploadAlbum(uploadAlbumsList[0]);
    }
  }, [uploadAlbumsList, uploadAlbum]);

  // Danh sách album theo filter topic
  const filterAlbumsList = useMemo(() => {
    if (selectedFilterTopic === "all") return [];
    const fromTax = taxonomy.albumsMap[selectedFilterTopic] || DEFAULT_ALBUMS_MAP[selectedFilterTopic] || [];
    const set = new Set<string>(fromTax);
    items.forEach((it) => {
      if (resolveTopic(it.topic) === selectedFilterTopic && it.album) set.add(it.album);
    });
    return Array.from(set);
  }, [selectedFilterTopic, taxonomy.albumsMap, items]);

  // Lọc ảnh theo chủ đề & bộ ảnh
  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedFilterTopic !== "all") {
      result = result.filter((it) => resolveTopic(it.topic) === selectedFilterTopic);
    }
    if (selectedFilterAlbum !== "all") {
      result = result.filter((it) => (it.album || "Ảnh chung") === selectedFilterAlbum);
    }
    return result;
  }, [items, selectedFilterTopic, selectedFilterAlbum]);

  // Lưu taxonomy lên Supabase & LocalStorage
  const persistTaxonomy = async (newTax: GalleryTaxonomy) => {
    setTaxonomy(newTax);
    try {
      localStorage.setItem(TAXONOMY_STORAGE_KEY, JSON.stringify(newTax));
      window.dispatchEvent(new Event("tcdn4_memories_updated"));
    } catch {}

    try {
      await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_taxonomy", taxonomy: newTax }),
      });
    } catch (err) {
      console.warn("Lỗi lưu taxonomy lên server:", err);
    }
  };

  // Thêm chủ đề mới
  const handleAddTopic = async () => {
    const val = newTopicInput.trim();
    if (!val) return;
    if (taxonomy.topics.includes(val)) {
      toast.error(`Chủ đề "${val}" đã tồn tại!`);
      return;
    }
    const updatedTax: GalleryTaxonomy = {
      topics: [...taxonomy.topics, val],
      albumsMap: {
        ...taxonomy.albumsMap,
        [val]: ["Ảnh chung"],
      },
    };
    await persistTaxonomy(updatedTax);
    setNewTopicInput("");
    toast.success(`Đã thêm chủ đề "${val}" thành công!`);
  };

  // Xóa chủ đề
  const handleDeleteTopic = async (topicName: string) => {
    if (taxonomy.topics.length <= 1) {
      toast.error("Phải giữ lại ít nhất 1 chủ đề!");
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chủ đề "${topicName}"? Các ảnh thuộc chủ đề này sẽ được chuyển sang "Khác".`)) {
      return;
    }
    const updatedTopics = taxonomy.topics.filter((t) => t !== topicName);
    const updatedAlbumsMap = { ...taxonomy.albumsMap };
    delete updatedAlbumsMap[topicName];
    if (!updatedTopics.includes("Khác")) {
      updatedTopics.push("Khác");
      updatedAlbumsMap["Khác"] = ["Khoảnh khắc khác"];
    }

    const updatedTax: GalleryTaxonomy = {
      topics: updatedTopics,
      albumsMap: updatedAlbumsMap,
    };
    await persistTaxonomy(updatedTax);
    if (selectedFilterTopic === topicName) setSelectedFilterTopic("all");
    toast.success(`Đã xóa chủ đề "${topicName}"`);
  };

  // Thêm bộ ảnh mới vào chủ đề
  const handleAddAlbumToTopic = async (topicName: string) => {
    const val = (newAlbumInput[topicName] || "").trim();
    if (!val) return;
    const currentAlbums = taxonomy.albumsMap[topicName] || [];
    if (currentAlbums.includes(val)) {
      toast.error(`Bộ ảnh "${val}" đã tồn tại trong chủ đề "${topicName}"!`);
      return;
    }
    const updatedTax: GalleryTaxonomy = {
      ...taxonomy,
      albumsMap: {
        ...taxonomy.albumsMap,
        [topicName]: [...currentAlbums, val],
      },
    };
    await persistTaxonomy(updatedTax);
    setNewAlbumInput((prev) => ({ ...prev, [topicName]: "" }));
    toast.success(`Đã thêm bộ ảnh "${val}" vào chủ đề "${topicName}"!`);
  };

  // Xóa bộ ảnh khỏi chủ đề
  const handleDeleteAlbum = async (topicName: string, albumName: string) => {
    const currentAlbums = taxonomy.albumsMap[topicName] || [];
    if (currentAlbums.length <= 1) {
      toast.error("Mỗi chủ đề cần có ít nhất 1 bộ ảnh!");
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bộ ảnh "${albumName}" khỏi chủ đề "${topicName}"?`)) {
      return;
    }
    const updatedTax: GalleryTaxonomy = {
      ...taxonomy,
      albumsMap: {
        ...taxonomy.albumsMap,
        [topicName]: currentAlbums.filter((a) => a !== albumName),
      },
    };
    await persistTaxonomy(updatedTax);
    toast.success(`Đã xóa bộ ảnh "${albumName}"`);
  };

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

    const rawTopic = isCustomTopic && customTopicName.trim() ? customTopicName.trim() : uploadTopic;
    const finalTopic = resolveTopic(rawTopic);
    const rawAlbum = isCustomAlbum ? (customAlbumName.trim() || "Ảnh kỷ niệm") : (uploadAlbum.trim() || "Ảnh chung");
    const finalAlbum = rawAlbum.trim() || "Ảnh chung";

    // Cập nhật taxonomy nếu có chủ đề hoặc bộ ảnh mới
    if (isCustomTopic && customTopicName.trim()) {
      if (!taxonomy.topics.includes(finalTopic)) {
        persistTaxonomy({
          topics: [...taxonomy.topics, finalTopic],
          albumsMap: { ...taxonomy.albumsMap, [finalTopic]: [finalAlbum] },
        });
      }
    } else if (isCustomAlbum && customAlbumName.trim()) {
      const curAlb = taxonomy.albumsMap[finalTopic] || [];
      if (!curAlb.includes(finalAlbum)) {
        persistTaxonomy({
          ...taxonomy,
          albumsMap: { ...taxonomy.albumsMap, [finalTopic]: [...curAlb, finalAlbum] },
        });
      }
    }

    if (uploadMode === "file") {
      if (selectedFiles.length === 0) {
        toast.error("Vui lòng chọn ít nhất 1 tệp ảnh từ thiết bị!");
        return;
      }

      setUploadingToSupabase(true);
      setUploadProgressText("Chuẩn bị xử lý ảnh...");
      try {
        const addedItems: any[] = [];
        const total = selectedFiles.length;

        for (let i = 0; i < total; i++) {
          const file = selectedFiles[i];
          setUploadProgressText(`Đang nén & tối ưu ảnh ${i + 1}/${total}...`);
          const compressed = await compressImage(file);

          setUploadProgressText(`Đang tải ảnh ${i + 1}/${total} lên Cloud (${Math.round(((i + 1) / total) * 100)}%)...`);

          const formData = new FormData();
          formData.append("files", compressed);
          formData.append("topic", finalTopic);
          formData.append("album", finalAlbum);
          formData.append("subTopic", finalAlbum);
          formData.append("uploader", "Ban liên lạc (Admin)");
          formData.append("uploaderClass", "TC10");
          if (photoTitle.trim()) {
            formData.append("title", total === 1 ? photoTitle.trim() : `${photoTitle.trim()} (${i + 1})`);
          }

          const res = await fetch("/api/gallery", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            if (res.status === 413 || errText.includes("PAYLOAD_TOO_LARGE") || errText.includes("Request Entity Too Large")) {
              throw new Error(`Ảnh "${file.name}" vượt quá dung lượng cho phép (> 4.5MB).`);
            }
            throw new Error(`Lỗi máy chủ (${res.status}): ${errText.slice(0, 80) || res.statusText}`);
          }

          let result: any;
          try {
            result = await res.json();
          } catch {
            throw new Error(`Phản hồi từ máy chủ không hợp lệ khi tải ảnh "${file.name}"`);
          }

          if (!result.success) {
            throw new Error(result.error || `Không thể lưu ảnh "${file.name}" lên Cloud`);
          }

          if (result.addedPhotos && Array.isArray(result.addedPhotos)) {
            const converted = result.addedPhotos.map((p: any) => ({
              id: p.id,
              image_url: p.imgSrc,
              user_id: p.uploader,
              is_pinned: !!p.isPinned,
              created_at: new Date(p.createdAt || Date.now()).toISOString(),
              title: p.title,
              topic: p.topic,
              category: p.category,
              album: p.album || finalAlbum,
              subTopic: p.subTopic || finalAlbum,
              comments: [],
              likes: 0,
              source: "supabase",
            }));
            addedItems.push(...converted);
          }
        }

        if (addedItems.length === 0) {
          throw new Error("Không có ảnh nào được tải lên thành công.");
        }

        // Đồng bộ vào memories gallery localStorage
        try {
          const stored = localStorage.getItem(MEMORIES_STORAGE_KEY);
          const list = stored ? JSON.parse(stored) : [];
          localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify([...addedItems, ...list]));
          window.dispatchEvent(new Event("tcdn4_memories_updated"));
        } catch {}

        setItems((prev) => [...addedItems, ...prev]);
        setSelectedFiles([]);
        setPreviewUrls([]);
        setPhotoTitle("");
        setIsCustomTopic(false);
        setCustomTopicName("");
        setIsCustomAlbum(false);
        setCustomAlbumName("");
        setIsUploading(false);
        toast.success(`Đã upload thành công ${addedItems.length} ảnh vào bộ ảnh "${finalAlbum}"!`);
      } catch (err: any) {
        toast.error(`Lỗi khi tải ảnh: ${err.message || "Vui lòng thử lại"}`);
      } finally {
        setUploadingToSupabase(false);
        setUploadProgressText("");
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
        album: finalAlbum,
        subTopic: finalAlbum,
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
        album: finalAlbum,
        subTopic: finalAlbum,
        source: "supabase",
      };

      setItems([newItem, ...items]);
      setUploadUrl("");
      setPhotoTitle("");
      setIsCustomTopic(false);
      setCustomTopicName("");
      setIsCustomAlbum(false);
      setCustomAlbumName("");
      setIsUploading(false);

      try {
        const stored = localStorage.getItem(MEMORIES_STORAGE_KEY);
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(newPhotoObj);
        localStorage.setItem(MEMORIES_STORAGE_KEY, JSON.stringify(list));
        window.dispatchEvent(new Event("tcdn4_memories_updated"));
      } catch {}

      toast.success(`Đã thêm ảnh vào bộ ảnh "${finalAlbum}" thành công!`);
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
      {/* Tiêu đề & Các nút chức năng chính */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-ueh">Quản Lý Góc Ảnh Kỷ Niệm</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý các chủ đề, bộ ảnh, tải ảnh trực tiếp lên Supabase và ghim các bức ảnh kỷ niệm tiêu biểu.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsTaxonomyManagerOpen(!isTaxonomyManagerOpen)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all border ${
              isTaxonomyManagerOpen
                ? "bg-ueh text-white border-ueh shadow-xs"
                : "bg-white text-slate-700 border-slate-300 hover:border-ueh hover:text-ueh"
            }`}
          >
            <Settings size={14} /> Quản Lý Chủ Đề & Bộ Ảnh
          </button>

          <button
            onClick={() => setIsUploading(!isUploading)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white hover:bg-ueh-light transition-all shadow-xs"
          >
            <Plus size={15} /> Upload Thêm Ảnh
          </button>
        </div>
      </div>

      {/* KHU VỰC QUẢN LÝ CHỦ ĐỀ & BỘ ẢNH (ADMIN THÊM BỚT TỰ DO) */}
      {isTaxonomyManagerOpen && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-white p-4 sm:p-6 shadow-md animate-in fade-in space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-ueh flex items-center gap-2">
                <FolderHeart size={18} className="text-ueh-orange" />
                Cấu Trúc Chủ Đề & Bộ Ảnh
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin có quyền thêm hoặc xóa các chủ đề và bộ ảnh theo nhu cầu của ban liên lạc.
              </p>
            </div>
            <button
              onClick={() => setIsTaxonomyManagerOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Thêm chủ đề mới */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input
              type="text"
              placeholder="Nhập tên chủ đề mới muốn tạo (VD: Kỷ yếu 15 năm, Hoạt động ngoại khóa)..."
              value={newTopicInput}
              onChange={(e) => setNewTopicInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTopic())}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs focus:bg-white focus:border-ueh focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddTopic}
              disabled={!newTopicInput.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-ueh px-4 py-2 text-xs font-bold text-white hover:bg-ueh-light disabled:opacity-50 transition-all shrink-0"
            >
              <Plus size={14} /> Thêm Chủ Đề Mới
            </button>
          </div>

          {/* Danh sách các chủ đề và các bộ ảnh bên trong */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taxonomy.topics.map((top) => {
              const albums = taxonomy.albumsMap[top] || [];
              const photosInTopicCount = items.filter((it) => resolveTopic(it.topic) === top).length;
              return (
                <div key={top} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between">
                  <div>
                    {/* Header Chủ đề */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Tag size={14} className="text-ueh shrink-0" />
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 truncate">{top}</h4>
                        <span className="rounded-full bg-white px-2 py-0.2 text-[10px] font-bold text-slate-500 border border-slate-200 shrink-0">
                          {photosInTopicCount} ảnh
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTopic(top)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        title={`Xóa chủ đề "${top}"`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Danh sách các bộ ảnh trong chủ đề này */}
                    <div className="space-y-1.5 my-2">
                      <span className="text-[11px] font-bold text-slate-500">Các bộ ảnh:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {albums.map((alb) => {
                          const albCount = items.filter((it) => resolveTopic(it.topic) === top && it.album === alb).length;
                          return (
                            <div
                              key={alb}
                              className="group inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs"
                            >
                              <span>{alb}</span>
                              {albCount > 0 && (
                                <span className="text-[10px] text-slate-400">({albCount})</span>
                              )}
                              <button
                                onClick={() => handleDeleteAlbum(top, alb)}
                                className="text-slate-300 hover:text-rose-500 opacity-60 group-hover:opacity-100 transition-opacity"
                                title={`Xóa bộ ảnh "${alb}"`}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Thêm bộ ảnh mới vào chủ đề này */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex gap-1.5 items-center">
                    <input
                      type="text"
                      placeholder={`Thêm bộ ảnh vào "${top}"...`}
                      value={newAlbumInput[top] || ""}
                      onChange={(e) => setNewAlbumInput((prev) => ({ ...prev, [top]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddAlbumToTopic(top))}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs focus:border-ueh focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddAlbumToTopic(top)}
                      disabled={!(newAlbumInput[top] || "").trim()}
                      className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold text-ueh hover:bg-ueh hover:text-white disabled:opacity-40 transition-colors shrink-0"
                    >
                      + Thêm
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

          {/* Lựa chọn Chủ đề */}
          <div className="rounded-xl border border-blue-100 bg-white/90 p-3 space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FolderHeart size={14} className="text-ueh-orange" />
              <span>Chủ đề kỷ niệm:</span>
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
                    Chủ đề: {top}
                  </option>
                ))}
                <option value="__custom__">➕ Tạo chủ đề mới...</option>
              </select>

              {isCustomTopic && (
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Nhập tên chủ đề mới..."
                  value={customTopicName}
                  onChange={(e) => setCustomTopicName(e.target.value)}
                  className="w-full rounded-xl border-2 border-ueh bg-blue-50/50 px-3 py-2 text-xs font-bold text-ueh focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Lựa chọn Bộ ảnh */}
          <div className="rounded-xl border border-slate-200 bg-white/90 p-3 space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers size={14} className="text-ueh" />
              <span>Bộ ảnh (trong chủ đề này):</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={isCustomAlbum ? "__custom_album__" : uploadAlbum}
                onChange={(e) => {
                  if (e.target.value === "__custom_album__") {
                    setIsCustomAlbum(true);
                  } else {
                    setIsCustomAlbum(false);
                    setUploadAlbum(e.target.value);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-ueh focus:outline-none"
              >
                {uploadAlbumsList.map((alb) => (
                  <option key={alb} value={alb}>
                    Bộ ảnh: {alb}
                  </option>
                ))}
                <option value="__custom_album__">➕ Tạo bộ ảnh mới...</option>
              </select>

              {isCustomAlbum && (
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Gõ tên bộ ảnh mới (VD: Lễ tốt nghiệp, Họp mặt...)"
                  value={customAlbumName}
                  onChange={(e) => setCustomAlbumName(e.target.value)}
                  className="w-full rounded-xl border-2 border-ueh bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                />
              )}
            </div>
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
                  <span>{uploadProgressText || "Đang tải lên Supabase..."}</span>
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

      {/* Thanh lọc Bộ ảnh theo Chủ đề (1 hàng trượt ngang) */}
      <div className="mb-3 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => {
            setSelectedFilterTopic("all");
            setSelectedFilterAlbum("all");
          }}
          className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
            selectedFilterTopic === "all"
              ? "bg-ueh text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200 hover:border-ueh hover:text-ueh"
          }`}
        >
          <span>Tất cả chủ đề</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
            selectedFilterTopic === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
          }`}>
            {items.length}
          </span>
        </button>

        {allAvailableTopics.map((top) => {
          const count = items.filter((it) => resolveTopic(it.topic) === top).length;
          const isSelected = selectedFilterTopic === top;
          return (
            <button
              key={top}
              onClick={() => {
                setSelectedFilterTopic(top);
                setSelectedFilterAlbum("all");
              }}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
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

      {/* Lọc tiếp theo Bộ ảnh nếu đã chọn 1 chủ đề cụ thể */}
      {selectedFilterTopic !== "all" && filterAlbumsList.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 bg-blue-50/60 p-2 rounded-xl border border-blue-100">
          <span className="text-[11px] font-bold text-ueh pl-1">Bộ ảnh:</span>
          <button
            onClick={() => setSelectedFilterAlbum("all")}
            className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold transition-all ${
              selectedFilterAlbum === "all"
                ? "bg-ueh text-white shadow-2xs"
                : "bg-white text-slate-600 hover:text-ueh"
            }`}
          >
            Tất cả bộ ảnh
          </button>
          {filterAlbumsList.map((alb) => (
            <button
              key={alb}
              onClick={() => setSelectedFilterAlbum(alb)}
              className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold transition-all ${
                selectedFilterAlbum === alb
                  ? "bg-ueh text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:text-ueh"
              }`}
            >
              {alb}
            </button>
          ))}
        </div>
      )}

      {/* Grid Ảnh */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
          Chưa có bức ảnh nào trong bộ lọc này.
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
                  <div className="mb-1 flex items-center gap-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-ueh border border-blue-100">
                      <Tag size={10} className="text-ueh-orange" />
                      {it.topic || "Khác"}
                    </span>
                    {it.album && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700">
                        {it.album}
                      </span>
                    )}
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
