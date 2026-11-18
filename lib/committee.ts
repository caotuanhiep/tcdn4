export interface CommitteeMember {
  id: string;
  name: string;
  className: "TC10" | "TC11" | "TC12";
  role: string;
  duty: string;
  phone: string;
  avatarUrl?: string;
  avatarColor?: string;
  badge?: string;
}

export const DEFAULT_COMMITTEE_MEMBERS: CommitteeMember[] = [
  {
    id: "com-1",
    name: "Nguyễn Văn An",
    className: "TC10",
    role: "Trưởng Ban Liên Lạc",
    duty: "Điều phối chung, kế hoạch tổng thể & tài chính 15 năm",
    phone: "0903 123 456",
    avatarColor: "from-[#003B5C] to-[#0068FF]",
    badge: "Điều phối",
  },
  {
    id: "com-2",
    name: "Trần Thị Bích",
    className: "TC11",
    role: "Phó Ban - Hậu Cần",
    duty: "Quản lý áo kỷ niệm, quà tặng, đón tiếp tại sự kiện",
    phone: "0918 654 321",
    avatarColor: "from-rose-500 to-pink-600",
    badge: "Hậu cần & Áo",
  },
  {
    id: "com-3",
    name: "Lê Hoàng Cường",
    className: "TC12",
    role: "Phó Ban - Truyền Thông",
    duty: "Biên tập kỷ yếu, vận hành Alumni Hub & nhóm Zalo",
    phone: "0982 112 233",
    avatarColor: "from-amber-500 to-orange-600",
    badge: "Truyền thông",
  },
  {
    id: "com-4",
    name: "Phạm Hải Đăng",
    className: "TC10",
    role: "Ủy Viên - Kết Nối DN",
    duty: "Xây dựng Kiosk doanh nghiệp & ưu đãi nội bộ K33",
    phone: "0934 998 877",
    avatarColor: "from-emerald-600 to-teal-700",
    badge: "Mạng lưới DN",
  },
];

export function getCommitteeMembers(): CommitteeMember[] {
  if (typeof window === "undefined") {
    return DEFAULT_COMMITTEE_MEMBERS;
  }
  try {
    const raw = localStorage.getItem("tcdn4_committee_members");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_COMMITTEE_MEMBERS;
}

export function saveCommitteeMembers(members: CommitteeMember[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("tcdn4_committee_members", JSON.stringify(members));
    } catch {}
  }
}
