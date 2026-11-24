import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { requireAdmin, getServerSupabase } from "@/lib/supabase/requestAuth";
import { readPrivateJson, writePrivateJson } from "@/lib/private-storage";

const CONFIG_PATH = "settings/zalo-bot-config.json";
const LOCAL_CONFIG_PATH = path.join(process.cwd(), "data", "zalo-bot-config.json");

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export interface ZaloGroupConfigItem {
  id: string;
  name: string;
  link?: string;
  verifyCode: string;
  chatId?: string;
  status: "verified" | "pending";
  isDefault: boolean;
  receiveCheckin: boolean;
  receiveRegistration: boolean;
  receiveBirthday: boolean;
  receivePayment?: boolean;
  createdAt: string;
  verifiedAt?: string;
}

export interface ZaloBotConfig {
  botToken: string;
  webhookUrl: string;
  botName: string;
  isTokenValid: boolean;
  aiApiKey?: string;
  aiModel?: string;
  autoCheckin?: boolean;
  autoRegistration?: boolean;
  autoBirthday?: boolean;
  autoPayment?: boolean;
  autoGuestbook?: boolean;
  birthdayHour?: string;
  checkinTemplate?: string;
  registrationTemplate?: string;
  birthdayTemplate?: string;
  paymentTemplate?: string;
  guestbookTemplate?: string;
  groups?: ZaloGroupConfigItem[];
  updatedAt?: number;
  updatedBy?: string;
}

export const DEFAULT_ZALO_CONFIG: ZaloBotConfig = {
  botToken: "",
  webhookUrl: "",
  botName: "TCDN4 K33 Bot",
  isTokenValid: true,
  aiApiKey: "",
  aiModel: "claude-sonnet-4-6",
  autoCheckin: true,
  autoRegistration: true,
  autoBirthday: true,
  autoPayment: true,
  autoGuestbook: true,
  checkinTemplate: `🎉 ỐI DỒI ÔI CẢ NHÀ ƠI!\nSau 15 năm 'mất tích', cựu sinh viên {ten} ({lop}){nghe_nghiep}{khu_vuc} vừa chính thức lộ diện điểm danh trên Alumni Hub!\n👉 Anh em cùng khóa vào 'soi' hồ sơ và kết nối lại ngay nào: https://tcdn4.top/#directory`,
  registrationTemplate: `🔥 KÈO NÀY CĂNG ĐÂY ANH EM ƠI!\n👤 {ten} ({lop}){nguoi_nha} đã chính thức chốt slot họp mặt 15 năm tại Cơ sở B và rinh áo Polo size {size}!\n🍻 Đã có {tong_so} anh em lên thuyền sẵn sàng cụng ly ngày 12/12.\n👉 Ai chưa chốt thì vào lẹ kẻo hết bàn nhé: https://tcdn4.top/#event`,
  birthdayTemplate: `🎂 ALO ALO CẢ NHÀ ƠI!\nHôm nay là sinh nhật của bạn {ten} ({lop})! 🎉\nThay mặt đại gia đình TCDN4 K33, chúc bạn tuổi mới ngày càng phong độ, tiền vào như nước Sông Sài Gòn, sự nghiệp thăng hoa và mãi giữ tinh thần trẻ khỏe thời sinh viên nhé! 🍻\n👉 Gửi lời chúc tới {ten}: https://tcdn4.top`,
  paymentTemplate: `🔔 [XÁC NHẬN CHUYỂN KHOẢN THÀNH CÔNG - SEPAY]\n━━━━━━━━━━━━━━━━━━━━\n👤 Thành viên: {ten} ({lop})\n💰 Số tiền: +{so_tien} VNĐ\n👕 Size áo: {size}\n🏦 Ngân hàng: {ngan_hang}\n📝 Nội dung: {noi_dung}\n⏰ Thời gian: {thoi_gian}\n🔢 Mã GD: {ma_gd}\n━━━━━━━━━━━━━━━━━━━━\n✨ Trạng thái: ĐÃ XÁC NHẬN 100% THAM GIA HỘI NGỘ 15 NĂM!\n🍻 Tiến độ hiện tại: {tong_so} anh em đã đăng ký ({da_xac_nhan} bạn đã xác nhận chuyển khoản)!\n🎉 Ban Liên Lạc xin trân trọng cảm ơn bạn đã hoàn tất đóng góp!`,
  guestbookTemplate: `💌 [LỜI NHẮN TỪ PHƯƠNG XA - SỔ LƯU BÚT TCDN4]\n━━━━━━━━━━━━━━━━━━━━\n👤 {ten} ({lop}) gửi lời nhắn thân thương tới đại gia đình K33:\n\n"{loi_nhan}"{ao_ship}\n\n❤️ Dù ở xa nhưng tình đồng môn TCDN4 vẫn luôn gần kề!\n👉 Xem & thả tim Sổ Lưu Bút tại: https://tcdn4.top/#guestbook`,
  groups: [
    {
      id: "grp-all",
      name: "TCDN4 - Toàn Khóa K33",
      link: "https://zalo.me/g/yodibu606",
      verifyCode: "#TCDN4-ALL",
      status: "verified",
      isDefault: true,
      receiveCheckin: true,
      receiveRegistration: true,
      receiveBirthday: true,
      receivePayment: false,
      createdAt: "18/11/2026",
    },
    {
      id: "grp-tc10",
      name: "Lớp TC10 - K33 UEH",
      link: "",
      verifyCode: "#TCDN4-TC10",
      status: "verified",
      isDefault: false,
      receiveCheckin: true,
      receiveRegistration: true,
      receiveBirthday: true,
      receivePayment: false,
      createdAt: "18/11/2026",
    },
    {
      id: "grp-tc11",
      name: "Lớp TC11 - K33 UEH",
      link: "",
      verifyCode: "#TCDN4-TC11",
      status: "verified",
      isDefault: false,
      receiveCheckin: true,
      receiveRegistration: true,
      receiveBirthday: true,
      receivePayment: false,
      createdAt: "18/11/2026",
    },
    {
      id: "grp-tc12",
      name: "Lớp TC12 - K33 UEH",
      link: "",
      verifyCode: "#TCDN4-TC12",
      status: "verified",
      isDefault: false,
      receiveCheckin: true,
      receiveRegistration: true,
      receiveBirthday: true,
      receivePayment: false,
      createdAt: "18/11/2026",
    },
    {
      id: "grp-bll",
      name: "Ban Liên Lạc & Tổ Hậu Cần",
      link: "",
      verifyCode: "#TCDN4-BLL",
      status: "verified",
      isDefault: false,
      receiveCheckin: true,
      receiveRegistration: true,
      receiveBirthday: false,
      receivePayment: true,
      createdAt: "18/11/2026",
    },
  ],
};

