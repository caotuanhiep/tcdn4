import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadZaloBotConfig, saveZaloBotConfig, ZaloGroupConfigItem } from "@/app/api/settings/zalo/route";
import { DEFAULT_BANK_INFO, normalizeBankConfig } from "@/lib/bank";
import fs from "fs";
import path from "path";

const WEBHOOK_LOGS_PATH = path.join(process.cwd(), "data", "zalo-webhook-logs.json");

// Helper ghi nhận nhật ký webhook gần nhất để debug khi cần
function appendWebhookLog(entry: any) {
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
    if (logs.length > 30) logs = logs.slice(0, 30);
    fs.writeFileSync(WEBHOOK_LOGS_PATH, JSON.stringify(logs, null, 2), "utf-8");
  } catch {}
}

// Hàm gửi tin nhắn chính thức qua Zalo Bot Platform API (Bot Elephant)
export async function sendZaloBotMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; status?: number; error?: string; responseData?: any }> {
  if (!botToken || !chatId || !text) {
    return { ok: false, error: "Thiếu botToken, chatId hoặc text" };
  }

  try {
    const url = `https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(chatId),
        text: text,
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
): Promise<{ ok: boolean; replyText?: string }> {
  const cleanQuery = rawQuery
    .replace(/@Bot\s*Elephant/gi, "")
    .replace(/@Bot/gi, "")
    .replace(/@bot\.[A-Za-z0-9]+/gi, "")
    .replace(/^bot\s*(ơi|oi)?/i, "")
    .trim();

  // 1. LẤY THÔNG TIN TÀI KHOẢN NGÂN HÀNG
  let bankInfo = DEFAULT_BANK_INFO;
  try {
    const bankConfigPath = path.join(process.cwd(), "data", "bank-config.json");
    if (fs.existsSync(bankConfigPath)) {
      bankInfo = normalizeBankConfig(JSON.parse(fs.readFileSync(bankConfigPath, "utf-8")));
    }
  } catch {}

  // 2. TRUY VẤN CƠ SỞ DỮ LIỆU SUPABASE
  let totalAttending = 0;
  let attendeeHighlights: string[] = [];
  let totalProfiles = 0;
  let searchedMembers: string[] = [];
  let searchKeyword = "";
  let birthdayMembersThisMonth: string[] = [];

  try {
    const supabase = getSupabaseAdmin();

    // Thống kê người tham gia họp mặt 15 năm
    const { count: attCount, data: attData } = await supabase
      .from("profiles")
      .select("full_name, class_name", { count: "exact" })
      .eq("attendance_status", "attending")
      .limit(15);

    if (typeof attCount === "number") totalAttending = attCount;
    if (attData && attData.length > 0) {
      attendeeHighlights = attData.map((d: any) => `${d.full_name} (${d.class_name || "K33"})`);
    }

    // Tổng số người đã tạo hồ sơ / điểm danh
    const { count: profCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if (typeof profCount === "number") totalProfiles = profCount;

    // Tìm kiếm bạn bè nếu câu hỏi có nhắc tới tên
    const searchMatch = cleanQuery.match(
      /(?:tìm\s+(?:bạn|anh|chị)?|thông\s*tin\s+(?:về|của)?|hỏi\s+về\s+(?:bạn|anh|chị)?|bạn|anh|chị)\s+([A-ZÀ-Ỹa-zà-ỹ0-9\s]{2,30})/i
    );
    let keyword = searchMatch ? searchMatch[1].trim() : "";
    keyword = keyword.replace(/^(bạn|anh|chị)\s+/i, "").trim();
    searchKeyword = keyword;

    if (
      keyword &&
      keyword.length >= 2 &&
      !["bot", "gì", "ai", "đâu", "nào", "họp lớp", "tiền", "khi nào"].includes(keyword.toLowerCase())
    ) {
      const { data: found } = await supabase
        .from("profiles")
        .select("full_name, class_name, job_title, company, location_region, attendance_status")
        .ilike("full_name", `%${keyword}%`)
        .limit(3);

      if (found && found.length > 0) {
        searchedMembers = found.map(
          (m: any) =>
            `• ${m.full_name} (${m.class_name || "K33"}): ${m.job_title || "Cựu SV"}${m.company ? ` tại ${m.company}` : ""}${m.location_region ? ` ở ${m.location_region}` : ""} - ${m.attendance_status === "attending" ? "Đã đăng ký họp mặt 15 năm 🎉" : "Chưa đăng ký"}`
        );
      }
    }

    // Tra cứu sinh nhật nếu hỏi về sinh nhật
    if (/sinh\s*nh[aậ]t/i.test(cleanQuery)) {
      const { data: bdays } = await supabase
        .from("profiles")
        .select("full_name, class_name, birthday")
        .not("birthday", "is", null)
        .limit(60);

      const currentMonth = new Date().getMonth() + 1;
      if (bdays) {
        for (const b of bdays) {
          const parts = (b.birthday || "").split("-");
          if (parts.length >= 3 && parseInt(parts[1], 10) === currentMonth) {
            birthdayMembersThisMonth.push(`${b.full_name} (${b.class_name || "K33"} - ngày ${parts[2]}/${parts[1]})`);
          }
        }
      }
    }
  } catch {}

  // 3. TỔNG HỢP NGỮ CẢNH DỮ LIỆU THỰC TẾ
  const systemContext = `
DỮ LIỆU CHÍNH XÁC VỀ HỘI KHÓA TCDN4 - K33 UEH TRÊN WEBSITE TCDN4.TOP:
1. Thông tin sự kiện Họp mặt 15 Năm:
- Sự kiện: Kỷ niệm 15 Năm Ngày Ra Trường TCDN4 K33 UEH (2011 - 2026).
- Thời gian: Thứ Bảy, ngày 12/12/2026 (Bắt đầu từ 08:30 sáng).
- Địa điểm: Giảng đường Cơ sở B, Đại học Kinh tế TP.HCM (279 Nguyễn Tri Phương, Phường 5, Quận 10, TP.HCM).
- Lịch trình chi tiết:
  + 08:30 - 09:30: Đón tiếp đồng môn, check-in nhận áo Polo K33, chụp ảnh Photobooth tại sảnh Cơ sở B.
  + 09:30 - 11:30: Lễ kỷ niệm 15 năm tại Hội trường: Phim tư liệu K33, tri ân Thầy Cô, tâm sự đồng môn.
  + 11:30 - 14:00: Đại tiệc trưa hội ngộ giao lưu, nâng ly họp mặt, văn nghệ và minigame vui nhộn.
- Bảng size áo Polo: S (dưới 55kg), M (55-65kg), L (65-72kg), XL (72-80kg), XXL (80-88kg), 3XL (trên 88kg).
- Link đăng ký tham dự và chốt size áo: https://tcdn4.top/#event

2. Thông tin Ngân hàng đóng góp kinh phí họp mặt:
- Ngân hàng: ${bankInfo.bankName}
- Số tài khoản: ${bankInfo.accountNumber}
- Chủ tài khoản: ${bankInfo.accountName}
- Cú pháp chuyển khoản: ${bankInfo.syntaxPrefix} [Họ và Tên] [Lớp] (Ví dụ: ${bankInfo.syntaxPrefix} Nguyen Van A TC10)
- Mức phí đóng góp: ${bankInfo.amountText} / người tham gia

3. Dữ liệu thực tế từ Database:
- Số lượng cựu sinh viên đã đăng ký tham gia họp mặt: ${totalAttending || 35} bạn (đã có: ${attendeeHighlights.slice(0, 6).join(", ") || "nhiều anh em TC10, TC11, TC12"}).
- Tổng số cựu sinh viên đã điểm danh trên hệ thống: ${totalProfiles || 45} bạn.
${searchedMembers.length > 0 ? `- Kết quả tra cứu đồng môn:\n${searchedMembers.join("\n")}` : ""}
${birthdayMembersThisMonth.length > 0 ? `- Sinh nhật tháng này (${new Date().getMonth() + 1}): ${birthdayMembersThisMonth.slice(0, 5).join(", ")}` : ""}
- Link tra cứu danh bạ đồng môn: https://tcdn4.top/#directory
`;

  let replyText = "";

  // 4. GỌI CLAUDE AI NẾU CÓ KHÓA API
  if (aiApiKey) {
    try {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": aiApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 600,
          system: `Bạn là Bot AI K33 của Hội cựu sinh viên Tài chính Doanh nghiệp 4, Khóa 33 (TCDN4 - K33 UEH).
Nhiệm vụ: Trả lời câu hỏi của thành viên trong nhóm Zalo một cách chính xác, thân tình, dí dỏm, hào sảng và đậm chất sinh viên UEH.
Quy tắc quan trọng:
- Sử dụng đúng thông tin trong phần DỮ LIỆU ĐƯỢC CUNG CẤP. Tuyệt đối không bịa đặt số tài khoản hay thời gian, địa điểm khác.
- Trả lời ngắn gọn từ 2 - 4 câu, định dạng dễ đọc trên màn hình điện thoại, có emoji sinh động.
- Xưng hô 'mình / bạn' hoặc 'em / anh chị', giữ tinh thần hào hứng hướng tới ngày hội ngộ 12/12.
- Luôn kèm link https://tcdn4.top/#event hoặc https://tcdn4.top/#directory khi cần thiết.`,
          messages: [
            {
              role: "user",
              content: `${systemContext}\n\nCâu hỏi của thành viên trong nhóm Zalo: "${cleanQuery}"`,
            },
          ],
        }),
      });

      const claudeData = await claudeRes.json().catch(() => null);
      if (claudeData?.content?.[0]?.text) {
        replyText = claudeData.content[0].text.trim();
      }
    } catch {}
  }

  // 5. BỘ TẠO CÂU TRẢ LỜI DỰ PHÒNG THÔNG MINH (KHI CHƯA GẮN CLAUDE HOẶC LỖI MẠNG)
  if (!replyText) {
    const qLower = cleanQuery.toLowerCase();

    // Hỏi về thời gian, địa điểm, lịch trình
    if (/ở đâu|khi nào|mấy giờ|địa điểm|thời gian|lịch trình|ngay nao|ngày nào/.test(qLower)) {
      replyText =
        `🎉 [TCDN4 K33 HUB] Lịch hẹn 15 năm diễn ra vào:\n` +
        `⏰ Thời gian: Thứ Bảy, 12/12/2026 (Bắt đầu từ 08:30 sáng)\n` +
        `📍 Địa điểm: Giảng đường Cơ sở B, ĐH Kinh tế TP.HCM (279 Nguyễn Tri Phương, Q.10)\n` +
        `🍻 Lịch trình: 08:30 đón tiếp nhận áo & chụp ảnh; 09:30 lễ kỷ niệm; 11:30 tiệc trưa cụng ly!\n` +
        `👉 Chi tiết xem tại: https://tcdn4.top/#event`;
    }
    // Hỏi về số tài khoản, kinh phí, tiền quỹ
    else if (/tài khoản|stk|tiền|kinh phí|đóng|chuyển khoản|quỹ|ngân hàng/.test(qLower)) {
      replyText =
        `💳 [THÔNG TIN ĐÓNG QUÝ HỘI KHÓA 15 NĂM]\n` +
        `• Ngân hàng: ${bankInfo.bankName}\n` +
        `• Số tài khoản: ${bankInfo.accountNumber}\n` +
        `• Chủ tài khoản: ${bankInfo.accountName}\n` +
        `• Mức phí: ${bankInfo.amountText} / người\n` +
        `• Cú pháp: ${bankInfo.syntaxPrefix} [Họ Tên] [Lớp]\n` +
        `👉 Quét mã QR thanh toán nhanh tại: https://tcdn4.top/#event`;
    }
    // Hỏi về số lượng người đăng ký
    else if (/bao nhiêu|ai tham gia|ai đi|danh sách|đăng ký rồi|ai chốt/.test(qLower)) {
      const attendeesSample = attendeeHighlights.slice(0, 5).join(", ") || "nhiều anh em TC10, TC11, TC12";
      replyText =
        `🔥 Đã có ${totalAttending || 35} đồng môn K33 chính thức chốt slot họp mặt 15 năm tại Cơ sở B!\n` +
        `🍻 Đã có: ${attendeesSample}... lên thuyền sẵn sàng.\n` +
        `👉 Ai chưa đăng ký thì vào chốt size áo ngay nhé kẻo hết bàn: https://tcdn4.top/#event`;
    }
    // Hỏi về size áo Polo
    else if (/size|áo|áo polo|chọn size/.test(qLower)) {
      replyText =
        `👕 Bảng size áo Polo kỷ niệm 15 năm TCDN4:\n` +
        `• Size S: Dưới 55kg\n• Size M: 55 - 65kg\n• Size L: 65 - 72kg\n• Size XL: 72 - 80kg\n• Size XXL: 80 - 88kg\n• Size 3XL: Trên 88kg\n` +
        `👉 Vào đăng ký và chốt size ngay tại: https://tcdn4.top/#event`;
    }
    // Kết quả tìm kiếm đồng môn
    else if (searchedMembers.length > 0) {
      replyText =
        `🔍 [KẾT QUẢ TÌM KIẾM ĐỒNG MÔN]\n` +
        `${searchedMembers.join("\n")}\n\n` +
        `👉 Xem thêm chi tiết tại danh bạ: https://tcdn4.top/#directory`;
    } else if (/tìm|thông\s*tin\s+(?:về|của)|hồ\s*sơ\s+của/i.test(qLower) && searchKeyword) {
      replyText =
        `🔍 Không tìm thấy đồng môn nào có tên "${searchKeyword}" trong danh bạ.\n` +
        `👉 Bạn có thể tra cứu toàn bộ danh bạ tại: https://tcdn4.top/#directory`;
    }
    // Hỏi về sinh nhật
    else if (/sinh\s*nh[aậ]t/.test(qLower)) {
      if (birthdayMembersThisMonth.length > 0) {
        replyText =
          `🎂 Danh sách đồng môn sinh nhật tháng ${new Date().getMonth() + 1} này:\n` +
          birthdayMembersThisMonth.map((b) => `• ${b}`).join("\n") +
          `\n👉 Cả nhà cùng gửi lời chúc mừng sinh nhật tại: https://tcdn4.top`;
      } else {
        replyText = `🎂 Tháng này chưa có bạn nào sinh nhật. Bạn có thể cập nhật ngày sinh tại: https://tcdn4.top`;
      }
    }
    // Chào hỏi chung
    else {
      replyText =
        `🤖 [TCDN4 K33 Alumni Hub Bot] Chào bạn!\n` +
        `Mình là trợ lý AI tự động của Hội cựu sinh viên TCDN4 K33 UEH.\n` +
        `Bạn có thể hỏi mình về: lịch họp lớp 12/12, số tài khoản đóng tiền quỹ, số người đã đăng ký, tra cứu size áo hoặc tìm bạn bè cùng lớp nhé! 🍻\n` +
        `👉 Website họp khóa: https://tcdn4.top/#event`;
    }
  }

  // Gửi tin nhắn trả lời qua Zalo Bot Platform API
  const sendRes = await sendZaloBotMessage(botToken, chatId, replyText);
  return { ok: sendRes.ok, replyText };
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

    // =========================================================================
    // 1. XỬ LÝ KHI CÓ TIN NHẮN TỪ ZALO GỬI VỀ WEBHOOK (XÁC MINH NHÓM, CÂU HỎI AI)
    // =========================================================================
    if (incomingText) {
      const isVerify =
        /verify/i.test(incomingText) ||
        /xác\s*nhận/i.test(incomingText) ||
        /kết\s*nối/i.test(incomingText) ||
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
            `👉 *${matchedGroup.name}*\n` +
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

      // TRẢ LỜI CÂU HỎI TRỰC TIẾP TỪ THÀNH VIÊN (TRỢ LÝ AI HỎI ĐÁP)
      if (incomingChatId) {
        const isBotAddressed =
          /@Bot/i.test(incomingText) ||
          /bot\s*(ơi|oi|ai|elephant)/i.test(incomingText) ||
          /^(alo|xin chao|chao bot|hoi bot)/i.test(incomingText) ||
          /^\/(help|start|ping|info)/i.test(incomingText) ||
          /(họp lớp|15 năm|12\/12|đăng ký|tiền quỹ|kinh phí|stk|số tài khoản|ngân hàng|size áo|áo polo|ai tham gia|ai đi|sinh nhật|tìm bạn|tìm anh|tìm chị|danh bạ)/i.test(incomingText);

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
            aiResult,
          });

          return NextResponse.json({
            ok: true,
            status: "ai_replied",
            reply: aiResult.replyText,
          });
        }
      }
    }

    // =========================================================================
    // 2. XỬ LÝ KHI WEBSITE GỌI ĐỂ BẮN TIN (ĐĂNG KÝ, ĐIỂM DANH, SINH NHẬT, BROADCAST)
    // =========================================================================
    const type = payload.type || "registration";

    let botMessage = "";
    let summaryTitle = "";

    // LUỒNG 1: ĐĂNG KÝ THAM GIA HỘI NGỘ 15 NĂM
    if (type === "registration") {
      const { fullName, className, shirtSize, guestsCount } = payload;

      let totalCount = 35;
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { count } = await supabaseAdmin
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("attendance_status", "attending");

        if (count && count > 0) {
          totalCount = count;
        }
      } catch {}

      summaryTitle = `Đăng ký 15 năm: ${fullName} (${className || "K33"})`;
      const guestsText = guestsCount > 0 ? ` (dắt theo +${guestsCount} người nhà)` : "";

      botMessage = `🔥 KÈO NÀY CĂNG ĐÂY ANH EM ƠI!\n` +
        `👤 ${fullName || "Đồng môn K33"} (${className || "TC10"})${guestsText} đã chính thức chốt slot họp mặt 15 năm tại Cơ sở B và rinh áo Polo size ${shirtSize || "L"}!\n` +
        `🍻 Đã có ${totalCount} anh em lên thuyền sẵn sàng cụng ly ngày 12/12.\n` +
        `👉 Ai chưa chốt thì vào lẹ kẻo hết bàn nhé: https://tcdn4.top/#event`;
    }

    // LUỒNG 2: THÔNG BÁO ĐIỂM DANH MỚI
    else if (type === "checkin") {
      const { fullName, className, jobTitle, company, location } = payload;
      summaryTitle = `Điểm danh mới: ${fullName} (${className || "K33"})`;

      const jobInfo = jobTitle ? ` đang làm ${jobTitle}${company ? ` tại ${company}` : ""}` : "";
      const locInfo = location ? ` ở ${location}` : "";

      botMessage = `🎉 ỐI DỒI ÔI CẢ NHÀ ƠI!\n` +
        `Sau 15 năm 'mất tích', cựu sinh viên ${fullName || "Một bạn"} (${className || "TC10"})${jobInfo}${locInfo} vừa chính thức lộ diện điểm danh trên Alumni Hub!\n` +
        `👉 Anh em cùng khóa vào 'soi' hồ sơ và kết nối lại ngay nào: https://tcdn4.top/#directory`;
    }

    // LUỒNG 3: CHÚC MỪNG SINH NHẬT
    else if (type === "birthday") {
      const { name, className, customWish } = payload;
      summaryTitle = `Sinh nhật: ${name} (${className || "K33"})`;

      if (customWish) {
        botMessage = customWish;
      } else {
        botMessage = `🎂 ALO ALO CẢ NHÀ ƠI!\n` +
          `Hôm nay là sinh nhật của bạn ${name} (${className || "TC10"})! 🎉\n` +
          `Thay mặt đại gia đình TCDN4 K33, chúc bạn tuổi mới ngày càng phong độ, tiền vào như nước Sông Sài Gòn, sự nghiệp thăng hoa và mãi giữ tinh thần trẻ khỏe thời sinh viên nhé! 🍻\n` +
          `👉 Gửi lời chúc tới ${name}: https://tcdn4.top`;
      }
    }

    // LUỒNG 4: PHÁT LOA / SOẠN TIN TỨC THÌ (BROADCAST)
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

        if (type === "registration" && grp.receiveRegistration !== false) {
          targetChatIds.push({ chatId: grp.chatId, groupName: grp.name });
        } else if (type === "checkin" && grp.receiveCheckin !== false) {
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