import { NextResponse, after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadZaloBotConfig, saveZaloBotConfig, ZaloGroupConfigItem } from "@/app/api/settings/zalo/route";
import { getAlumniDatabaseContext } from "@/lib/ai-database-context";
import { loadMergedRegistrations } from "@/lib/alumni-server";
import { formatPlainTextForZalo } from "@/lib/zalo-format";
import { readPrivateJson, writePrivateJson } from "@/lib/private-storage";
import fs from "fs";
import path from "path";

const WEBHOOK_LOGS_PATH = path.join(process.cwd(), "data", "zalo-webhook-logs.json");
const CLOUD_WEBHOOK_LOGS_PATH = "settings/zalo-webhook-logs.json";
const CHECKINS_PATH = "settings/zalo-checkins.json";
const REGISTRATIONS_NOTIFIED_PATH = "settings/zalo-registrations.json";
const LOCAL_CHECKINS_PATH = path.join(process.cwd(), "data", "zalo-checkins.json");

async function loadCloudIdList(storagePath: string, localFallbackPath?: string): Promise<string[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: pub } = supabase.storage.from("alumni-media").getPublicUrl(storagePath);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const parsed = JSON.parse(await res.text());
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}

  if (localFallbackPath) {
    try {
      if (fs.existsSync(localFallbackPath)) {
        const data = JSON.parse(fs.readFileSync(localFallbackPath, "utf-8"));
        if (Array.isArray(data)) return data;
      }
    } catch {}
  }

  return [];
}

