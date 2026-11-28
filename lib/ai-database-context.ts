import { BankConfig } from "@/lib/bank";
import { loadBankConfigServer } from "@/lib/bank-server";
import {
  BUCKET_NAME,
  loadMergedRegistrations,
  loadProfilesFromDb,
  type RegistrationItem,
} from "@/lib/alumni-server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_COMMITTEE_MEMBERS, type CommitteeMember } from "@/lib/committee";

interface GuestbookRecord {
  name?: string;
  className?: string;
  time?: string;
  message?: string;
  likes?: number;
}

async function loadPublicStorageJson<T>(storagePath: string): Promise<T | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        return (await res.json()) as T;
      }
    }
  } catch {}
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storagePath);
    if (!error && data) {
      return JSON.parse(await data.text()) as T;
    }
  } catch {}
  return null;
}

export interface DatabaseSummary {
  totalProfiles: number;
  totalAttending: number;
  totalConfirmed: number;
  totalPending: number;
  totalGuestsCount: number;
  totalCollectedAmount: number;
  attendingNames: string[];
  confirmedNames: string[];
  pendingNames: string[];
  hcmMembers: string[];
  hnMembers: string[];
  otherMembers: string[];
  overseasMembers: string[];
  singleMembers: string[];
  marriedCount: number;
  totalChildrenCount: number;
  tc10Count: number;
  tc11Count: number;
  tc12Count: number;
  allMembersList: string[];
  matchedMembers: string[];
  birthdayMembersToday: string[];
  upcomingBirthdayMembers: string[];
  birthdayMembersThisMonth: string[];
  birthdaysByMonth: Record<number, string[]>;
  allBirthdayMembers: string[];
  currentVietnamDate: string;
  currentVietnamMonth: number;
  shirtSizeSummary: string;
  committeeList: string[];
  guestbookMessages: string[];
  registrations: RegistrationItem[];
  bankInfo: BankConfig;
  rawTextContext: string;
}

interface ParsedBirthday {
  day: number;
  month: number;
  year?: number;
  display: string;
  shortDisplay: string;
}

function getVietnamToday(): { year: number; month: number; day: number; display: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value) || new Date().getFullYear();
  const month = Number(parts.find((p) => p.type === "month")?.value) || new Date().getMonth() + 1;
  const day = Number(parts.find((p) => p.type === "day")?.value) || new Date().getDate();
  return {
    year,
    month,
    day,
    display: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
  };
}

function parseBirthday(raw?: string | null): ParsedBirthday | null {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;

  let day = 0;
  let month = 0;
  let year: number | undefined;

  // YYYY-MM-DD hoặc ISO timestamp
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  } else {
    // DD/MM/YYYY hoặc DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10);
      year = parseInt(dmyMatch[3], 10);
    } else {
      // DD/MM hoặc DD-MM
      const dmMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
      if (dmMatch) {
        day = parseInt(dmMatch[1], 10);
        month = parseInt(dmMatch[2], 10);
      }
    }
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  return {
    day,
    month,
    year,
    display: year ? `${dd}/${mm}/${year}` : `${dd}/${mm}`,
    shortDisplay: `${dd}/${mm}`,
  };
}

