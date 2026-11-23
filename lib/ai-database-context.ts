import { getSupabaseAdmin } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";
import { normalizeBankConfig, DEFAULT_BANK_INFO, BankConfig } from "@/lib/bank";

export interface DatabaseSummary {
  totalProfiles: number;
  totalAttending: number;
  totalConfirmed: number;
  attendingNames: string[];
  hcmMembers: string[];
  hnMembers: string[];
  otherMembers: string[];
  overseasMembers: string[];
  tc10Count: number;
  tc11Count: number;
  tc12Count: number;
  allMembersList: string[];
  birthdayMembersThisMonth: string[];
  bankInfo: BankConfig;
  rawTextContext: string;
}

export async function getAlumniDatabaseContext(userQuery?: string): Promise<DatabaseSummary> {
  // 1. Cấu hình ngân hàng
  let bankInfo = DEFAULT_BANK_INFO;
  try {
    const p = path.join(process.cwd(), "data", "bank-config.json");
    if (fs.existsSync(p)) {
      bankInfo = normalizeBankConfig(JSON.parse(fs.readFileSync(p, "utf-8")));
    }
  } catch {}

  // 2. Tải danh sách hồ sơ cựu sinh viên
  let profiles: any[] = [];
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, class_name, job_title, company, location_region, specific_location, attendance_status, birthday, role")
      .order("created_at", { ascending: false });
    if (data && Array.isArray(data)) profiles = data;
  } catch {}

  // Fallback đọc từ file local profiles.json nếu cần
  if (profiles.length === 0) {
    try {
      const p = path.join(process.cwd(), "data", "profiles.json");
      if (fs.existsSync(p)) {
        const map = JSON.parse(fs.readFileSync(p, "utf-8"));
        profiles = Object.values(map);
      }
    } catch {}
  }

  // 3. Tổng hợp số liệu thống kê
  const attendingNames: string[] = [];
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

  for (const m of profiles) {
    if (!m.full_name) continue;
    const name = m.full_name.trim();
    const cls = m.class_name || "K33";
    const job = m.job_title ? ` (${m.job_title}${m.company ? ` - ${m.company}` : ""})` : "";
    const memberTag = `${name} [${cls}]${job}`;

    allMembersList.push(memberTag);

    if (cls.includes("10")) tc10Count++;
    else if (cls.includes("11")) tc11Count++;
    else if (cls.includes("12")) tc12Count++;

    if (m.attendance_status === "attending") {
      attendingNames.push(`${name} (${cls})`);
    }

    const reg = (m.location_region || "").toLowerCase();
    const loc = m.specific_location ? ` - ${m.specific_location}` : "";
    if (reg === "hcm" || reg.includes("hồ chí minh") || reg.includes("hcm")) {
      hcmMembers.push(`${name} (${cls}${loc})`);
    } else if (reg === "hn" || reg.includes("hà nội")) {
      hnMembers.push(`${name} (${cls}${loc})`);
    } else if (reg === "overseas" || reg.includes("ngoại") || reg.includes("nước ngoài")) {
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

  // Nếu câu hỏi có nhắc tới tên thành viên nào, tìm các kết quả liên quan
  let matchedMembers: string[] = [];
  if (userQuery) {
    const qLower = userQuery.toLowerCase();
    for (const m of profiles) {
      if (!m.full_name) continue;
      const parts = m.full_name.toLowerCase().split(/\s+/);
      const lastName = parts[parts.length - 1];
      if ((lastName.length >= 2 && qLower.includes(lastName)) || qLower.includes(m.full_name.toLowerCase())) {
        matchedMembers.push(
          `• ${m.full_name} (${m.class_name || "K33"}): ${m.job_title || "Cựu SV"}${m.company ? ` tại ${m.company}` : ""}${m.location_region ? ` ở ${m.location_region}` : ""} - Trạng thái: ${m.attendance_status === "attending" ? "Đã đăng ký tham gia họp mặt 15 năm 🎉" : "Chưa đăng ký"}`
        );
      }
    }
  }

  const rawTextContext = `
DỮ LIỆU THỰC TẾ TỪ CƠ SỞ DỮ LIỆU TCDN4 - K33 UEH (WEBSITE TCDN4.TOP):
1. Sự kiện Họp mặt 15 Năm:
- Thời gian: Thứ Bảy, 12/12/2026 (08:30 sáng đón tiếp & check-in nhận áo Polo; 09:30 lễ kỷ niệm; 11:30 đại tiệc trưa cụng ly hội ngộ).
- Địa điểm: Giảng đường Cơ sở B, ĐH Kinh tế TP.HCM (279 Nguyễn Tri Phương, Phường 5, Quận 10, TP.HCM).
- Size áo Polo: S (dưới 55kg), M (55-65kg), L (65-72kg), XL (72-80kg), XXL (80-88kg), 3XL (trên 88kg).
- Đóng góp: ${bankInfo.amountText} / người tham gia qua ${bankInfo.bankName} - STK: ${bankInfo.accountNumber} (${bankInfo.accountName}), cú pháp: ${bankInfo.syntaxPrefix} [Tên] [Lớp].
- Link đăng ký: https://tcdn4.top/#event

2. Dữ liệu Thống kê Tham gia:
- Tổng số cựu sinh viên đã điểm danh trên hệ thống: ${profiles.length} bạn (Lớp TC10: ${tc10Count}, TC11: ${tc11Count}, TC12: ${tc12Count}).
- Số lượng đồng môn đã xác nhận tham gia 15 năm: ${attendingNames.length} bạn.
  Danh sách đã tham gia: ${attendingNames.join(", ") || "Đang tiếp tục cập nhật"}.

3. Dữ liệu Thành viên Theo Khu Vực Sinh Sống:
- Khu vực TP. Hồ Chí Minh (${hcmMembers.length} bạn): ${hcmMembers.slice(0, 30).join(", ") || "Chưa có danh sách"}.
- Khu vực Hà Nội (${hnMembers.length} bạn): ${hnMembers.join(", ") || "Hiện chưa có bạn nào cập nhật ở Hà Nội"}.
- Khu vực Tỉnh thành khác (${otherMembers.length} bạn): ${otherMembers.slice(0, 20).join(", ") || "Chưa có danh sách"}.
- Khu vực Nước ngoài (${overseasMembers.length} bạn): ${overseasMembers.join(", ") || "Hiện chưa có bạn nào cập nhật ở nước ngoài"}.

${birthdayMembersThisMonth.length > 0 ? `4. Sinh nhật tháng này (Tháng ${currentMonth}):\n${birthdayMembersThisMonth.join(", ")}\n` : ""}
${matchedMembers.length > 0 ? `5. Thông tin thành viên khớp với câu hỏi:\n${matchedMembers.join("\n")}\n` : ""}
`;

  return {
    totalProfiles: profiles.length,
    totalAttending: attendingNames.length,
    totalConfirmed: 0,
    attendingNames,
    hcmMembers,
    hnMembers,
    otherMembers,
    overseasMembers,
    tc10Count,
    tc11Count,
    tc12Count,
    allMembersList,
    birthdayMembersThisMonth,
    bankInfo,
    rawTextContext,
  };
}