async function markCloudIdList(
  storagePath: string,
  identifiers: string[],
  localFallbackPath?: string
): Promise<void> {
  const list = await loadCloudIdList(storagePath, localFallbackPath);
  let changed = false;
  for (const id of identifiers) {
    if (id && !list.includes(id)) {
      list.push(id);
      changed = true;
    }
  }
  if (!changed) return;

  if (localFallbackPath) {
    try {
      const dir = path.dirname(localFallbackPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(localFallbackPath, JSON.stringify(list, null, 2), "utf-8");
    } catch {}
  }

  try {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from("alumni-media").upload(
      storagePath,
      Buffer.from(JSON.stringify(list, null, 2), "utf-8"),
      { contentType: "application/json; charset=utf-8", upsert: true, cacheControl: "0" }
    );
  } catch {}
}

// Đọc danh sách định danh các thành viên đã gửi thông báo điểm danh Zalo (ưu tiên Cloud Storage)
async function loadCheckins(): Promise<string[]> {
  return loadCloudIdList(CHECKINS_PATH, LOCAL_CHECKINS_PATH);
}

// Lưu định danh thành viên đã điểm danh để không bao giờ gửi lại lần 2
async function markCheckedIn(identifiers: string[]): Promise<void> {
  return markCloudIdList(CHECKINS_PATH, identifiers, LOCAL_CHECKINS_PATH);
}

// Helper ghi nhận nhật ký webhook gần nhất (lưu kín trong Private Bucket `alumni-private` + Local)
async function loadWebhookLogs(): Promise<any[]> {
  try {
    const parsed = await readPrivateJson<any[]>(CLOUD_WEBHOOK_LOGS_PATH);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  try {
    if (fs.existsSync(WEBHOOK_LOGS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(WEBHOOK_LOGS_PATH, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function appendWebhookLog(entry: any) {
  // Fire-and-forget lưu local ngay + lưu Private Cloud ngầm
  try {
    const dir = path.dirname(WEBHOOK_LOGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let logs: any[] = [];
    if (fs.existsSync(WEBHOOK_LOGS_PATH)) {
      try {
        logs = JSON.parse(fs.readFileSync(WEBHOOK_LOGS_PATH, "utf-8"));
      } catch {
        logs = [];
      }
    }
    logs.unshift({
      time: new Date().toISOString(),
      ...entry,
    });
    if (logs.length > 25) logs = logs.slice(0, 25);
    fs.writeFileSync(WEBHOOK_LOGS_PATH, JSON.stringify(logs, null, 2), "utf-8");
  } catch {}

  const persistCloudLog = async () => {
    try {
      const cloudLogs = await loadWebhookLogs();
      cloudLogs.unshift({ time: new Date().toISOString(), ...entry });
      const trimmed = cloudLogs.slice(0, 20);
      await writePrivateJson(CLOUD_WEBHOOK_LOGS_PATH, trimmed);
    } catch {}
  };

  try {
    after(persistCloudLog);
  } catch {
    void persistCloudLog();
  }
}

// Hàm gửi tin nhắn chính thức qua Zalo Bot Platform API (Bot Elephant)
export async function sendZaloBotMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; status?: number; error?: string; responseData?: any }> {
  const cleanText = formatPlainTextForZalo(text);
  if (!botToken || !chatId || !cleanText) {
    return { ok: false, error: "Thiếu botToken, chatId hoặc text" };
  }

  try {
    const url = `https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(chatId),
        text: cleanText,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || (data && data.ok === false)) {
      return {
        ok: false,
        status: res.status,
        error: data?.description || `Zalo Bot API trả mã lỗi ${res.status}`,
        responseData: data,
      };
    }

    return { ok: true, status: res.status, responseData: data };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Lỗi mạng khi gọi Zalo Bot API" };
  }
}

// Trích xuất Chat ID từ mọi biến thể payload của Zalo Bot Platform
function extractChatId(payload: any): string | null {
  const possible = [
    payload?.result?.message?.chat?.id,
    payload?.message?.chat?.id,
    payload?.result?.chat?.id,
    payload?.chat?.id,
    payload?.chat_id,
    payload?.result?.chat_id,
    payload?.message?.chat_id,
    payload?.result?.message?.chat_id,
    payload?.event?.chat_id,
    payload?.data?.chat_id,
    payload?.data?.chat?.id,
    payload?.sender?.id,
    payload?.from?.id,
    payload?.result?.from?.id,
    payload?.message?.from?.id,
  ];

  for (const item of possible) {
    if (item !== undefined && item !== null && String(item).trim().length > 0) {
      return String(item).trim();
    }
  }
  return null;
}

// Trích xuất nội dung tin nhắn gửi tới từ Zalo
function extractIncomingText(payload: any): string {
  const possible = [
    payload?.result?.message?.text,
    payload?.message?.text,
    payload?.result?.text,
    payload?.text,
    payload?.content,
    payload?.message?.content,
    payload?.result?.message?.content,
    payload?.data?.text,
    payload?.data?.message,
    typeof payload?.message === "string" ? payload.message : null,
  ];

  for (const item of possible) {
    if (typeof item === "string" && item.trim().length > 0) {
      return item.trim();
    }
  }
  return "";
}

// =============================================================================
// TRỢ LÝ AI TRUY VẤN DỮ LIỆU THỰC TẾ & TRẢ LỜI ĐỒNG MÔN TRONG NHÓM ZALO
// =============================================================================
async function handleAlumniAiQuery(
  rawQuery: string,
  chatId: string,
  botToken: string,
  aiApiKey?: string
): Promise<{ ok: boolean; replyText?: string; usedProvider?: string; usedModel?: string }> {
  const botConfig = await loadZaloBotConfig();
  const escapedBotName = (botConfig.botName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  let cleanQuery = rawQuery
    .replace(/@Bot\s*Elephant/gi, "")
    .replace(/@Bot\s*TCDN4[^\s]*/gi, "")
    .replace(/@TCDN4[^\s]*/gi, "")
    .replace(/@Bot/gi, "")
    .replace(/@bot\.[A-Za-z0-9_]+/gi, "")
    .replace(/^bot\s*(ơi|oi|elephant|ai)?[,:\s]*/i, "");

  if (escapedBotName) {
    cleanQuery = cleanQuery.replace(new RegExp(`@?${escapedBotName}`, "gi"), "");
  }
  cleanQuery = cleanQuery.trim();

  // 1. TRUY VẤN TOÀN BỘ DỮ LIỆU THỰC TẾ TỪ DATABASE SUPABASE + CẤU HÌNH ADMIN (NGÂN HÀNG, ĐĂNG KÝ, DANH BẠ, BLL)
  const dbSummary = await getAlumniDatabaseContext(cleanQuery);
  const bankInfo = dbSummary.bankInfo;
  const systemContext = dbSummary.rawTextContext;
  const selectedModel = botConfig.aiModel || "claude-sonnet-4-6";
  const activeKey = aiApiKey || botConfig.aiApiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || process.env.GEMINI_API_KEY;

  const systemPrompt = `Bạn là Bot AI K33 (tên hiển thị: ${botConfig.botName || "Bot Elephant"}) — trợ lý thông minh, hài hước, hào sảng và đậm chất sinh viên UEH của tập thể Tài chính Doanh nghiệp 4, Khóa 33 (TCDN4 - K33 UEH).

Quy tắc trả lời:
1. TRẢ LỜI TỰ DO MỌI CHỦ ĐỀ BÊN NGOÀI: Nếu thành viên nhờ làm thơ (thất ngôn tứ tuyệt, lục bát...), viết lời khích lệ đi họp lớp, kể chuyện vui, tư vấn quán ăn/nhậu, giải đáp kiến thức đời sống, tài chính, công việc hay trò chuyện phiếm -> HÃY PHÁT HUY TỐI ĐA TRÍ TUỆ CỦA BẠN để trả lời sáng tạo, tự nhiên, đúng trọng tâm câu hỏi! Tuyệt đối KHÔNG ép trả lời bằng danh sách/thống kê database khi câu hỏi không hỏi về số liệu lớp.
2. CHÍNH XÁC 100% KHI HỎI DỮ LIỆU LỚP: Nếu câu hỏi có liên quan đến thông tin tập thể TCDN4 (số người đăng ký, người thân đi cùng, ai đã đóng tiền, số tài khoản, mức phí ${bankInfo.amountText}, cú pháp CK, lịch họp 12/12, địa điểm, size áo, Ban Liên Lạc, danh sách anh em ở TP.HCM / Hà Nội / Nước ngoài, ai đang độc thân / tình trạng hôn nhân, thông tin bạn bè, sinh nhật...) -> PHẢI trích xuất chính xác từ phần DỮ LIỆU THỰC TẾ bên dưới, tuyệt đối không bịa số liệu hay STK.
3. ĐỊNH DẠNG ZALO (BẮT BUỘC): TUYỆT ĐỐI KHÔNG dùng cú pháp Markdown (KHÔNG dùng **in đậm**, *in nghiêng*, ### tiêu đề, dấu backtick hay [text](url)). Zalo không hỗ trợ Markdown nên sẽ hiện nguyên ký tự ** rất xấu. Chỉ trả về văn bản thuần (plain text), xuống dòng thoáng, gạch đầu dòng bằng dấu "• " hoặc emoji vừa phải, thân tình, xưng hô tự nhiên 'mình / bạn' hoặc 'em / anh chị'.`;

  let replyText = "";
  let usedProvider = "builtin-db";
  let usedModel = "k33-live-db";

  // 2. GỌI CLAUDE AI HOẶC GEMINI VỚI DANH SÁCH MODEL ĐANG HOẠT ĐỘNG THỰC TẾ
  if (activeKey) {
    const isClaudeKey = activeKey.startsWith("sk-ant") || (!activeKey.startsWith("AIza") && activeKey.startsWith("sk-"));
    const preferClaude = isClaudeKey && !selectedModel.startsWith("gemini");

    if (preferClaude) {
      const claudeCandidates = [
        selectedModel,
        "claude-sonnet-4-6",
        "claude-sonnet-5-5",
        "claude-haiku-4-5-20251001",
        "claude-sonnet-4-5-20250929",
        "claude-haiku-5-5",
      ].filter((v, i, a) => v && v.startsWith("claude") && a.indexOf(v) === i);

      for (const m of claudeCandidates) {
        try {
          const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": activeKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: m,
              max_tokens: 900,
              system: systemPrompt,
              messages: [
                {
                  role: "user",
                  content: `${systemContext}\n\nCâu hỏi của thành viên trong nhóm Zalo: "${cleanQuery || rawQuery}"`,
                },
              ],
            }),
          });

          if (claudeRes.ok) {
            const claudeData = await claudeRes.json().catch(() => null);
            const text = claudeData?.content?.[0]?.text;
            if (text && text.trim().length > 5) {
              replyText = text.trim();
              usedProvider = "claude";
              usedModel = m;
              break;
            }
          }
        } catch {}
      }
    }

    if (!replyText && (activeKey.startsWith("AIza") || selectedModel.startsWith("gemini"))) {
      const geminiCandidates = [
        selectedModel.startsWith("gemini") ? selectedModel : "gemini-2.0-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
      ].filter((v, i, a) => a.indexOf(v) === i);

      for (const gm of geminiCandidates) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${gm}:generateContent?key=${activeKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `${systemPrompt}\n\n${systemContext}\n\nCâu hỏi của thành viên trong nhóm Zalo: "${cleanQuery || rawQuery}"`,
                      },
                    ],
                  },
                ],
              }),
            }
          );
          if (geminiRes.ok) {
            const gemData = await geminiRes.json().catch(() => null);
            const text = gemData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim().length > 5) {
              replyText = text.trim();
              usedProvider = "gemini";
              usedModel = gm;
              break;
            }
          }
        } catch {}
      }
    }
  }

  // 3. BỘ TRẢ LỜI TRỰC TIẾP TỪ DATABASE & SETTINGS (DỰ PHÒNG CHUẨN 100% KHI KHÔNG DÙNG/LỖI CLAUDE)
  if (!replyText) {
    const qLower = (cleanQuery || rawQuery).toLowerCase();

    // Ưu tiên 1: Hỏi về số lượng người đăng ký / ai đã đóng tiền / danh sách tham gia
    if (/(bao nhiêu\s*(người|bạn|slot|thành viên)|mấy\s*(người|bạn)|ai\s*(đã\s*)?(tham gia|đi|đăng ký|chốt|đóng tiền|chuyển khoản)|danh sách\s*(tham gia|đăng ký|đóng tiền|chuyển khoản)|đăng ký rồi|đã đóng tiền|đã chuyển khoản)/.test(qLower)) {
      const confirmedPreview = dbSummary.confirmedNames.slice(0, 8).join("\n• ");
      const pendingPreview = dbSummary.pendingNames.slice(0, 8).join("\n• ");
      replyText =
        `📊 [THỐNG KÊ HỘI NGỘ 15 NĂM - REALTIME]\n` +
        `👥 Đã điểm danh danh bạ: ${dbSummary.totalProfiles} bạn (TC10: ${dbSummary.tc10Count}, TC11: ${dbSummary.tc11Count}, TC12: ${dbSummary.tc12Count})\n` +
        `🔥 Đã đăng ký tham dự 15 năm: ${dbSummary.totalAttending} bạn\n` +
        `✅ Đã chuyển khoản xác nhận: ${dbSummary.totalConfirmed} bạn (${dbSummary.totalCollectedAmount.toLocaleString("vi-VN")} VNĐ)\n` +
        `${confirmedPreview ? `• ${confirmedPreview}\n` : ""}` +
        `⏳ Chờ chuyển khoản: ${dbSummary.totalPending} bạn\n` +
        `${pendingPreview ? `• ${pendingPreview}\n` : ""}` +
        `👉 Đăng ký & xem danh sách trực tiếp: https://tcdn4.top/#event`;
    }
    // Ưu tiên 2: Hỏi về số tài khoản, cách thức chuyển khoản, kinh phí, tiền quỹ, vé, mã QR
    else if (/số tài khoản|tài khoản|\bstk\b|chuyển khoản|cách thức|kinh phí|đóng quỹ|tiền quỹ|quỹ lớp|ngân hàng|vietqr|\bqr\b|bao nhiêu tiền|giá vé|mức phí|cú pháp/.test(qLower)) {
      replyText =
        `💳 [THÔNG TIN CHUYỂN KHOẢN HỘI NGỘ 15 NĂM TCDN4]\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🏦 Ngân hàng: ${bankInfo.bankName}\n` +
        `🔢 Số tài khoản: ${bankInfo.accountNumber}\n` +
        `👤 Chủ tài khoản: ${bankInfo.accountName}\n` +
        `💰 Mức kinh phí: ${bankInfo.amountText} / thành viên\n` +
        `📝 Cú pháp CK: ${bankInfo.syntaxPrefix} [Họ và Tên] [SĐT]\n` +
        `   (VD: ${bankInfo.syntaxPrefix} CAO TUAN HIEP 0972555211)\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ Cách thức: Vào https://tcdn4.top/#event đăng ký chọn size áo và quét mã VietQR. Hệ thống SePay tự động đối soát & xác nhận ngay sau khi chuyển khoản thành công! 🎉`;
    }
    // Ưu tiên 3: Hỏi về Ban Liên Lạc
    else if (/ban liên lạc|\bbll\b|liên hệ ai|trưởng ban|phó ban|hỗ trợ/.test(qLower)) {
      replyText =
        `🏛️ [BAN LIÊN LẠC TCDN4 - K33 UEH]\n` +
        `${dbSummary.committeeList.join("\n")}\n\n` +
        `👉 Xem chi tiết tại: https://tcdn4.top`;
    }
    // Ưu tiên 4: Hỏi về thời gian, địa điểm, lịch trình
    else if (/khi nào|mấy giờ|địa điểm|thời gian|lịch trình|ngay nao|ngày nào|tổ chức ở đâu|họp ở đâu/.test(qLower)) {
      replyText =
        `🎉 [LỊCH HẸN 15 NĂM TCDN4 - K33 UEH]\n` +
        `⏰ Thời gian: Thứ Bảy, 12/12/2026 (Bắt đầu từ 08:30 sáng)\n` +
        `📍 Địa điểm: Giảng đường Cơ sở B, ĐH Kinh tế TP.HCM (279 Nguyễn Tri Phương, Q.10)\n` +
        `🍻 Lịch trình: 08:30 đón tiếp nhận áo Polo & chụp ảnh; 09:30 Lễ kỷ niệm; 11:30 Đại tiệc trưa hội ngộ!\n` +
        `👉 Chi tiết & đăng ký: https://tcdn4.top/#event`;
    }
    // Hỏi về khu vực sinh sống (Hà Nội, TP.HCM, nước ngoài, tỉnh khác)
    else if (/hà nội|\bhn\b|hcm|hồ chí minh|sài gòn|khu vực|nước ngoài|xuất ngoại|tỉnh khác|ở đâu/.test(qLower)) {
      if (/hà nội|\bhn\b/.test(qLower)) {
        replyText =
          dbSummary.hnMembers.length > 0
            ? `📍 Đồng môn K33 tại Hà Nội hiện có (${dbSummary.hnMembers.length} bạn): ${dbSummary.hnMembers.join(", ")} 🗼!\n👉 Danh bạ: https://tcdn4.top/#directory`
            : `📍 Hiện chưa có bạn nào cập nhật đang sinh sống ở Hà Nội. Cả nhà nhắc anh em vào https://tcdn4.top điểm danh nhé!`;
      } else if (/nước ngoài|xuất ngoại/.test(qLower)) {
        replyText =
          dbSummary.overseasMembers.length > 0
            ? `✈️ Đồng môn đang ở Nước ngoài (${dbSummary.overseasMembers.length} bạn): ${dbSummary.overseasMembers.join(", ")}!\n👉 Danh bạ: https://tcdn4.top/#directory`
            : `✈️ Hiện chưa có bạn nào cập nhật hồ sơ ở Nước ngoài trên danh bạ.`;
      } else {
        replyText =
          `📍 [PHÂN BỔ ĐỒNG MÔN TCDN4 THEO KHU VỰC]\n` +
          `• TP.HCM (${dbSummary.hcmMembers.length} bạn): ${dbSummary.hcmMembers.slice(0, 12).join(", ") || "Chưa có"}\n` +
          `• Hà Nội (${dbSummary.hnMembers.length} bạn): ${dbSummary.hnMembers.join(", ") || "Chưa có"}\n` +
          `• Nước ngoài (${dbSummary.overseasMembers.length} bạn): ${dbSummary.overseasMembers.join(", ") || "Chưa có"}\n` +
          `• Tỉnh khác (${dbSummary.otherMembers.length} bạn): ${dbSummary.otherMembers.slice(0, 10).join(", ") || "Chưa có"}\n` +
          `👉 Xem bản đồ & danh bạ: https://tcdn4.top/#directory`;
      }
    }
    // Hỏi về size áo Polo
    else if (/size|áo polo|chọn áo|bảng áo|đặt áo/.test(qLower)) {
      replyText =
        `👕 [BẢNG SIZE ÁO POLO KỶ NIỆM 15 NĂM TCDN4]\n` +
        `• Nam: S (<55kg) • M (55-64kg) • L (65-73kg) • XL (74-82kg) • 2XL (82-90kg) • 3XL (>90kg)\n` +
        `• Nữ: S (<48kg) • M (48-54kg) • L (55-62kg) • XL (>62kg)\n` +
        `📊 Thống kê áo đã chọn: ${dbSummary.shirtSizeSummary}\n` +
        `👉 Vào chốt size áo ngay tại: https://tcdn4.top/#event`;
    }
    // Hỏi về tình trạng hôn nhân / hội độc thân
    else if (/độc thân|\bfa\b|còn ế|chưa kết hôn|chưa lập gia đình|hội độc thân|tình trạng hôn nhân/.test(qLower)) {
      if (dbSummary.singleMembers.length > 0) {
        replyText =
          `💘 [HỘI ĐỘC THÂN VUI TÍNH TCDN4 - K33 UEH]\n` +
          `Hiện có ${dbSummary.singleMembers.length} đồng môn đang cập nhật trạng thái độc thân trên danh bạ:\n` +
          dbSummary.singleMembers.map((s: string) => `• ${s}`).join("\n") +
          `\n\n👉 Vào danh bạ kết nối & làm mai ngay tại: https://tcdn4.top/#directory`;
      } else {
        replyText =
          `💘 Hiện trên danh bạ chưa có bạn nào bật trạng thái Độc thân (đã ghi nhận ${dbSummary.marriedCount} bạn đã kết hôn).\n` +
          `👉 Cả nhà nhắc anh em vào cập nhật hồ sơ tại: https://tcdn4.top/#directory`;
      }
    }
    // Hỏi về sinh nhật
    else if (/sinh\s*nh[aậ]t/.test(qLower)) {
      if (dbSummary.birthdayMembersThisMonth.length > 0) {
        replyText =
          `🎂 Danh sách đồng môn sinh nhật tháng ${new Date().getMonth() + 1} này:\n` +
          dbSummary.birthdayMembersThisMonth.map((b: string) => `• ${b}`).join("\n") +
          `\n👉 Cả nhà cùng vào chúc mừng tại: https://tcdn4.top`;
      } else {
        replyText = `🎂 Tháng ${new Date().getMonth() + 1} này chưa có bạn nào ghi nhận sinh nhật trên danh bạ. Cập nhật ngày sinh tại: https://tcdn4.top`;
      }
    }
    // Tra cứu thông tin thành viên cụ thể (tìm thấy trong database)
    else if (dbSummary.matchedMembers.length > 0) {
      replyText =
        `🔍 [THÔNG TIN ĐỒNG MÔN TỪ DANH BẠ TCDN4]\n` +
        `${dbSummary.matchedMembers.slice(0, 8).join("\n")}\n\n` +
        `👉 Xem đầy đủ tại danh bạ: https://tcdn4.top/#directory`;
    }
    // Chào hỏi chung hoặc câu hỏi khác
    else {
      replyText =
        `🤖 [TCDN4 K33 Alumni Hub Bot] Chào bạn!\n` +
        `Mình đã kết nối trực tiếp cơ sở dữ liệu tcdn4.top (${dbSummary.totalProfiles} bạn điểm danh • ${dbSummary.totalAttending} bạn đăng ký 15 năm • ${dbSummary.totalConfirmed} bạn đã CK).\n` +
        `Bạn có thể hỏi mình bất cứ điều gì về: số tài khoản & cách chuyển khoản, lịch họp lớp 12/12, ai đã đăng ký/đóng tiền, ai ở Hà Nội/TP.HCM/nước ngoài, bảng size áo, Ban Liên Lạc, hoặc tìm bạn bè cùng khóa nhé! 🍻\n` +
        `👉 Website: https://tcdn4.top/#event`;
    }
  }

  // Làm sạch mọi ký tự Markdown (**, *, ###...) trước khi gửi sang Zalo
  replyText = formatPlainTextForZalo(replyText);

  // Gửi tin nhắn trả lời qua Zalo Bot Platform API
  const sendRes = await sendZaloBotMessage(botToken, chatId, replyText);
  return { ok: sendRes.ok, replyText, usedProvider, usedModel };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");

  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Kiểm tra trạng thái Bot Token thực tế qua Zalo Platform
  const botConfig = await loadZaloBotConfig();
  const botToken = process.env.ZALO_BOT_TOKEN || botConfig.botToken;

  let botInfo: any = null;
  if (botToken) {
    try {
      const res = await fetch(`https://bot-api.zaloplatforms.com/bot${botToken}/getMe`);
      botInfo = await res.json().catch(() => null);
    } catch {}
  }

  const includeLogs = searchParams.get("logs") === "1";
  const recentLogs = includeLogs ? await loadWebhookLogs() : undefined;

  return NextResponse.json({
    status: "ok",
    service: "TCDN4 Zalo Bot Webhook Endpoint",
    time: new Date().toISOString(),
    botConfigured: Boolean(botToken),
    botInfo: botInfo?.result || null,
    connectedGroupsCount: (botConfig.groups || []).filter((g) => Boolean(g.chatId)).length,
    groups: (botConfig.groups || []).map((g) => ({
      id: g.id,
      name: g.name,
      verifyCode: g.verifyCode,
      hasChatId: Boolean(g.chatId),
      chatId: g.chatId || null,
      status: g.status,
    })),
    ...(includeLogs ? { recentLogs } : {}),
  });
}

