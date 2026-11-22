import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadZaloBotConfig, saveZaloBotConfig, ZaloGroupConfigItem } from "@/app/api/settings/zalo/route";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");

  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Tùy chọn kiểm tra trạng thái Bot Token thực tế qua Zalo Platform
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

    const incomingText = extractIncomingText(payload);
    const incomingChatId = extractChatId(payload);

    // =========================================================================
    // 1. XỬ LÝ KHI CÓ TIN NHẮN TỪ ZALO GỬI VỀ WEBHOOK (XÁC MINH NHÓM, CÂU LỆNH)
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

      // CÂU LỆNH HỖ TRỢ / TRỢ GIÚP (/help, /start, /ping)
      if (/^\/(help|start|ping|info)/i.test(incomingText) || /^(alo|bot oi|xin chao)/i.test(incomingText)) {
        if (incomingChatId) {
          const greetingText =
            `🤖 [TCDN4 K33 Alumni Hub Bot]\n` +
            `Chào bạn! Tôi là Bot thông báo tự động của Hội cựu sinh viên Tài chính Doanh nghiệp K33 UEH.\n\n` +
            `• Để liên kết nhóm nhận tin tức: Gõ /verify #MÃ_NHÓM\n` +
            `• Website chính thức & đăng ký 15 năm: https://tcdn4.top`;
          await sendZaloBotMessage(botToken, incomingChatId, greetingText);
        }
        return NextResponse.json({ ok: true, status: "greeting_sent" });
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