function getStorageClient(req?: NextRequest): SupabaseClient {
  return getServerSupabase(req);
}

export async function loadZaloBotConfig(): Promise<ZaloBotConfig> {
  let localConfig: ZaloBotConfig | null = null;
  let remoteConfig: ZaloBotConfig | null = null;

  try {
    if (fs.existsSync(LOCAL_CONFIG_PATH)) {
      localConfig = JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, "utf-8"));
    }
  } catch {}

  const supabase = getStorageClient();
  remoteConfig = await readPrivateJson<ZaloBotConfig>(CONFIG_PATH, supabase);

  let chosen = DEFAULT_ZALO_CONFIG;
  if (localConfig && remoteConfig) {
    const localTime = localConfig.updatedAt || 0;
    const remoteTime = remoteConfig.updatedAt || 0;
    chosen =
      localTime >= remoteTime
        ? { ...DEFAULT_ZALO_CONFIG, ...remoteConfig, ...localConfig }
        : { ...DEFAULT_ZALO_CONFIG, ...localConfig, ...remoteConfig };
  } else if (localConfig) {
    chosen = { ...DEFAULT_ZALO_CONFIG, ...localConfig };
  } else if (remoteConfig) {
    chosen = { ...DEFAULT_ZALO_CONFIG, ...remoteConfig };
  }

  return chosen;
}

export async function saveZaloBotConfig(
  patch: Partial<ZaloBotConfig>,
  userEmail?: string,
  req?: NextRequest
): Promise<{ success: boolean; config: ZaloBotConfig; cloudSynced: boolean }> {
  const current = await loadZaloBotConfig();
  const updated: ZaloBotConfig = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
    updatedBy: userEmail || current.updatedBy || "system",
  };

  const json = JSON.stringify(updated, null, 2);

  let cloudOk = false;
  try {
    const supabase = getStorageClient(req);
    const saved = await writePrivateJson(CONFIG_PATH, updated, supabase);
    if (saved.ok) cloudOk = true;
  } catch {}

  try {
    const dir = path.dirname(LOCAL_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_CONFIG_PATH, json, "utf-8");
  } catch {}

  return { success: true, config: updated, cloudSynced: cloudOk };
}

// GET /api/settings/zalo - Lấy cấu hình Bot Nhóm Zalo
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status, headers: NO_STORE_HEADERS });
  }

  const config = await loadZaloBotConfig();
  return NextResponse.json(
    { success: true, config },
    { headers: NO_STORE_HEADERS }
  );
}

// PUT /api/settings/zalo - Cập nhật cấu hình Bot Nhóm Zalo (Token, Webhook URL, Mẫu tin nhắn)
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status, headers: NO_STORE_HEADERS });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Dữ liệu JSON không hợp lệ" }, { status: 400 });
  }

  const { config: updated, cloudSynced: cloudOk } = await saveZaloBotConfig(
    body,
    auth.user.email || auth.user.id,
    req
  );

  return NextResponse.json(
    {
      success: true,
      message: "Đã lưu cấu hình Bot Nhóm Zalo thành công!",
      cloudSynced: cloudOk,
      config: updated,
    },
    { headers: NO_STORE_HEADERS }
  );
}