function calcDaysUntilBirthday(
  day: number,
  month: number,
  todayDay: number,
  todayMonth: number,
  todayYear: number
): number {
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay);
  let targetUtc = Date.UTC(todayYear, month - 1, day);
  if (targetUtc < todayUtc) {
    targetUtc = Date.UTC(todayYear + 1, month - 1, day);
  }
  return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));
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
  // 1. Tải song song: Cấu hình Ngân hàng chuẩn từ Cloud, Danh bạ Profiles từ Supabase DB, Ban Liên Lạc & Sổ Lưu Bút
  const [{ config: bankInfo }, profiles, cloudCommittee, cloudGuestbook] = await Promise.all([
    loadBankConfigServer(),
    loadProfilesFromDb().catch(() => []),
    loadPublicStorageJson<CommitteeMember[]>("settings/committee.json").catch(() => null),
    loadPublicStorageJson<GuestbookRecord[]>("settings/guestbook.json").catch(() => null),
  ]);
  const registrations = await loadMergedRegistrations(undefined, profiles).catch(
    () => [] as RegistrationItem[]
  );
  const committeeMembers =
    Array.isArray(cloudCommittee) && cloudCommittee.length > 0
      ? cloudCommittee
      : DEFAULT_COMMITTEE_MEMBERS;
  const guestbookEntries = Array.isArray(cloudGuestbook) ? cloudGuestbook : [];

  // 2. Tổng hợp số liệu từ danh sách đăng ký 15 năm (nguồn chuẩn nhất cho việc tham gia & chuyển khoản)
  const confirmedRegs = registrations.filter((r) => r.status === "confirmed");
  const pendingRegs = registrations.filter((r) => r.status !== "confirmed");
  const totalCollectedAmount = confirmedRegs.reduce(
    (sum, r) => sum + (Number(r.paidAmount) || bankInfo.amount || 1000000),
    0
  );
  const totalGuestsCount = registrations.reduce(
    (sum, r) => sum + (Number(r.guestsCount) || 0),
    0
  );

  const formatGuestTag = (guests?: number) =>
    guests && guests > 0 ? ` • +${guests} người thân` : "";

  const confirmedNames = confirmedRegs.map(
    (r) =>
      `${r.fullName} (${r.className} - Áo ${r.shirtSize}${formatGuestTag(r.guestsCount)} - Đã đóng ${(Number(r.paidAmount) || bankInfo.amount).toLocaleString("vi-VN")}đ)`
  );
  const pendingNames = pendingRegs.map(
    (r) =>
      `${r.fullName} (${r.className} - Áo ${r.shirtSize}${formatGuestTag(r.guestsCount)} - Chờ chuyển khoản)`
  );
  const attendingNames = registrations.map(
    (r) =>
      `${r.fullName} (${r.className}${formatGuestTag(r.guestsCount)}${r.status === "confirmed" ? " - Đã CK ✓" : " - Chờ CK"})`
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
  const singleMembers: string[] = [];
  const allMembersList: string[] = [];
  let marriedCount = 0;
  let totalChildrenCount = 0;
  let tc10Count = 0;
  let tc11Count = 0;
  let tc12Count = 0;

  const vnToday = getVietnamToday();
  const currentMonth = vnToday.month;
  const birthdayRecords: Array<{
    name: string;
    cls: string;
    parsed: ParsedBirthday;
    daysLeft: number;
  }> = [];

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
    const reg = findRegForProfile(m);
    const parsedBday = parseBirthday(m.birthday);

    const regRegion = (m.location_region || "").toLowerCase();
    const loc = m.specific_location ? ` - ${m.specific_location}` : "";
    const regionReadable =
      regRegion === "hcm" || regRegion.includes("hồ chí minh") || regRegion.includes("hcm")
        ? "TP.HCM"
        : regRegion === "hn" || regRegion.includes("hà nội")
        ? "Hà Nội"
        : regRegion === "overseas" || regRegion.includes("ngoại") || regRegion.includes("nước ngoài")
        ? "Nước ngoài"
        : regRegion === "other" || regRegion === "dn"
        ? "Tỉnh khác"
        : m.location_region || "";
    const fullLocation = [m.specific_location?.trim(), regionReadable].filter(Boolean).join(", ");

    const jobParts = [m.job_title?.trim(), m.company?.trim()].filter(Boolean);
    const jobInfo = jobParts.length > 0 ? jobParts.join(" @ ") : "";
    const roleTag =
      m.role === "admin" ? "Admin" : m.role === "committee" ? "Ban liên lạc" : "";
    const maritalInfo =
      m.marital_status === "single"
        ? "Độc thân"
        : m.marital_status === "married"
        ? `Đã kết hôn${Number(m.children_count) > 0 ? ` (${m.children_count} con F1)` : ""}`
        : Number(m.children_count) > 0
        ? `${m.children_count} con F1`
        : "";
    const guestTag =
      reg && reg.registrationType !== "shirt_only" && (reg.guestsCount || 0) > 0
        ? `, +${reg.guestsCount} người thân`
        : "";
    const resolvedShirt = (m.shirt_size || reg?.shirtSize || "").trim();
    const resolvedDelivery = (m.delivery_address || reg?.address || "").trim();
    const statusInfo = reg
      ? reg.status === "confirmed"
        ? reg.registrationType === "shirt_only"
          ? `Đặt áo kỷ niệm (250k) & Đã CK ${(Number(reg.paidAmount) || 250000).toLocaleString("vi-VN")}đ ✓`
          : `Tham dự 15N & Đã CK ${(Number(reg.paidAmount) || bankInfo.amount).toLocaleString("vi-VN")}đ ✓${guestTag}`
        : reg.registrationType === "shirt_only"
        ? "Đặt áo kỷ niệm (250k) - Chờ CK"
        : `Tham dự 15N - Chờ CK${guestTag}`
      : m.attendance_status === "attending"
      ? "Đăng ký tham dự 15N"
      : m.attendance_status === "shirt_only"
      ? "Đặt áo kỷ niệm 15N (250k)"
      : m.attendance_status === "not_attending"
      ? "Báo vắng mặt"
      : "Chưa đăng ký 15N";

    // Gộp ĐẦY ĐỦ mọi trường thông tin thành viên đã cập nhật để AI trả lời chính xác bất kỳ câu hỏi nào
    const memberFields: string[] = [];
    if (roleTag) memberFields.push(`Vai trò: ${roleTag}`);
    if (jobInfo) memberFields.push(`Công việc: ${jobInfo}`);
    if (parsedBday) memberFields.push(`SN: ${parsedBday.display}`);
    if (fullLocation) memberFields.push(`Nơi ở: ${fullLocation}`);
    if (m.phone?.trim()) memberFields.push(`SĐT: ${m.phone.trim()}`);
    if (maritalInfo) memberFields.push(`Gia đình: ${maritalInfo}`);
    memberFields.push(`Sự kiện 15N: ${statusInfo}`);
    if (resolvedShirt) memberFields.push(`Size áo: ${resolvedShirt}`);
    if (resolvedDelivery) memberFields.push(`Nhận áo: ${resolvedDelivery}`);
    if (m.bio?.trim()) memberFields.push(`Bio: "${m.bio.trim()}"`);

    allMembersList.push(`• ${name} [${cls}] — ${memberFields.join(" | ")}`);

    if (cls.includes("10")) tc10Count++;
    else if (cls.includes("11")) tc11Count++;
    else if (cls.includes("12")) tc12Count++;

    if (m.marital_status === "single") {
      const singleLoc = fullLocation;
      const singleExtra = [
        cls,
        m.job_title ? `${m.job_title}${m.company ? ` @ ${m.company}` : ""}` : m.company || "",
        singleLoc,
      ]
        .filter(Boolean)
        .join(" - ");
      singleMembers.push(`${name} (${singleExtra})`);
    } else if (m.marital_status === "married") {
      marriedCount++;
    }
    if (typeof m.children_count === "number" && m.children_count > 0) {
      totalChildrenCount += m.children_count;
    }

    if (regRegion === "hcm" || regRegion.includes("hồ chí minh") || regRegion.includes("hcm")) {
      hcmMembers.push(`${name} (${cls}${loc})`);
    } else if (regRegion === "hn" || regRegion.includes("hà nội")) {
      hnMembers.push(`${name} (${cls}${loc})`);
    } else if (regRegion === "overseas" || regRegion.includes("ngoại") || regRegion.includes("nước ngoài")) {
      overseasMembers.push(`${name} (${cls}${loc})`);
    } else if (m.location_region) {
      otherMembers.push(`${name} (${cls}${loc || ` - ${m.location_region}`})`);
    }

    if (parsedBday) {
      birthdayRecords.push({
        name,
        cls,
        parsed: parsedBday,
        daysLeft: calcDaysUntilBirthday(
          parsedBday.day,
          parsedBday.month,
          vnToday.day,
          vnToday.month,
          vnToday.year
        ),
      });
    }
  }

  // Tổng hợp sinh nhật chuẩn theo giờ Việt Nam (hôm nay, sắp tới 30 ngày, tháng hiện tại, từng tháng 1-12)
  const birthdaysByMonth: Record<number, string[]> = {};
  const sortedByCalendar = [...birthdayRecords].sort(
    (a, b) => a.parsed.month - b.parsed.month || a.parsed.day - b.parsed.day
  );
  for (const item of sortedByCalendar) {
    const label = `${item.name} (${item.cls} - ${item.parsed.display})`;
    if (!birthdaysByMonth[item.parsed.month]) birthdaysByMonth[item.parsed.month] = [];
    birthdaysByMonth[item.parsed.month].push(label);
  }

  const allBirthdayMembers = sortedByCalendar.map(
    (item) => `${item.name} (${item.cls} - ${item.parsed.display})`
  );
  const birthdayMembersThisMonth = (birthdaysByMonth[currentMonth] || []).slice();
  const birthdayMembersToday = sortedByCalendar
    .filter((item) => item.daysLeft === 0)
    .map((item) => `${item.name} (${item.cls} - ${item.parsed.display})`);
  const upcomingBirthdayMembers = [...birthdayRecords]
    .filter((item) => item.daysLeft >= 0 && item.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .map(
      (item) =>
        `${item.name} (${item.cls} - ${item.parsed.shortDisplay}${
          item.daysLeft === 0 ? " - Hôm nay 🎂" : ` - còn ${item.daysLeft} ngày`
        })`
    );

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
      const extraNorm = normalizeForSearch(
        `${m.company || ""} ${m.job_title || ""} ${m.specific_location || ""} ${m.delivery_address || ""} ${m.bio || ""} ${m.phone || ""} ${m.shirt_size || ""}`
      );

      const exactNameHit = nameNorm.length >= 3 && qNorm.includes(nameNorm);
      const allNameWordsHit = nameWords.length >= 2 && nameWords.every((w) => qNorm.includes(w));
      const givenNameHit =
        meaningfulQueryWords.length > 0 &&
        nameWords.some((w) => w.length >= 3 && meaningfulQueryWords.includes(w));
      const extraFieldHit =
        meaningfulQueryWords.length > 0 &&
        meaningfulQueryWords.some((w) => w.length >= 4 && extraNorm.includes(w));
      const classExactHit = clsNorm && meaningfulQueryWords.includes(clsNorm);

      if (exactNameHit || allNameWordsHit || givenNameHit || extraFieldHit || classExactHit) {
        const reg = findRegForProfile(m);
        const regionLabel =
          m.location_region === "hcm"
            ? "TP.HCM"
            : m.location_region === "hn"
            ? "Hà Nội"
            : m.location_region === "overseas"
            ? "Nước ngoài"
            : m.location_region === "other" || m.location_region === "dn"
            ? "Tỉnh khác"
            : m.location_region || "";
        const locDetail = [m.specific_location, regionLabel].filter(Boolean).join(", ");
        const regGuestInfo =
          reg && reg.registrationType !== "shirt_only" && (reg.guestsCount || 0) > 0
            ? `, đi cùng +${reg.guestsCount} người thân`
            : "";
        const parsedMemberBday = parseBirthday(m.birthday);
        const resolvedShirtSize = (m.shirt_size || reg?.shirtSize || "").trim();
        const resolvedDeliveryAddr = (m.delivery_address || reg?.address || "").trim();
        const regStatus = reg
          ? reg.status === "confirmed"
            ? reg.registrationType === "shirt_only"
              ? `Đặt Áo kỷ niệm (250k) & ĐÃ CHUYỂN KHOẢN ✓`
              : `Đã đăng ký & ĐÃ CHUYỂN KHOẢN ✓${regGuestInfo ? ` (${regGuestInfo.slice(2)})` : ""}`
            : reg.registrationType === "shirt_only"
            ? `Đặt Áo kỷ niệm (250k) - Chờ chuyển khoản`
            : `Đã đăng ký tham gia 15 năm - Chờ chuyển khoản${regGuestInfo ? ` (${regGuestInfo.slice(2)})` : ""}`
          : m.attendance_status === "attending"
          ? "Đã đăng ký tham gia 15 năm 🎉"
          : m.attendance_status === "shirt_only"
          ? "Đặt Áo kỷ niệm 15 năm (không dự trực tiếp)"
          : m.attendance_status === "not_attending"
          ? "Báo vắng mặt"
          : "Chưa đăng ký 15 năm";
        const maritalLabel =
          m.marital_status === "single"
            ? "Độc thân"
            : m.marital_status === "married"
            ? `Đã kết hôn${Number(m.children_count) > 0 ? ` (${m.children_count} F1)` : ""}`
            : Number(m.children_count) > 0
            ? `${m.children_count} F1`
            : "";

        matchedMembers.push(
          `• ${m.full_name} (${m.class_name || "K33"}${m.role === "admin" ? " - Admin" : m.role === "committee" ? " - BLL" : ""}): ${
            [m.job_title?.trim(), m.company?.trim()].filter(Boolean).join(" tại ") || "Cựu SV"
          }${parsedMemberBday ? ` | Sinh nhật: ${parsedMemberBday.display}` : ""}${
            locDetail ? ` | Khu vực: ${locDetail}` : ""
          }${maritalLabel ? ` | Gia đình: ${maritalLabel}` : ""}${
            m.phone ? ` | SĐT: ${m.phone}` : ""
          }${resolvedShirtSize ? ` | Size áo: ${resolvedShirtSize}` : ""}${
            resolvedDeliveryAddr ? ` | Địa chỉ nhận áo: ${resolvedDeliveryAddr}` : ""
          }${m.bio?.trim() ? ` | Chia sẻ: "${m.bio.trim()}"` : ""} | ${regStatus}`
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

  // 5. Ban Liên Lạc (từ Cloud Settings, fallback mặc định) & Sổ Lưu Bút
  const committeeList = committeeMembers.map(
    (c) => `• ${c.name} (${c.className}) - ${c.role}: ${c.duty}${c.phone ? ` | SĐT: ${c.phone}` : ""}`
  );
  const guestbookMessages = guestbookEntries
    .filter((g) => g?.message && String(g.message).trim().length > 0)
    .slice(0, 40)
    .map(
      (g) =>
        `• ${g.name || "Thành viên K33"} (${g.className || "K33"}${g.time ? ` - ${g.time}` : ""}): "${String(g.message).trim()}"`
    );

  // 6. Xây dựng toàn bộ ngữ cảnh sống động từ Database + Settings
  const shirtOnlyRegs = registrations.filter((r) => r.registrationType === "shirt_only");
  const attendingDirectRegs = registrations.filter((r) => r.registrationType !== "shirt_only");
  const birthdayMonthsSummary = Object.entries(birthdaysByMonth)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([month, list]) => `- Tháng ${month} (${list.length} bạn): ${list.join(", ")}`)
    .join("\n");

  const rawTextContext = `
DỮ LIỆU THỰC TẾ TỪ CƠ SỞ DỮ LIỆU & CẤU HÌNH ADMIN TCDN4 - K33 UEH (WEBSITE TCDN4.TOP):
Ngày hiện tại (giờ Việt Nam): ${vnToday.display} (Tháng ${currentMonth}).

1. THÔNG TIN SỰ KIỆN HỌP MẶT 15 NĂM:
- Thời gian: Thứ Bảy, ngày 12/12/2026 (08:30 đón tiếp check-in & nhận áo Polo; 09:30 Lễ kỷ niệm 15 năm; 11:30 Đại tiệc trưa cụng ly hội ngộ).
- Địa điểm: Giảng đường Cơ sở B - Đại học Kinh tế TP.HCM (279 Nguyễn Tri Phương, Phường 5, Quận 10, TP.HCM).
- Hạn chốt danh sách & size áo: 30/11/2026.
- Bảng size áo Polo kỷ niệm: Nam (S <55kg, M 55-64kg, L 65-73kg, XL 74-82kg, 2XL 82-90kg, 3XL >90kg); Nữ (S <48kg, M 48-54kg, L 55-62kg, XL >62kg).
- Website đăng ký & xem danh bạ: https://tcdn4.top/#event và https://tcdn4.top/#directory

2. THÔNG TIN CHUYỂN KHOẢN & ĐÓNG QUỸ (CẤU HÌNH CHÍNH THỨC TỪ ADMIN):
- Mức kinh phí tham dự trực tiếp: ${bankInfo.amountText} / thành viên (bao gồm tiệc VIP, áo Polo kỷ niệm & kỷ yếu 15 năm).
- Mức chi phí không tham dự nhưng muốn nhận Áo Polo kỷ niệm 15 năm (ship tận nơi): ${bankInfo.shirtOnlyAmountText || "250.000 VNĐ"} / áo.
- Ngân hàng thụ hưởng: ${bankInfo.bankName} (Mã NH: ${bankInfo.bankCode}).
- Số tài khoản: ${bankInfo.accountNumber}
- Chủ tài khoản: ${bankInfo.accountName}
- Cú pháp chuyển khoản tham dự (1 triệu): ${bankInfo.syntaxPrefix} [Họ và Tên] [Số điện thoại] (Ví dụ: ${bankInfo.syntaxPrefix} CAO TUAN HIEP 0972555211).
- Cú pháp chuyển khoản chỉ nhận áo (250k): ${bankInfo.syntaxPrefix} AO [Họ và Tên] [Số điện thoại].
- Cách thức đóng góp: Đăng nhập https://tcdn4.top/#event -> Chọn tham gia (hoặc Không tham gia nhưng nhận áo) & size áo -> Quét mã VietQR tự động điền sẵn số tiền & nội dung. Hệ thống SePay đối soát tự động 24/7 và báo xác nhận ngay sau khi chuyển khoản thành công!
${bankInfo.phoneReceive ? `- SĐT hỗ trợ đối soát: ${bankInfo.phoneReceive}` : ""}

3. THỐNG KÊ ĐĂNG KÝ 15 NĂM & QUỸ HIỆN TẠI (REALTIME):
- Tổng số cựu sinh viên đã điểm danh trong danh bạ: ${profiles.length} bạn (TC10: ${tc10Count}, TC11: ${tc11Count}, TC12: ${tc12Count}).
- Tổng số phiếu ĐÃ ĐĂNG KÝ 15 năm: ${registrations.length} bạn (gồm ${attendingDirectRegs.length} bạn tham dự trực tiếp + ${shirtOnlyRegs.length} bạn chỉ nhận áo kỷ niệm 250k; đi cùng ${totalGuestsCount} người thân -> Tổng dự kiến ${attendingDirectRegs.length + totalGuestsCount} khách dự tiệc).
  + Đã chuyển khoản xác nhận (confirmed): ${confirmedRegs.length} bạn (Tổng quỹ đã thu: ${totalCollectedAmount.toLocaleString("vi-VN")} VNĐ).
    Danh sách đã CK: ${confirmedNames.join("; ") || "Chưa có"}.
  + Đang chờ chuyển khoản (pending): ${pendingRegs.length} bạn.
    Danh sách chờ CK: ${pendingNames.join("; ") || "Không có"}.
- Thống kê size áo đã đăng ký: ${shirtSizeSummary}.

4. TÌNH TRẠNG HÔN NHÂN & HỘI ĐỘC THÂN VUI TÍNH (REALTIME TỪ DATABASE):
- Tổng số thành viên ĐANG ĐỘC THÂN (${singleMembers.length} bạn): ${singleMembers.join("; ") || "Hiện chưa có thành viên nào cập nhật trạng thái độc thân trong danh bạ"}.
- Tổng số thành viên đã kết hôn: ${marriedCount} bạn (Tổng số con nhỏ / F1 đã ghi nhận: ${totalChildrenCount} bé).

5. PHÂN BỔ THÀNH VIÊN THEO KHU VỰC SINH SỐNG:
- TP. Hồ Chí Minh (${hcmMembers.length} bạn): ${hcmMembers.join(", ") || "Chưa có danh sách"}.
- Hà Nội (${hnMembers.length} bạn): ${hnMembers.join(", ") || "Hiện chưa có bạn nào cập nhật ở Hà Nội"}.
- Tỉnh thành khác (${otherMembers.length} bạn): ${otherMembers.join(", ") || "Chưa có danh sách"}.
- Nước ngoài / Xuất ngoại (${overseasMembers.length} bạn): ${overseasMembers.join(", ") || "Hiện chưa có bạn nào cập nhật ở nước ngoài"}.

6. BAN LIÊN LẠC TCDN4 - K33 UEH:
${committeeList.join("\n")}

7. HỒ SƠ CHI TIẾT TẤT CẢ THÀNH VIÊN ĐÃ CẬP NHẬT TRONG DANH BẠ (${allMembersList.length} bạn — đầy đủ nghề nghiệp, công ty, ngày sinh, khu vực, SĐT, gia đình/F1, size áo, địa chỉ nhận áo, bio & trạng thái 15 năm):
${allMembersList.join("\n")}

8. DỮ LIỆU NGÀY SINH NHẬT THÀNH VIÊN (ĐÃ GHI NHẬN ${allBirthdayMembers.length} / ${profiles.length} BẠN):
- Sinh nhật HÔM NAY (${vnToday.display}): ${birthdayMembersToday.join(", ") || "Không có ai sinh nhật hôm nay"}.
- Sinh nhật SẮP TỚI trong 30 ngày: ${upcomingBirthdayMembers.join("; ") || "Chưa có trong 30 ngày tới"}.
- Sinh nhật THÁNG NÀY (Tháng ${currentMonth}): ${birthdayMembersThisMonth.join(", ") || "Chưa có bạn nào ghi nhận sinh nhật trong tháng này"}.
- Toàn bộ lịch sinh nhật theo từng tháng trong năm:
${birthdayMonthsSummary || "(Chưa có thành viên nào cập nhật ngày sinh nhật trên hệ thống)"}

9. SỔ LƯU BÚT TCDN4 (${guestbookMessages.length} lời nhắn gần nhất):
${guestbookMessages.join("\n") || "(Chưa có lời nhắn nào trong Sổ Lưu Bút)"}

${matchedMembers.length > 0 ? `10. THÔNG TIN THÀNH VIÊN KHỚP TRỰC TIẾP VỚI CÂU HỎI:\n${matchedMembers.slice(0, 15).join("\n")}\n` : ""}
`;

  return {
    totalProfiles: profiles.length,
    totalAttending: registrations.length,
    totalConfirmed: confirmedRegs.length,
    totalPending: pendingRegs.length,
    totalGuestsCount,
    totalCollectedAmount,
    attendingNames,
    confirmedNames,
    pendingNames,
    hcmMembers,
    hnMembers,
    otherMembers,
    overseasMembers,
    singleMembers,
    marriedCount,
    totalChildrenCount,
    tc10Count,
    tc11Count,
    tc12Count,
    allMembersList,
    matchedMembers,
    birthdayMembersToday,
    upcomingBirthdayMembers,
    birthdayMembersThisMonth,
    birthdaysByMonth,
    allBirthdayMembers,
    currentVietnamDate: vnToday.display,
    currentVietnamMonth: currentMonth,
    shirtSizeSummary,
    committeeList,
    guestbookMessages,
    registrations,
    bankInfo,
    rawTextContext,
  };
}
