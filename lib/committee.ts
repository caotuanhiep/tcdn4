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
    name: "Lê Trần Phúc Nghĩa",
    className: "TC10",
    role: "Trưởng Ban Liên Lạc",
    duty: "Điều phối chung, liên hệ UEH thăm trường",
    phone: "",
    avatarUrl: "/images/committee/com-1.jpg",
    avatarColor: "from-[#003B5C] to-[#0068FF]",
    badge: "Trưởng Ban",
  },
  {
    id: "com-2",
    name: "Cao Tuấn Hiệp",
    className: "TC12",
    role: "Phó Ban - Tổ Chức",
    duty: "Quản lý quỹ, website",
    phone: "0972555211",
    avatarUrl: "/images/committee/com-2.jpg",
    avatarColor: "from-blue-600 to-indigo-700",
    badge: "Tổ chức & Quỹ",
  },
  {
    id: "com-3",
    name: "Trần Văn Lợi",
    className: "TC12",
    role: "Phó Ban - Hậu Cần",
    duty: "Quản lý áo kỷ niệm, ăn uống",
    phone: "0945816926",
    avatarUrl: "/images/committee/com-3.jpg",
    avatarColor: "from-amber-500 to-orange-600",
    badge: "Hậu cần & Áo",
  },
  {
    id: "com-4",
    name: "Vương Khắc Huy",
    className: "TC12",
    role: "Phó Ban - Truyền Thông",
    duty: "Kêu gọi tham gia sự kiện 15 năm, vận hành Alumni Hub và nhóm Zalo",
    phone: "0909808639",
    avatarUrl: "/images/committee/com-4.jpg",
    avatarColor: "from-emerald-600 to-teal-700",
    badge: "Truyền thông & Zalo",
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
