import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadZaloBotConfig, saveZaloBotConfig, ZaloGroupConfigItem } from "@/app/api/settings/zalo/route";
import { DEFAULT_BANK_INFO, normalizeBankConfig } from "@/lib/bank";
import { getAlumniDatabaseContext } from "@/lib/ai-database-context";
import fs from "fs";
import path from "path";

const WEBHOOK_LOGS_PATH = path.join(process.cwd(), "data", "zalo-webhook-logs.json");
const CHECKINS_PATH = "settings/zalo-checkins.json";
const LOCAL_CHECKINS_PATH = path.join(process.cwd(), "data", "zalo-checkins.json");

// Đọc danh sách định danh các thành viên đã gửi thông báo điểm danh Zalo
async function loadCheckins(): Promise<string[]> {
  try {
    if (fs.existsSync(LOCAL_CHECKINS_PATH)) {
      const data = JSON.parse(fs.readFileSync(LOCAL_CHECKINS_PATH, "utf-8"));
      if (Array.isArray(data)) return data;
    }
  } catch {}

  try {
    const supabase = getSupabaseAdmin();
    const { data: pub } = supabase.storage.from("alumni-media").getPublicUrl(CHECKINS_PATH);
    if (pub?.publicUrl) {
      const res = await fetch(`${pub.publicUrl}?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const parsed = JSON.parse(await res.text());
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}

  return [];
}

// Lưu định danh thành viên đã điểm danh để không bao giờ gửi lại lần 2
async function markCheckedIn(identifiers: string[]): Promise<void> {
  const list = await loadCheckins();
  let changed = false;
  for (const id of identifiers) {
    if (id && !list.includes(id)) {
      list.push(id);
      changed = true;
    }
  }
  if (!changed) return;

  try {
    const dir = path.dirname(LOCAL_CHECKINS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_CHECKINS_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch {}

  try {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from("alumni-media").upload(
      CHECKINS_PATH,
      Buffer.from(JSON.stringify(list, null, 2), "utf-8"),
      { contentType: "application/json", upsert: true }
    );
  } catch {}
}

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

  // 2. TRUY VẤN CƠ SỞ DỮ LIỆU TỔNG HỢP VÀ DỮ LIỆU THỰC TẾ
  const botConfig = await loadZaloBotConfig();
  const dbSummary = await getAlumniDatabaseContext(cleanQuery);
  const systemContext = dbSummary.rawTextContext;
  const selectedModel = botConfig.aiModel || "claude-3-5-sonnet-20241022";
  const activeKey = aiApiKey || botConfig.aiApiKey;

  let replyText = "";

  // 3. GỌI CLAUDE AI HOẶC GEMINI NẾU CÓ KHÓA API
  if (activeKey) {
    if (selectedModel.startsWith("claude") || activeKey.startsWith("sk-ant") || activeKey.startsWith("sk-")) {
      try {
        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": activeKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: selectedModel,
            max_tokens: 800,
            system: `Bạn là Bot AI K33 của Hội cựu sinh viên Tài chính Doanh nghiệp 4, Khóa 33 (TCDN4 - K33 UEH).
Nhiệm vụ: Trả lời câu hỏi của thành viên trong nhóm Zalo một cách chính xác, thân tình, dí dỏm, hào sảng và đậm chất sinh viên UEH.
Quy tắc quan trọng:
- Sử dụng đúng thông tin trong phần DỮ LIỆU THỰC TẾ ĐƯỢC CUNG CẤP (Danh sách người tham gia, khu vực TP.HCM, Hà Nội, tỉnh khác, nước ngoài, size áo, ngân hàng...). Tuyệt đối không bịa đặt số tài khoản hay ngày giờ khác.
- Khi được hỏi về khu vực sinh sống (Có những ai ở Hà Nội, TP.HCM, Tỉnh khác, Nước ngoài/Xuất ngoại...), hãy liệt kê chi tiết các bạn ở khu vực đó một cách vui vẻ.
- Khi được hỏi về số lượng người tham gia, hãy báo chính xác số lượng đã xác nhận và một số bạn tiêu biểu.
- Khi được hỏi về thông tin ai đó, hãy tra cứu đối chiếu trong danh sách thành viên để phản hồi đúng lớp, công ty, nghề nghiệp và tình trạng tham gia.
- Trả lời ngắn gọn từ 2 - 5 câu, định dạng dễ đọc trên màn hình điện thoại, có emoji sinh động.
- Xưng hô 'mình / bạn' hoặc 'em / anh chị', giữ tinh thần hào hứng hướng tới ngày hội ngộ 12/12.
- Luôn kèm link https://tcdn4.top/#event hoặc https://tcdn4.top/#directory khi phù hợp.`,
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
    } else if (selectedModel.startsWith("gemini") || activeKey.startsWith("AIza")) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemContext}\n\nCâu hỏi: "${cleanQuery}"` }] }],
            }),
          }
        );
        if (geminiRes.ok) {
          const gemData = await geminiRes.json();
          const text = gemData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) replyText = text.trim();
        }
      } catch {}
    }
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
      const attendeesSample = dbSummary.attendingNames.slice(0, 8).join(", ") || "nhiều anh em TC10, TC11, TC12";
      replyText =
        `🔥 Đã có ${dbSummary.totalAttending || 35} đồng môn K33 chính thức chốt slot họp mặt 15 năm tại Cơ sở B!\n` +
        `🍻 Đã có: ${attendeesSample}... lên thuyền sẵn sàng.\n` +
        `👉 Ai chưa đăng ký thì vào chốt size áo ngay nhé kẻo hết bàn: https://tcdn4.top/#event`;
    }
    // Hỏi về khu vực sinh sống (Hà Nội, TP.HCM, nước ngoài, tỉnh khác)
    else if (/hà nội|hn|hcm|sài gòn|khu vực|ở đâu|nước ngoài|ngoại|tỉnh/.test(qLower)) {
      if (/hà nội|hn/.test(qLower)) {
        replyText = dbSummary.hnMembers.length > 0
          ? `📍 Đồng môn K33 tại Hà Nội hiện có: ${dbSummary.hnMembers.join(", ")} 🗼!\n👉 Kết nối tại: https://tcdn4.top/#directory`
          : `📍 Hiện tại chưa có bạn nào cập nhật sinh sống ở Hà Nội. Cả nhà nhắc anh em vào tcdn4.top điểm danh nhé!`;
      } else if (/nước ngoài|ngoại/.test(qLower)) {
        replyText = dbSummary.overseasMembers.length > 0
          ? `✈️ Đồng môn đang ở Nước ngoài: ${dbSummary.overseasMembers.join(", ")}!\n👉 Kết nối tại: https://tcdn4.top/#directory`
          : `✈️ Hiện chưa có bạn nào lưu hồ sơ ở Nước ngoài.`;
      } else {
        replyText = `📍 Thống kê đồng môn theo khu vực:\n• TP.HCM: ${dbSummary.hcmMembers.length} bạn (${dbSummary.hcmMembers.slice(0, 10).join(", ")}...)\n• Hà Nội: ${dbSummary.hnMembers.length} bạn\n• Nước ngoài: ${dbSummary.overseasMembers.length} bạn\n• Tỉnh khác: ${dbSummary.otherMembers.length} bạn\n👉 Chi tiết danh bạ: https://tcdn4.top/#directory`;
      }
    }
    // Hỏi về size áo Polo
    else if (/size|áo|áo polo|chọn size/.test(qLower)) {
      replyText =
        `👕 Bảng size áo Polo kỷ niệm 15 năm TCDN4:\n` +
        `• Size S: Dưới 55kg\n• Size M: 55 - 65kg\n• Size L: 65 - 72kg\n• Size XL: 72 - 80kg\n• Size XXL: 80 - 88kg\n• Size 3XL: Trên 88kg\n` +
        `👉 Vào đăng ký và chốt size ngay tại: https://tcdn4.top/#event`;
    }
    // Hỏi về sinh nhật
    else if (/sinh\s*nh[aậ]t/.test(qLower)) {
      if (dbSummary.birthdayMembersThisMonth.length > 0) {
        replyText =
          `🎂 Danh sách đồng môn sinh nhật tháng ${new Date().getMonth() + 1} này:\n` +
          dbSummary.birthdayMembersThisMonth.map((b: string) => `• ${b}`).join("\n") +
          `\n👉 Cả nhà cùng gửi lời chúc mừng sinh nhật tại: https://tcdn4.top`;
      } else {
        replyText = `🎂 Tháng này chưa có bạn nào sinh nhật. Bạn có thể cập nhật ngày sinh tại: https://tcdn4.top`;
      }
    }
    // Chào hỏi chung hoặc câu hỏi khác
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

      if (botConfig.registrationTemplate && botConfig.registrationTemplate.trim().length > 0) {
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
      const { fullName, className, jobTitle, company, location, userId, phone } = payload;
      
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

    // LUỒNG 4: THÔNG BÁO XÁC NHẬN CHUYỂN KHOẢN (SEPAY)
    else if (type === "payment" || type === "sepay_payment_confirmed") {
      const { fullName, className, paidAmount, shirtSize, bankGateway, content, transactionDate, referenceCode } = payload;
      summaryTitle = `Chuyển khoản thành công: ${fullName || "Thành viên"} (+${Number(paidAmount || 0).toLocaleString("vi-VN")} đ)`;

      if (botConfig.paymentTemplate && botConfig.paymentTemplate.trim().length > 0) {
        botMessage = botConfig.paymentTemplate
          .replace(/\{ten\}/g, fullName || "Thành viên K33")
          .replace(/\{lop\}/g, className || "TC4")
          .replace(/\{so_tien\}/g, Number(paidAmount || 0).toLocaleString("vi-VN"))
          .replace(/\{size\}/g, shirtSize || "L (Nam)")
          .replace(/\{ngan_hang\}/g, bankGateway || "Tài khoản lớp")
          .replace(/\{noi_dung\}/g, content || "Chuyển khoản")
          .replace(/\{thoi_gian\}/g, transactionDate || new Date().toLocaleString("vi-VN"))
          .replace(/\{ma_gd\}/g, referenceCode || "N/A");
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
          `✨ Trạng thái: ĐÃ XÁC NHẬN 100% THAM GIA HỘI NGỘ 15 NĂM!\n` +
          `🎉 Ban Liên Lạc xin trân trọng cảm ơn bạn đã hoàn tất đóng góp!`;
      }
    }

    // LUỒNG 5: PHÁT LOA / SOẠN TIN TỨC THÌ (BROADCAST)
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