export async function POST(request: Request) {
  try {
    let payload: any = {};
    try {
      payload = await request.json();
    } catch {
      payload = {};
    }

    // Ghi log để chẩn đoán
    appendWebhookLog({
      event: "incoming_request",
      payload,
    });

    const botConfig = await loadZaloBotConfig();
    const botToken = payload.botToken || process.env.ZALO_BOT_TOKEN || botConfig.botToken;
    const aiApiKey = botConfig.aiApiKey || process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

    const incomingText = extractIncomingText(payload);
    const incomingChatId = extractChatId(payload);

    // Xác định xem đây là sự kiện Webhook từ Zalo gửi về (không có payload.type nội bộ của website)
    const isWebsiteInternalCall = Boolean(payload?.type);
    const msgObj = payload?.result?.message || payload?.message || payload?.data?.message || null;
    const isFromBot = Boolean(msgObj?.from?.is_bot || payload?.from?.is_bot || payload?.sender?.is_bot);

    if (!isWebsiteInternalCall && isFromBot) {
      return NextResponse.json({ ok: true, ignored: "bot_self_message" });
    }

    // =========================================================================
    // 1. XỬ LÝ KHI CÓ TIN NHẮN TỪ ZALO GỬI VỀ WEBHOOK (XÁC MINH NHÓM, CÂU HỎI AI)
    // =========================================================================
    if (!isWebsiteInternalCall && incomingText) {
      // CHỈ nhận diện lệnh xác minh nhóm khi có cú pháp /verify hoặc mã #TCDN4- (tránh nhầm câu hỏi "ai đã xác nhận tham gia?")
      const isVerify =
        /\/verify/i.test(incomingText) ||
        /#TCDN4-/i.test(incomingText);

      // CÂU LỆNH XÁC MINH NHÓM: /verify #MÃ_NHÓM (hoặc @Bot Elephant /verify #MÃ)
      if (isVerify) {
        const upperText = incomingText.toUpperCase();
        const currentGroups: ZaloGroupConfigItem[] = Array.isArray(botConfig.groups) ? [...botConfig.groups] : [];

        // Tìm nhóm theo mã verifyCode (ví dụ #TCDN4-BLL, #TCDN4-ALL, #TCDN4-TC10, v.v.)
        let matchedGroup = currentGroups.find((g) => {
          const rawCode = (g.verifyCode || "").toUpperCase().replace(/^#/, "").trim();
          if (!rawCode) return false;
          return upperText.includes(rawCode) || upperText.includes(`#${rawCode}`);
        });

        // Nếu chưa tìm thấy, thử bóc tách mã từ regex
        const codeMatch =
          incomingText.match(/\/verify\s+([#A-Za-z0-9_\-]+)/i) ||
          incomingText.match(/(#TCDN4-[A-Za-z0-9_\-]+)/i) ||
          incomingText.match(/#(TC[0-9]{2}|BLL|ALL)/i);
        const extractedCode = codeMatch ? (codeMatch[1].startsWith("#") ? codeMatch[1] : `#${codeMatch[1]}`) : "";

        if (!matchedGroup && extractedCode) {
          matchedGroup = currentGroups.find(
            (g) => (g.verifyCode || "").toUpperCase() === extractedCode.toUpperCase()
          );
        }

        if (matchedGroup && incomingChatId) {
          // CẬP NHẬT CHAT ID VÀO NHÓM VÀ LƯU VÀO CẤU HÌNH HỆ THỐNG
          matchedGroup.chatId = String(incomingChatId);
          matchedGroup.status = "verified";
          matchedGroup.verifiedAt = new Date().toISOString();

          await saveZaloBotConfig({ groups: currentGroups }, "webhook-verify");

          // GỬI TIN NHẮN PHẢN HỒI XÁC NHẬN CHÍNH THỨC VÀO NHÓM QUA ZALO BOT PLATFORM
          const confirmationText =
            `✅ [TCDN4 K33 ALUMNI HUB] KẾT NỐI THÀNH CÔNG!\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `🎉 Bot AI đã liên kết thành công với nhóm:\n` +
            `👉 ${matchedGroup.name}\n` +
            `📌 Mã xác minh: ${matchedGroup.verifyCode}\n` +
            `🆔 Chat ID: ${incomingChatId}\n\n` +
            `🔔 Từ bây giờ, Bot sẽ tự động cập nhật vào nhóm:\n` +
            `• Thông tin cựu sinh viên đăng ký họp mặt 15 năm (12/12/2026)\n` +
            `• Thành viên mới điểm danh trên website\n` +
            `• Lời chúc mừng sinh nhật đồng môn\n\n` +
            `🤖 Bạn cũng có thể tag @Bot và hỏi bất kỳ điều gì về họp lớp, địa điểm, STK hay tìm bạn bè nhé!\n\n` +
            `🌐 Truy cập website họp khóa: https://tcdn4.top\n` +
            `Cảm ơn anh em Ban Liên Lạc đã kích hoạt! 🍻`;

          const sendResult = await sendZaloBotMessage(botToken, incomingChatId, confirmationText);

          appendWebhookLog({
            event: "verify_success",
            groupName: matchedGroup.name,
            chatId: incomingChatId,
            sendResult,
          });

          return NextResponse.json({
            ok: true,
            success: true,
            event: "verify_success",
            matchedGroup: matchedGroup.name,
            chatId: incomingChatId,
            messageSent: sendResult.ok,
            error: sendResult.error || null,
          });
        }

        // Nếu gửi lệnh verify nhưng không tìm thấy mã nhóm hợp lệ
        if (incomingChatId) {
          const listCodes = currentGroups
            .map((g) => `• ${g.name}: /verify ${g.verifyCode}`)
            .join("\n");

          const helpText =
            `⚠️ [TCDN4 K33 Bot] Không tìm thấy mã nhóm hợp lệ trong tin nhắn của bạn ("${extractedCode || incomingText}").\n\n` +
            `📌 Cú pháp chuẩn trong nhóm:\n` +
            `@Bot /verify #MÃ_NHÓM\n\n` +
            `Danh sách các mã nhóm hợp lệ:\n` +
            `${listCodes}\n\n` +
            `Vui lòng nhắn đúng cú pháp để Bot nhận diện nhóm nhé! 🍻`;

          await sendZaloBotMessage(botToken, incomingChatId, helpText);
        }

        return NextResponse.json({
          ok: true,
          success: false,
          event: "verify_code_not_found",
          incomingText,
          chatId: incomingChatId,
        });
      }

      // TRẢ LỜI CÂU HỎI TRỰC TIẾP TỪ THÀNH VIÊN TRONG NHÓM CHAT HOẶC CHAT RIÊNG (TRỢ LÝ AI + DATABASE)
      if (incomingChatId) {
        const chatType = msgObj?.chat?.type || payload?.chat?.type || "";
        const isPrivateChat = String(chatType).toLowerCase() === "private";
        const hasPayloadMention =
          (Array.isArray(msgObj?.mentions) && msgObj.mentions.length > 0) ||
          (Array.isArray(msgObj?.entities) && msgObj.entities.some((e: any) => e?.type === "mention" || e?.type === "bot_command"));
        const escapedBotName = (botConfig.botName || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const mentionsBotByName = escapedBotName ? new RegExp(escapedBotName, "i").test(incomingText) : false;

        const isBotAddressed =
          isPrivateChat ||
          hasPayloadMention ||
          mentionsBotByName ||
          /@Bot/i.test(incomingText) ||
          /@bot\./i.test(incomingText) ||
          /@TCDN4/i.test(incomingText) ||
          /bot\s*(ơi|oi|ai|elephant|tcdn4)/i.test(incomingText) ||
          /trợ\s*lý/i.test(incomingText) ||
          /^(alo|xin ch[aà]o|ch[aà]o bot|h[oỏ]i bot)/i.test(incomingText) ||
          /^\/(help|start|ping|info|stk|bank|list|event)/i.test(incomingText) ||
          /\?/.test(incomingText) ||
          /(họp lớp|họp mặt|hội ngộ|15 năm|12\/12|đăng ký|tham gia|tiền quỹ|kinh phí|đóng tiền|chuyển khoản|cách thức|giá vé|mức phí|\bstk\b|số tài khoản|tài khoản|ngân hàng|vietqr|\bqr\b|size áo|áo polo|bảng size|ai tham gia|ai đi|ai đóng|đã đóng|bao nhiêu|mấy người|sinh nhật|tìm bạn|tìm anh|tìm chị|thông tin|danh bạ|danh sách|khu vực|hà nội|tp\.?hcm|sài gòn|nước ngoài|xuất ngoại|ban liên lạc|\bbll\b|địa điểm|ở đâu|mấy giờ|khi nào|lịch trình|độc thân|\bfa\b|còn ế|kết hôn|hôn nhân|người thân|dẫn theo|đi cùng|tc10|tc11|tc12)/i.test(
            incomingText
          );

        if (isBotAddressed) {
          const aiResult = await handleAlumniAiQuery(
            incomingText,
            incomingChatId,
            botToken,
            aiApiKey
          );

          appendWebhookLog({
            event: "ai_query_replied",
            query: incomingText,
            chatId: incomingChatId,
            usedProvider: aiResult.usedProvider,
            usedModel: aiResult.usedModel,
            ok: aiResult.ok,
          });

          return NextResponse.json({
            ok: true,
            status: "ai_replied",
            provider: aiResult.usedProvider,
            model: aiResult.usedModel,
            reply: aiResult.replyText,
          });
        }

        // Tin nhắn chat thông thường trong nhóm không liên quan -> bỏ qua, KHÔNG rơi xuống luồng đăng ký!
        return NextResponse.json({
          ok: true,
          status: "ignored_unrelated_group_message",
        });
      }

      return NextResponse.json({ ok: true, status: "ignored_no_chat_id" });
    }

    // Nếu là webhook event từ Zalo nhưng không có text (sticker, ảnh, sự kiện hệ thống...) -> trả 200 OK
    if (!isWebsiteInternalCall) {
      return NextResponse.json({ ok: true, status: "ignored_non_text_webhook" });
    }

    // =========================================================================
    // 2. XỬ LÝ KHI WEBSITE GỌI ĐỂ BẮN TIN (ĐĂNG KÝ, ĐIỂM DANH, SINH NHẬT, BROADCAST)
    // =========================================================================
    const type = payload.type || "registration";

    let botMessage = "";
    let summaryTitle = "";

    // Kiểm tra công tắc Bật/Tắt tự động trong Admin (trừ khi Admin đang bấm Gửi thử isTest: true)
    if (!payload.isTest) {
      if (type === "checkin" && botConfig.autoCheckin === false) {
        return NextResponse.json({ ok: true, skipped: true, message: "Thông báo điểm danh đang tắt." });
      }
      if (type === "registration" && botConfig.autoRegistration === false) {
        return NextResponse.json({ ok: true, skipped: true, message: "Thông báo đăng ký 15 năm đang tắt." });
      }
      if ((type === "payment" || type === "sepay_payment_confirmed") && botConfig.autoPayment === false) {
        return NextResponse.json({ ok: true, skipped: true, message: "Thông báo chuyển khoản SePay đang tắt." });
      }
      if (type === "guestbook" && botConfig.autoGuestbook === false) {
        return NextResponse.json({ ok: true, skipped: true, message: "Thông báo lưu bút đang tắt." });
      }
    }

    // LUỒNG 1: ĐĂNG KÝ THAM GIA HỘI NGỘ 15 NĂM (CHỈ GỬI 1 LẦN / THÀNH VIÊN TRÁNH SPAM KHI ĐỔI SIZE ÁO)
    if (type === "registration") {
      const { fullName, className, shirtSize, guestsCount, registrationType, userId, phone, isTest } = payload;

      if (!isTest) {
        const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
        const cleanName = (fullName || "").toLowerCase().trim();
        const regKeys = [
          userId ? `user_${userId}` : null,
          cleanPhone ? `phone_${cleanPhone}` : null,
          cleanName ? `name_${cleanName}` : null,
        ].filter(Boolean) as string[];

        const existingRegNotified = await loadCloudIdList(REGISTRATIONS_NOTIFIED_PATH);
        if (regKeys.some((k) => existingRegNotified.includes(k))) {
          appendWebhookLog({
            event: "registration_skipped_duplicate",
            fullName,
            phone: cleanPhone,
            userId,
          });
          return NextResponse.json({
            ok: true,
            skipped: true,
            message: "Thành viên đã được gửi thông báo đăng ký 15 năm trước đó, bỏ qua để không gửi trùng.",
          });
        }

        await markCloudIdList(REGISTRATIONS_NOTIFIED_PATH, regKeys);
      }

      let totalCount = 1;
      try {
        const allRegs = await loadMergedRegistrations();
        if (allRegs.length > 0) totalCount = allRegs.length;
      } catch {}

      const isShirtOnly = registrationType === "shirt_only";
      summaryTitle = isShirtOnly
        ? `Đặt áo kỷ niệm 15 năm: ${fullName} (${className || "K33"})`
        : `Đăng ký 15 năm: ${fullName} (${className || "K33"})`;
      const guestsText = guestsCount > 0 ? ` (dắt theo +${guestsCount} người nhà)` : "";

      if (isShirtOnly) {
        botMessage =
          `👕 [ĐĂNG KÝ NHẬN ÁO KỶ NIỆM 15 NĂM TCDN4]\n` +
          `👤 ${fullName || "Đồng môn K33"} (${className || "TC10"}) tuy chưa thể về họp mặt trực tiếp ngày 12/12 nhưng đã đặt Áo Polo Kỷ Niệm size ${shirtSize || "L (Nam)"} gửi ship về: ${payload.address || "Địa chỉ đã đăng ký"}!\n` +
          `❤️ Dù ở phương xa vẫn luôn giữ lửa đồng môn K33 — đã có ${totalCount} thành viên đăng ký.\n` +
          `👉 Anh em điểm danh & chốt áo trước 30/11 tại: https://tcdn4.top/#event`;
      } else if (botConfig.registrationTemplate && botConfig.registrationTemplate.trim().length > 0) {
        botMessage = botConfig.registrationTemplate
          .replace(/\{ten\}/g, fullName || "Đồng môn K33")
          .replace(/\{lop\}/g, className || "TC10")
          .replace(/\{size\}/g, shirtSize || "L (Nam)")
          .replace(/\{tong_so\}/g, String(totalCount))
          .replace(/\{dia_chi\}/g, payload.address || "Tại Cơ sở B")
          .replace(/\{nguoi_nha\}/g, guestsText);
      } else {
        botMessage = `🔥 KÈO NÀY CĂNG ĐÂY ANH EM ƠI!\n` +
          `👤 ${fullName || "Đồng môn K33"} (${className || "TC10"})${guestsText} đã chính thức chốt slot họp mặt 15 năm tại Cơ sở B và rinh áo Polo size ${shirtSize || "L"}!\n` +
          `🍻 Đã có ${totalCount} anh em lên thuyền sẵn sàng cụng ly ngày 12/12.\n` +
          `👉 Ai chưa chốt thì vào lẹ kẻo hết bàn nhé: https://tcdn4.top/#event`;
      }
    }

    // LUỒNG 2: THÔNG BÁO ĐIỂM DANH MỚI (CHỈ GỬI LẦN ĐẦU TIÊN KHI ĐIỂM DANH)
    else if (type === "checkin") {
      const { fullName, className, jobTitle, company, location, userId, phone, isTest } = payload;

      if (!isTest) {
        const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
        const cleanName = (fullName || "").toLowerCase().trim();
        const keysToCheck = [
          userId ? `user_${userId}` : null,
          cleanPhone ? `phone_${cleanPhone}` : null,
          cleanName ? `name_${cleanName}` : null,
        ].filter(Boolean) as string[];

        const existingCheckins = await loadCheckins();
        const isAlreadyNotified = keysToCheck.some((k) => existingCheckins.includes(k));

        if (isAlreadyNotified) {
          appendWebhookLog({
            event: "checkin_skipped_duplicate",
            fullName,
            phone: cleanPhone,
            userId,
          });
          return NextResponse.json({
            ok: true,
            skipped: true,
            message: "Thành viên đã được gửi thông báo điểm danh trước đó, bỏ qua để không gửi lại.",
          });
        }

        // Đánh dấu đã gửi
        await markCheckedIn(keysToCheck);
      }

      summaryTitle = `Điểm danh mới: ${fullName} (${className || "K33"})`;

      const jobInfo = jobTitle ? ` đang làm ${jobTitle}${company ? ` tại ${company}` : ""}` : "";
      const locInfo = location ? ` ở ${location}` : "";

      if (botConfig.checkinTemplate && botConfig.checkinTemplate.trim().length > 0) {
        botMessage = botConfig.checkinTemplate
          .replace(/\{ten\}/g, fullName || "Một bạn")
          .replace(/\{lop\}/g, className || "TC10")
          .replace(/\{nghe_nghiep\}/g, jobInfo)
          .replace(/\{cong_ty\}/g, company || "")
          .replace(/\{khu_vuc\}/g, locInfo);
      } else {
        botMessage = `🎉 ỐI DỒI ÔI CẢ NHÀ ƠI!\n` +
          `Sau 15 năm 'mất tích', cựu sinh viên ${fullName || "Một bạn"} (${className || "TC10"})${jobInfo}${locInfo} vừa chính thức lộ diện điểm danh trên Alumni Hub!\n` +
          `👉 Anh em cùng khóa vào 'soi' hồ sơ và kết nối lại ngay nào: https://tcdn4.top/#directory`;
      }
    }

    // LUỒNG 3: CHÚC MỪNG SINH NHẬT
    else if (type === "birthday") {
      const { name, className, customWish } = payload;
      summaryTitle = `Sinh nhật: ${name} (${className || "K33"})`;

      if (customWish) {
        botMessage = customWish;
      } else if (botConfig.birthdayTemplate && botConfig.birthdayTemplate.trim().length > 0) {
        botMessage = botConfig.birthdayTemplate
          .replace(/\{ten\}/g, name || "Bạn")
          .replace(/\{lop\}/g, className || "TC10");
      } else {
        botMessage = `🎂 ALO ALO CẢ NHÀ ƠI!\n` +
          `Hôm nay là sinh nhật của bạn ${name} (${className || "TC10"})! 🎉\n` +
          `Thay mặt đại gia đình TCDN4 K33, chúc bạn tuổi mới ngày càng phong độ, tiền vào như nước Sông Sài Gòn, sự nghiệp thăng hoa và mãi giữ tinh thần trẻ khỏe thời sinh viên nhé! 🍻\n` +
          `👉 Gửi lời chúc tới ${name}: https://tcdn4.top`;
      }
    }

    // LUỒNG 4: THÔNG BÁO XÁC NHẬN CHUYỂN KHOẢN (SEPAY) — KÈM TỔNG SỐ NGƯỜI ĐÃ ĐĂNG KÝ & XÁC NHẬN
    else if (type === "payment" || type === "sepay_payment_confirmed") {
      const { fullName, className, paidAmount, shirtSize, registrationType, bankGateway, content, transactionDate, referenceCode } = payload;
      const isShirtOnlyPayment = registrationType === "shirt_only";
      summaryTitle = isShirtOnlyPayment
        ? `Chuyển khoản Áo kỷ niệm: ${fullName || "Thành viên"} (+${Number(paidAmount || 0).toLocaleString("vi-VN")} đ)`
        : `Chuyển khoản thành công: ${fullName || "Thành viên"} (+${Number(paidAmount || 0).toLocaleString("vi-VN")} đ)`;

      let totalAttending = 1;
      let totalConfirmed = 1;
      try {
        const allRegs = await loadMergedRegistrations();
        if (allRegs.length > 0) {
          totalAttending = allRegs.length;
          totalConfirmed = allRegs.filter((r) => r.status === "confirmed").length;
        }
      } catch {}

      if (botConfig.paymentTemplate && botConfig.paymentTemplate.trim().length > 0) {
        botMessage = botConfig.paymentTemplate
          .replace(/\{ten\}/g, fullName || "Thành viên K33")
          .replace(/\{lop\}/g, className || "TC4")
          .replace(/\{so_tien\}/g, Number(paidAmount || 0).toLocaleString("vi-VN"))
          .replace(/\{size\}/g, shirtSize || "L (Nam)")
          .replace(/\{ngan_hang\}/g, bankGateway || "Tài khoản lớp")
          .replace(/\{noi_dung\}/g, content || "Chuyển khoản")
          .replace(/\{thoi_gian\}/g, transactionDate || new Date().toLocaleString("vi-VN"))
          .replace(/\{ma_gd\}/g, referenceCode || "N/A")
          .replace(/\{tong_so\}/g, String(totalAttending))
          .replace(/\{da_xac_nhan\}/g, String(totalConfirmed));

        // Nếu mẫu cũ chưa có số lượng tổng đăng ký -> tự động gắn thêm dòng thống kê realtime
        if (!botConfig.paymentTemplate.includes("{tong_so}")) {
          botMessage += `\n🍻 Tiến độ hiện tại: ${totalAttending} anh em đã đăng ký (${totalConfirmed} bạn đã xác nhận chuyển khoản)!\n👉 Xem danh sách: https://tcdn4.top/#event`;
        }
      } else {
        botMessage = `🔔 [XÁC NHẬN CHUYỂN KHOẢN THÀNH CÔNG - SEPAY]\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 Thành viên: ${fullName || "Thành viên K33"} (${className || "TC4"})\n` +
          `💰 Số tiền: +${Number(paidAmount || 0).toLocaleString("vi-VN")} VNĐ\n` +
          `👕 Size áo Polo: ${shirtSize || "L (Nam)"}\n` +
          `🏦 Ngân hàng: ${bankGateway || "Tài khoản lớp"}\n` +
          `📝 Nội dung: ${content || "TCDN4 Chuyển khoản"}\n` +
          `⏰ Thời gian: ${transactionDate || new Date().toLocaleString("vi-VN")}\n` +
          `🔢 Mã GD: ${referenceCode || "N/A"}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `✨ Trạng thái: ${
            isShirtOnlyPayment
              ? "ĐÃ XÁC NHẬN ĐẶT ÁO KỶ NIỆM 15 NĂM (SHIP TẬN NƠI)!"
              : "ĐÃ XÁC NHẬN 100% THAM GIA HỘI NGỘ 15 NĂM!"
          }\n` +
          `🍻 Tiến độ hiện tại: ${totalAttending} anh em đã đăng ký (${totalConfirmed} bạn đã xác nhận chuyển khoản)!\n` +
          `🎉 Ban Liên Lạc xin trân trọng cảm ơn bạn đã hoàn tất đóng góp!`;
      }
    }

    // LUỒNG 5: LỜI NHẮN SỔ LƯU BÚT (TỪ THÀNH VIÊN KHÔNG THAM GIA TRỰC TIẾP HOẶC GỬI TRÊN SỔ LƯU BÚT)
    else if (type === "guestbook") {
      const { fullName, className, message, fromDecline, shirtSize, deliveryAddress } = payload;
      const cleanMsg = String(message || "").trim();
      const sender = fullName || "Đồng môn K33";
      const cls = className || "K33";
      const shirtLine =
        deliveryAddress && String(deliveryAddress).trim()
          ? `\n👕 Đăng ký ship áo Polo size ${shirtSize || "L (Nam)"} về: ${String(deliveryAddress).trim()}`
          : "";

      summaryTitle = `Lưu bút mới: ${sender} (${cls})`;

      if (botConfig.guestbookTemplate && botConfig.guestbookTemplate.trim().length > 0) {
        botMessage = botConfig.guestbookTemplate
          .replace(/\{ten\}/g, sender)
          .replace(/\{lop\}/g, cls)
          .replace(/\{loi_nhan\}/g, cleanMsg || "Chúc đại gia đình TCDN4 K33 hội ngộ thật vui!")
          .replace(/\{ao_ship\}/g, shirtLine);
      } else if (fromDecline) {
        botMessage =
          `💌 [LỜI NHẮN TỪ PHƯƠNG XA - SỔ LƯU BÚT TCDN4]\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 ${sender} (${cls}) rất tiếc chưa thể về dự trực tiếp ngày 12/12, nhưng gửi lời nhắn thân thương tới đại gia đình K33:\n\n` +
          `"${cleanMsg}"${shirtLine}\n\n` +
          `❤️ Dù ở xa nhưng tình đồng môn TCDN4 vẫn luôn gần kề!\n` +
          `👉 Xem & thả tim Sổ Lưu Bút tại: https://tcdn4.top/#guestbook`;
      } else {
        botMessage =
          `💌 [LƯU BÚT MỚI TCDN4 - K33 UEH]\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 ${sender} (${cls}) vừa gửi tâm tình lên Sổ Lưu Bút 15 Năm:\n\n` +
          `"${cleanMsg}"\n\n` +
          `👉 Vào đọc & gửi lời chúc cùng cả lớp tại: https://tcdn4.top/#guestbook`;
      }
    }

    // LUỒNG 6: PHÁT LOA / SOẠN TIN TỨC THÌ (BROADCAST)
    else if (type === "broadcast") {
      const { title, message } = payload;
      summaryTitle = title || "Thông báo từ Ban Liên Lạc";
      botMessage = message || "Thông báo từ Ban Liên Lạc TCDN4 K33 UEH";
    }

    // XÁC ĐỊNH DANH SÁCH NHÓM CẦN GỬI TIN
    const currentGroups: ZaloGroupConfigItem[] = Array.isArray(botConfig.groups) ? botConfig.groups : [];
    let targetChatIds: { chatId: string; groupName: string }[] = [];

    // Nếu gửi thử nghiệm trực tiếp cho 1 chat_id hoặc 1 nhóm cụ thể
    if (payload.targetChatId) {
      targetChatIds.push({ chatId: String(payload.targetChatId), groupName: payload.targetGroupName || "Nhóm chỉ định" });
    } else if (payload.targetGroupId) {
      const grp = currentGroups.find((g) => g.id === payload.targetGroupId);
      if (grp?.chatId) {
        targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
      }
    } else {
      // Tự động phân loại nhóm theo quyền nhận tin của từng nhóm
      for (const grp of currentGroups) {
        if (!grp.chatId) continue;

        if (type === "payment" || type === "sepay_payment_confirmed") {
          // Gửi tới các nhóm có bật nhận tin chuyển khoản (hoặc nhóm Ban Liên Lạc)
          if (grp.receivePayment || grp.id === "grp-bll" || (grp.verifyCode && grp.verifyCode.includes("BLL"))) {
            targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
          }
        } else if (type === "registration" && grp.receiveRegistration !== false) {
          targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
        } else if (type === "checkin" && grp.receiveCheckin !== false) {
          targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
        } else if (type === "guestbook" && (grp.receiveRegistration !== false || grp.receiveCheckin !== false)) {
          targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
        } else if (type === "birthday" && grp.receiveBirthday !== false) {
          targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
        } else if (type === "broadcast") {
          if (Array.isArray(payload.targetGroupIds) && payload.targetGroupIds.length > 0) {
            if (payload.targetGroupIds.includes(grp.id)) {
              targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
            }
          } else if (typeof payload.targetGroups === "string" && payload.targetGroups) {
            if (payload.targetGroups.includes(grp.name) || payload.targetGroups.includes(grp.id)) {
              targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
            }
          } else {
            // Mặc định gửi tới tất cả các nhóm đã kết nối
            targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
          }
        }
      }

      // Dự phòng: Nếu chưa phân loại nhưng có nhóm đã kết nối chatId -> gửi vào nhóm đã kết nối
      if (targetChatIds.length === 0) {
        for (const grp of currentGroups) {
          if (grp.chatId) {
            targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
          }
        }
      }
    }

    // THỰC HIỆN GỬI TIN QUA ZALO BOT PLATFORM TỚI CÁC NHÓM
    let sentSuccessCount = 0;
    const sendResults: any[] = [];

    if (botToken && targetChatIds.length > 0) {
      for (const item of targetChatIds) {
        const res = await sendZaloBotMessage(botToken, item.chatId, botMessage);
        sendResults.push({
          group: item.groupName,
          chatId: item.chatId,
          ok: res.ok,
          error: res.error || null,
        });
        if (res.ok) sentSuccessCount++;
      }
    }

    // Gửi kèm qua Webhook tùy chỉnh bên ngoài (nếu có và không phải gọi lại chính nó)
    let externalWebhookSent = false;
    let externalWebhookError: string | null = null;
    const customWebhook = payload.webhookUrl || botConfig.webhookUrl;

    if (customWebhook && !customWebhook.includes("/api/zalo-bot")) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (botToken) headers["Authorization"] = `Bearer ${botToken}`;

        const res = await fetch(customWebhook, {
          method: "POST",
          headers,
          body: JSON.stringify({
            type,
            title: summaryTitle,
            message: botMessage,
            data: payload,
            sentAt: new Date().toISOString(),
          }),
        });
        externalWebhookSent = res.ok;
        if (!res.ok) externalWebhookError = `Webhook trả mã ${res.status}`;
      } catch (e: any) {
        externalWebhookError = e?.message || "Lỗi gọi webhook ngoài";
      }
    }

    const overallSuccess = sentSuccessCount > 0 || externalWebhookSent;

    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess
        ? `Đã gửi thông báo thành công tới ${sentSuccessCount} nhóm Zalo!`
        : targetChatIds.length === 0
        ? "Chưa có nhóm nào kết nối Chat ID (hãy gõ /verify #MÃ vào nhóm)"
        : "Không thể gửi tin nhắn qua Zalo Bot Platform",
      type,
      title: summaryTitle,
      botMessage,
      targetChatIdsCount: targetChatIds.length,
      sentSuccessCount,
      sendResults,
      externalWebhookSent,
      externalWebhookError,
      sentAt: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      }),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi xử lý Zalo Bot" },
      { status: 500 }
    );
  }
}