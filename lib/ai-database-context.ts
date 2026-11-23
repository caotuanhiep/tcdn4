import { BankConfig } from "@/lib/bank";
import { loadBankConfigServer } from "@/lib/bank-server";
import {
  loadMergedRegistrations,
  loadProfilesFromDb,
  type RegistrationItem,
} from "@/lib/alumni-server";
import { DEFAULT_COMMITTEE_MEMBERS } from "@/lib/committee";

export interface DatabaseSummary {
  totalProfiles: number;
  totalAttending: number;
  totalConfirmed: number;
  totalPending: number;
  totalCollectedAmount: number;
  attendingNames: string[];
  confirmedNames: string[];
  pendingNames: string[];
  hcmMembers: string[];
  hnMembers: string[];
  otherMembers: string[];
  overseasMembers: string[];
  tc10Count: number;
  tc11Count: number;
  tc12Count: number;
  allMembersList: string[];
  matchedMembers: string[];
  birthdayMembersThisMonth: string[];
  shirtSizeSummary: string;
  committeeList: string[];
  registrations: RegistrationItem[];
  bankInfo: BankConfig;
  rawTextContext: string;
}

function removeVietnameseTones(str: string) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalizeForSearch(str: string) {
  return removeVietnameseTones(str)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getAlumniDatabaseContext(userQuery?: string): Promise<DatabaseSummary> {
  // 1. Tải song song: Cấu hình Ngân hàng chuẩn từ Cloud, Danh bạ Profiles từ Supabase DB và Danh sách Đăng ký 15 năm
  const [{ config: bankInfo }, profiles] = await Promise.all([
    loadBankConfigServer(),
    loadProfilesFromDb().catch(() => []),
  ]);
  const registrations = await loadMergedRegistrations(undefined, profiles).catch(
    () => [] as RegistrationItem[]
  );

  // 2. Tổng hợp số liệu từ danh sách đăng ký 15 năm (nguồn chuẩn nhất cho việc tham gia & chuyển khoản)
  const confirmedRegs = registrations.filter((r) => r.status === "confirmed");
  const pendingRegs = registrations.filter((r) => r.status !== "confirmed");
  const totalCollectedAmount = confirmedRegs.reduce(
    (sum, r) => sum + (Number(r.paidAmount) || bankInfo.amount || 1000000),
    0
  );

  const confirmedNames = confirmedRegs.map(
    (r) => `${r.fullName} (${r.className} - Áo ${r.shirtSize} - Đã đóng ${(Number(r.paidAmount) || bankInfo.amount).toLocaleString("vi-VN")}đ)`
  );
  const pendingNames = pendingRegs.map(
    (r) => `${r.fullName} (${r.className} - Áo ${r.shirtSize} - Chờ chuyển khoản)`
  );
  const attendingNames = registrations.map(
    (r) => `${r.fullName} (${r.className}${r.status === "confirmed" ? " - Đã CK ✓" : " - Chờ CK"})`
  );

  // Thống kê size áo
  const shirtCounts: Record<string, number> = {};
  for (const r of registrations) {
    const sz = r.shirtSize || "L (Nam)";
    shirtCounts[sz] = (shirtCounts[sz] || 0) + 1;
  }
  const shirtSizeSummary =
    Object.entries(shirtCounts)
      .map(([sz, cnt]) => `${sz}: ${cnt}`)
      .join(", ") || "Chưa có dữ liệu";

  // 3. Tổng hợp số liệu thống kê danh bạ cựu sinh viên (profiles)
  const hcmMembers: string[] = [];
  const hnMembers: string[] = [];
  const otherMembers: string[] = [];
  const overseasMembers: string[] = [];
  const allMembersList: string[] = [];
  let tc10Count = 0;
  let tc11Count = 0;
  let tc12Count = 0;

  const currentMonth = new Date().getMonth() + 1;
  const birthdayMembersThisMonth: string[] = [];

  // Map nhanh registration theo id/phone để gắn trạng thái tham dự & chuyển khoản vào từng profile
  const findRegForProfile = (m: any): RegistrationItem | undefined => {
    const pPhone = (m.phone || "").replace(/[^0-9]/g, "");
    const pId = (m.id || "").toLowerCase();
    return registrations.find((r) => {
      if (pId && r.id && r.id.toLowerCase() === pId) return true;
      const rPhone = (r.phone || "").replace(/[^0-9]/g, "");
      if (pPhone.length >= 9 && rPhone === pPhone) return true;
      return false;
    });
  };

  for (const m of profiles) {
    if (!m.full_name) continue;
    const name = m.full_name.trim();
    const cls = m.class_name || "K33";
    const job = m.job_title ? ` (${m.job_title}${m.company ? ` - ${m.company}` : ""})` : "";
    const reg = findRegForProfile(m);
    const statusTag = reg
      ? reg.status === "confirmed"
        ? " [Đã ĐK & Đã CK ✓]"
        : " [Đã ĐK 15 năm - Chờ CK]"
      : m.attendance_status === "attending"
      ? " [Đã ĐK 15 năm]"
      : "";

    allMembersList.push(`${name} [${cls}]${job}${statusTag}`);

    if (cls.includes("10")) tc10Count++;
    else if (cls.includes("11")) tc11Count++;
    else if (cls.includes("12")) tc12Count++;

    const regRegion = (m.location_region || "").toLowerCase();
    const loc = m.specific_location ? ` - ${m.specific_location}` : "";
    if (regRegion === "hcm" || regRegion.includes("hồ chí minh") || regRegion.includes("hcm")) {
      hcmMembers.push(`${name} (${cls}${loc})`);
    } else if (regRegion === "hn" || regRegion.includes("hà nội")) {
      hnMembers.push(`${name} (${cls}${loc})`);
    } else if (regRegion === "overseas" || regRegion.includes("ngoại") || regRegion.includes("nước ngoài")) {
      overseasMembers.push(`${name} (${cls}${loc})`);
    } else if (m.location_region) {
      otherMembers.push(`${name} (${cls}${loc || ` - ${m.location_region}`})`);
    }

    if (m.birthday) {
      const parts = String(m.birthday).split("-");
      if (parts.length >= 3 && parseInt(parts[1], 10) === currentMonth) {
        birthdayMembersThisMonth.push(`${name} (${cls} - ngày ${parts[2]}/${parts[1]})`);
      }
    }
  }

  // 4. Tra cứu thành viên thông minh (hỗ trợ không dấu, tên đảo thứ tự, tra theo lớp)
  const matchedMembers: string[] = [];
  if (userQuery && userQuery.trim().length >= 2) {
    const qNorm = normalizeForSearch(userQuery);
    const qWords = qNorm.split(" ").filter((w) => w.length >= 2);
    const stopWords = new Set([
      "tim", "thong", "tin", "cua", "ban", "anh", "chi", "em", "lop", "khong", "nhung",
      "nguoi", "nao", "dang", "lam", "viec", "tai", "cong", "cho", "hoi", "biet", "voi",
      "nay", "bao", "nhieu", "tham", "gia", "chua", "roi", "hay", "tai", "khoan", "ngan",
      "hang", "chuyen", "tien", "quy", "size", "ao", "sinh", "nhat", "khu", "vuc", "noi",
    ]);
    const meaningfulQueryWords = qWords.filter((w) => !stopWords.has(w));

    const seenIds = new Set<string>();

    for (const m of profiles) {
      if (!m.full_name) continue;
      const nameNorm = normalizeForSearch(m.full_name);
      const nameWords = nameNorm.split(" ").filter((w) => w.length >= 2);
      const clsNorm = normalizeForSearch(m.class_name || "");
      const compNorm = normalizeForSearch(`${m.company || ""} ${m.job_title || ""} ${m.specific_location || ""}`);

      const exactNameHit = nameNorm.length >= 3 && qNorm.includes(nameNorm);
      const allNameWordsHit = nameWords.length >= 2 && nameWords.every((w) => qNorm.includes(w));
      const givenNameHit =
        meaningfulQueryWords.length > 0 &&
        nameWords.some((w) => w.length >= 3 && meaningfulQueryWords.includes(w));
      const companyOrLocationHit =
        meaningfulQueryWords.length > 0 &&
        meaningfulQueryWords.some((w) => w.length >= 4 && compNorm.includes(w));
      const classExactHit = clsNorm && meaningfulQueryWords.includes(clsNorm);

      if (exactNameHit || allNameWordsHit || givenNameHit || companyOrLocationHit || classExactHit) {
        const reg = findRegForProfile(m);
        const regionLabel =
          m.location_region === "hcm"
            ? "TP.HCM"
            : m.location_region === "hn"
            ? "Hà Nội"
            : m.location_region === "overseas"
            ? "Nước ngoài"
            : m.location_region || "";
        const locDetail = [m.specific_location, regionLabel].filter(Boolean).join(", ");
        const regStatus = reg
          ? reg.status === "confirmed"
            ? `Đã đăng ký & ĐÃ CHUYỂN KHOẢN ✓ (Size áo: ${reg.shirtSize})`
            : `Đã đăng ký tham gia 15 năm - Chờ chuyển khoản (Size áo: ${reg.shirtSize})`
          : m.attendance_status === "attending"
          ? "Đã đăng ký tham gia 15 năm 🎉"
          : m.attendance_status === "not_attending"
          ? "Báo vắng mặt"
          : "Chưa đăng ký 15 năm";

        matchedMembers.push(
          `• ${m.full_name} (${m.class_name || "K33"}): ${m.job_title || "Cựu SV"}${
            m.company ? ` tại ${m.company}` : ""
          }${locDetail ? ` | Khu vực: ${locDetail}` : ""}${
            m.phone ? ` | SĐT: ${m.phone}` : ""
          } | ${regStatus}`
        );
        if (m.id) seenIds.add(m.id);
      }
    }

    // Kiểm tra thêm trong danh sách registrations (phòng trường hợp có người đăng ký nhanh chưa có profile)
    for (const r of registrations) {
      if (r.id && seenIds.has(r.id)) continue;
      const nameNorm = normalizeForSearch(r.fullName);
      const nameWords = nameNorm.split(" ").filter((w) => w.length >= 2);
      const hit =
        (nameNorm.length >= 3 && qNorm.includes(nameNorm)) ||
        (nameWords.length >= 2 && nameWords.every((w) => qNorm.includes(w))) ||
        (meaningfulQueryWords.length > 0 && nameWords.some((w) => w.length >= 3 && meaningfulQueryWords.includes(w)));
      if (hit) {
        matchedMembers.push(
          `• ${r.fullName} (${r.className}): ${
            r.status === "confirmed" ? "Đã đăng ký & ĐÃ CHUYỂN KHOẢN ✓" : "Đã đăng ký - Chờ chuyển khoản"
          } | Size áo: ${r.shirtSize} | Địa chỉ: ${r.address} | Ngày ĐK: ${r.createdAt}`
        );
      }
    }
  }

  // 5. Ban Liên Lạc
  const committeeList = DEFAULT_COMMITTEE_MEMBERS.map(
    (c) => `• ${c.name} (${c.className}) - ${c.role}: ${c.duty}${c.phone ? ` | SĐT: ${c.phone}` : ""}`
  );

  // 6. Xây dựng toàn bộ ngữ cảnh sống động từ Database + Settings
  const rawTextContext = `
DỮ LIỆU THỰC TẾ TỪ CƠ SỞ DỮ LIỆU & CẤU HÌNH ADMIN TCDN4 - K33 UEH (WEBSITE TCDN4.TOP):

1. THÔNG TIN SỰ KIỆN HỌP MẶT 15 NĂM:
- Thời gian: Thứ Bảy, ngày 12/12/2026 (08:30 đón tiếp check-in & nhận áo Polo; 09:30 Lễ kỷ niệm 15 năm; 11:30 Đại tiệc trưa cụng ly hội ngộ).
- Địa điểm: Giảng đường Cơ sở B - Đại học Kinh tế TP.HCM (279 Nguyễn Tri Phương, Phường 5, Quận 10, TP.HCM).
- Hạn chốt danh sách & size áo: 30/11/2026.
- Bảng size áo Polo kỷ niệm: Nam (S <55kg, M 55-64kg, L 65-73kg, XL 74-82kg, 2XL 82-90kg, 3XL >90kg); Nữ (S <48kg, M 48-54kg, L 55-62kg, XL >62kg).
- Website đăng ký & xem danh bạ: https://tcdn4.top/#event và https://tcdn4.top/#directory

2. THÔNG TIN CHUYỂN KHOẢN & ĐÓNG QUỸ (CẤU HÌNH CHÍNH THỨC TỪ ADMIN):
- Mức kinh phí tham dự: ${bankInfo.amountText} / thành viên (bao gồm tiệc VIP, áo Polo kỷ niệm & kỷ yếu 15 năm).
- Ngân hàng thụ hưởng: ${bankInfo.bankName} (Mã NH: ${bankInfo.bankCode}).
- Số tài khoản: ${bankInfo.accountNumber}
- Chủ tài khoản: ${bankInfo.accountName}
- Cú pháp chuyển khoản chuẩn: ${bankInfo.syntaxPrefix} [Họ và Tên] [Số điện thoại] (Ví dụ: ${bankInfo.syntaxPrefix} CAO TUAN HIEP 0972555211).
- Cách thức đóng góp: Đăng nhập https://tcdn4.top/#event -> Chọn tham gia & size áo -> Quét mã VietQR tự động điền sẵn số tiền & nội dung. Hệ thống SePay đối soát tự động 24/7 và báo xác nhận ngay sau khi chuyển khoản thành công!
${bankInfo.phoneReceive ? `- SĐT hỗ trợ đối soát: ${bankInfo.phoneReceive}` : ""}

3. THỐNG KÊ ĐĂNG KÝ 15 NĂM & QUỸ HIỆN TẠI (REALTIME):
- Tổng số cựu sinh viên đã điểm danh trong danh bạ: ${profiles.length} bạn (TC10: ${tc10Count}, TC11: ${tc11Count}, TC12: ${tc12Count}).
- Tổng số phiếu ĐÃ ĐĂNG KÝ tham dự 15 năm: ${registrations.length} bạn.
  + Đã chuyển khoản xác nhận (confirmed): ${confirmedRegs.length} bạn (Tổng quỹ đã thu: ${totalCollectedAmount.toLocaleString("vi-VN")} VNĐ).
    Danh sách đã CK: ${confirmedNames.join("; ") || "Chưa có"}.
  + Đang chờ chuyển khoản (pending): ${pendingRegs.length} bạn.
    Danh sách chờ CK: ${pendingNames.join("; ") || "Không có"}.
- Thống kê size áo đã đăng ký: ${shirtSizeSummary}.

4. PHÂN BỔ THÀNH VIÊN THEO KHU VỰC SINH SỐNG:
- TP. Hồ Chí Minh (${hcmMembers.length} bạn): ${hcmMembers.slice(0, 35).join(", ") || "Chưa có danh sách"}.
- Hà Nội (${hnMembers.length} bạn): ${hnMembers.join(", ") || "Hiện chưa có bạn nào cập nhật ở Hà Nội"}.
- Tỉnh thành khác (${otherMembers.length} bạn): ${otherMembers.slice(0, 25).join(", ") || "Chưa có danh sách"}.
- Nước ngoài / Xuất ngoại (${overseasMembers.length} bạn): ${overseasMembers.join(", ") || "Hiện chưa có bạn nào cập nhật ở nước ngoài"}.

5. BAN LIÊN LẠC TCDN4 - K33 UEH:
${committeeList.join("\n")}

6. DANH SÁCH THÀNH VIÊN TRONG DANH BẠ (${allMembersList.length} bạn):
${allMembersList.slice(0, 50).join("; ")}

${birthdayMembersThisMonth.length > 0 ? `7. SINH NHẬT THÁNG NÀY (Tháng ${currentMonth}):\n${birthdayMembersThisMonth.join(", ")}\n` : ""}
${matchedMembers.length > 0 ? `8. THÔNG TIN THÀNH VIÊN KHỚP TRỰC TIẾP VỚI CÂU HỎI:\n${matchedMembers.slice(0, 15).join("\n")}\n` : ""}
`;

  return {
    totalProfiles: profiles.length,
    totalAttending: registrations.length,
    totalConfirmed: confirmedRegs.length,
    totalPending: pendingRegs.length,
    totalCollectedAmount,
    attendingNames,
    confirmedNames,
    pendingNames,
    hcmMembers,
    hnMembers,
    otherMembers,
    overseasMembers,
    tc10Count,
    tc11Count,
    tc12Count,
    allMembersList,
    matchedMembers,
    birthdayMembersThisMonth,
    shirtSizeSummary,
    committeeList,
    registrations,
    bankInfo,
    rawTextContext,
  };
}
