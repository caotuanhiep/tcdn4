export interface KioskItem {
  id: string | number;
  name: string;
  type: string;
  owner: string;
  phone?: string;
  discount: string;
  gradient?: string;
  logoUrl?: string;
  link?: string;
}

export const DEFAULT_KIOSK_ITEMS: KioskItem[] = [
  {
    id: 1,
    name: "SMLIFE",
    type: "Nội thất thông minh & Bàn ghế Ergonomic",
    owner: "Nguyễn Văn An (TC10)",
    phone: "0903 123 456",
    discount: "Giảm 15% cho Alumni K33",
    gradient: "from-orange-500 to-amber-500",
    link: "https://smlife.vn",
  },
  {
    id: 2,
    name: "Bamos Coffee",
    type: "F&B - Chuỗi Cà phê Trải nghiệm 24/7",
    owner: "Trần Thị Bích (TC11)",
    phone: "0918 654 321",
    discount: "Tặng 1 đồ uống khi check-in",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    id: 3,
    name: "Gowise",
    type: "eSIM Du lịch Quốc tế & Data Roaming",
    owner: "Lê Hoàng Cường (TC12)",
    phone: "0982 112 233",
    discount: "Giảm 20% gói Data toàn cầu",
    gradient: "from-sky-500 to-cyan-500",
    link: "https://gowise.vn",
  },
  {
    id: 4,
    name: "Viwise",
    type: "Giải pháp Digital Marketing & SEO",
    owner: "Phạm Hải Đăng (TC10)",
    phone: "0934 998 877",
    discount: "Free Audit Website & Tư vấn 1:1",
    gradient: "from-purple-500 to-indigo-500",
  },
];

export function getKioskItems(): KioskItem[] {
  if (typeof window === "undefined") {
    return DEFAULT_KIOSK_ITEMS;
  }
  try {
    const raw = localStorage.getItem("tcdn4_kiosk_items");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_KIOSK_ITEMS;
}

export function saveKioskItems(items: KioskItem[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("tcdn4_kiosk_items", JSON.stringify(items));
    } catch {}
  }
}
