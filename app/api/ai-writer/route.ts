import { NextRequest, NextResponse } from "next/server";
import { loadZaloBotConfig } from "@/app/api/settings/zalo/route";
import { getAlumniDatabaseContext } from "@/lib/ai-database-context";
import { formatPlainTextForZalo } from "@/lib/zalo-format";

interface AiWriterRequest {
  topic?: string;
  tone?: "funny" | "warm" | "urgent" | "formal" | "birthday" | "checkin" | "registration" | "payment" | "chat";
  memberName?: string;
  className?: string;
  details?: string;
  apiKey?: string;
  model?: string;
}

// Bộ máy sinh nội dung thông minh đặc thù cho Cựu sinh viên TCDN4 - K33 UEH
const SYNTHESIZERS: Record<string, (topic: string, name?: string, cls?: string) => string[]> = {
  funny: (topic, name, cls) => [
    `🔥 ALO ALO CẢ NHÀ ƠI! KÈO NÀY KHÔNG ĐI LÀ TIẾC CẢ THANH XUÂN!\n${topic || "15 năm ra trường, ai rồi cũng phải gác deadline lại để hội ngộ thôi!"}\n🍻 Thanh xuân có một lần, 15 năm mới có một ngày trở lại Giảng đường Cơ sở B (279 Nguyễn Tri Phương).\n👕 Áo Polo kỷ niệm chuẩn form xịn sò đã sẵn sàng, vào chốt size lẹ kẻo mặc nhầm size XXL của bạn bên cạnh nha 😂\n👉 Đăng ký và chốt size áo ngay: https://tcdn4.top/#event`,
    `📢 THÔNG BÁO KHẨN TỪ BAN TỔ CHỨC TCDN4 K33!\n${topic || "Cảnh báo: Tinh thần đồng môn đang nóng lên từng ngày!"}\nSau 15 năm bươn chải giữa dòng đời, Thứ 7 ngày 12/12 này mình cùng 'reset' về thời sinh viên vô tư lự, nâng ly ôn lại thời cày đề thi tài chính doanh nghiệp nhé 🍻\n👉 Ai chưa đăng ký thì bấm vào đây giữ slot: https://tcdn4.top/#event`,
    `⚡ ĐỪNG ĐỂ DEADLINE ĐÈ BẸP THANH XUÂN CỦA BẠN!\n${topic || "Công việc thì làm cả đời, họp mặt 15 năm TCDN4 chỉ có duy nhất một lần!"}\nĐồng môn khắp nơi đã và đang tề tựu về TP.HCM ngày 12/12. Đã có rất nhiều anh em đăng ký và nhận áo, bạn còn chần chừ gì nữa?\n👉 Đăng ký tham gia ngay: https://tcdn4.top/#event`
  ],
  warm: (topic, name, cls) => [
    `❤️ KÍNH GỬI ĐẠI GIA ĐÌNH TCDN4 - K33 UEH!\n${topic || "15 năm - một chặng đường dài với biết bao thăng trầm và đổi thay."}\nNhưng dù ở đâu, làm gì, khi nhắc về TCDN4, chúng ta vẫn là những cô cậu sinh viên năm nào dưới bóng cây Cơ sở B. Hãy dành cho nhau một ngày trọn vẹn để hội ngộ, tay bắt mặt mừng và sẻ chia chặng đường đã qua.\n⏰ Thời gian: 08:30 Thứ 7, ngày 12/12/2026 tại Cơ sở B - UEH.\n👉 Cùng xác nhận tham dự và kết nối lại: https://tcdn4.top/#event`,
    `🌸 THANH XUÂN NĂM ẤY CHÚNG TA CÙNG NHAU...\n${topic || "Có những kỷ niệm dù thời gian trôi qua vẫn vẹn nguyên như ngày đầu."}\n15 năm ngày ra trường, một dấu mốc đáng nhớ để chúng ta cùng nhìn lại chặng đường phấn đấu và gắn kết bền chặt hơn nữa tình đồng môn TCDN4.\n👉 Hãy cùng lưu lại kỷ niệm tại: https://tcdn4.top`
  ],
  urgent: (topic, name, cls) => [
    `🚨 ĐẾM NGƯỢC CHỐT SỔ! CHỈ CÒN VÀI NGÀY NỮA THÔI!\n${topic || "Ban liên lạc chuẩn bị chốt danh sách may áo và đặt tiệc trưa!"}\nĐể Ban tổ chức chuẩn bị chu đáo nhất, may áo đúng size cho từng người và sắp xếp chỗ ngồi ấm cúng, anh chị em vui lòng hoàn tất xác nhận trước thời hạn nhé.\n👉 Bấm vào chốt ngay kẻo trễ: https://tcdn4.top/#event`,
    `⚠️ ALO GẤP! ANH CHỊ EM CHƯA CHỌN SIZE ÁO VÀO CHỐT NGAY NHA!\n${topic || "Xưởng may áo Polo kỷ niệm 15 năm TCDN4 sắp khóa danh sách đặt dệt."}\nNếu bạn chưa chọn size áo, hãy dành 30 giây vào xác nhận để áo được chuyển phát về tận nhà trước ngày đại lễ nhé!\n👉 Vào chọn size áo: https://tcdn4.top/#event`
  ],
  formal: (topic, name, cls) => [
    `📢 THÔNG BÁO TỪ BAN LIÊN LẠC TCDN4 - K33 UEH\n━━━━━━━━━━━━━━━━━━━━\nKính gửi: Toàn thể anh chị em Cựu sinh viên TCDN4,\n${topic || "Ban liên lạc trân trọng thông báo về Chương trình Đại Hội Ngộ 15 Năm Ngày Ra Trường (2011 - 2026)."}\n📍 Địa điểm: Cơ sở B - Đại học Kinh tế TP.HCM (279 Nguyễn Tri Phương, Q.10)\n⏰ Thời gian: 08:30 sáng Thứ 7, ngày 12/12/2026.\nTrân trọng kính mời toàn thể anh chị em và gia đình về tham dự đông đủ.\n👉 Chi tiết chương trình: https://tcdn4.top/#event`,
  ],
  birthday: (topic, name, cls) => [
    `🎂 ALO ALO CẢ NHÀ ƠI! HÔM NAY LÀ SINH NHẬT ĐỒNG MÔN! 🎉\nThay mặt đại gia đình TCDN4 - K33 UEH, thân chúc bạn ${name || "đồng môn"}${cls ? ` (${cls})` : ""} một ngày sinh nhật thật ấm áp và ngập tràn niềm vui! 🥂\nChúc bạn tuổi mới sức khỏe dồi dào, sự nghiệp thăng hoa, tiền tài rủng rỉnh và luôn giữ nụ cười rạng rỡ của thời sinh viên nhé! 💖\n👉 Cả nhà cùng vào gửi lời chúc tới ${name || "bạn ấy"} nha: https://tcdn4.top`,
    `🎉 CHÚC MỪNG SINH NHẬT ${name ? name.toUpperCase() : "ĐỒNG MÔN"} (${cls || "K33 UEH"})! 🎂\nTuổi mới chúc bạn: Công việc hanh thông, tài lộc dồi dào, gia đình viên mãn và đặc biệt là không quên lịch hẹn 15 năm ngày 12/12 tại Cơ sở B nhé! 🍻\n👉 Kết nối đồng môn tại: https://tcdn4.top`
  ],
  checkin: (topic, name, cls) => [
    `🎉 ỐI DỒI ÔI CẢ NHÀ ƠI!\nSau 15 năm 'mất tích', cựu sinh viên ${name || "Một bạn"}${cls ? ` (${cls})` : ""} vừa chính thức lộ diện điểm danh trên Alumni Hub!\n${topic ? `Thông tin: ${topic}\n` : ""}👉 Anh em cùng khóa vào 'soi' hồ sơ và kết nối lại ngay nào: https://tcdn4.top/#directory`,
  ],
  registration: (topic, name, cls) => [
    `🔥 KÈO NÀY CĂNG ĐÂY ANH EM ƠI!\n${name || "Một bạn"}${cls ? ` (${cls})` : ""} đã chính thức chốt slot họp mặt 15 năm tại Cơ sở B và rinh áo Polo kỷ niệm!\n${topic ? `${topic}\n` : ""}🍻 Danh sách anh em lên thuyền sẵn sàng cụng ly ngày 12/12 đang tăng lên từng giờ.\n👉 Ai chưa chốt thì vào lẹ kẻo hết bàn nhé: https://tcdn4.top/#event`,
  ],
  payment: (topic, name, cls) => [
    `🔔 [XÁC NHẬN CHUYỂN KHOẢN THÀNH CÔNG - SEPAY]\n━━━━━━━━━━━━━━━━━━━━\n👤 Thành viên: ${name || "{ten}"} (${cls || "{lop}"})\n💰 Số tiền: +{so_tien} VNĐ\n👕 Size áo: {size}\n🏦 Ngân hàng: {ngan_hang}\n📝 Nội dung: {noi_dung}\n⏰ Thời gian: {thoi_gian}\n🔢 Mã GD: {ma_gd}\n━━━━━━━━━━━━━━━━━━━━\n✨ Trạng thái: ĐÃ XÁC NHẬN 100% THAM GIA HỘI NGỘ 15 NĂM!\n🎉 Ban Liên Lạc xin trân trọng cảm ơn bạn đã hoàn tất đóng góp!`,
    `💰 TING TING! SEPAY XÁC NHẬN KHOẢN ĐÓNG GÓP HỘI NGỘ 15 NĂM\n━━━━━━━━━━━━━━━━━━━━\n👤 Người chuyển: ${name || "{ten}"} (${cls || "{lop}"})\n💵 Số tiền: +{so_tien} VNĐ\n👕 Size áo: {size}\n🏦 Nhận qua: {ngan_hang}\n📌 Mã giao dịch: {ma_gd}\n⏰ Lúc: {thoi_gian}\n━━━━━━━━━━━━━━━━━━━━\n👏 BLL đã ghi nhận vị trí của bạn trong danh sách hội ngộ ngày 12/12!`
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body: AiWriterRequest = await req.json();
    const { topic = "", tone = "funny", memberName, className, details, apiKey, model: requestedModel } = body;

    // Lấy cấu hình đã lưu
    const savedConfig = await loadZaloBotConfig();
    const activeKey =
      apiKey ||
      savedConfig.aiApiKey ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.CLAUDE_API_KEY ||
      process.env.GEMINI_API_KEY;

    // Chọn model AI phù hợp (ưu tiên các model Claude đang hoạt động thực tế)
    const targetModel = requestedModel || savedConfig.aiModel || "claude-sonnet-4-6";

    // 1. Trích xuất ngữ cảnh thời gian thực từ cơ sở dữ liệu Supabase
    const dbContext = await getAlumniDatabaseContext(topic || memberName || "");

    const systemPrompt = `Bạn là Trợ lý AI thông minh, dí dỏm và hào sảng của Ban Liên Lạc Cựu sinh viên TCDN4 - Khóa 33 (K33) Đại học Kinh tế TP.HCM (UEH) - niên khóa 2007 - 2011.
Bạn có quyền truy cập trực tiếp vào Cơ sở dữ liệu thời gian thực của website tcdn4.top:
${dbContext.rawTextContext}

Quy tắc trả lời:
- Nếu người dùng hỏi các câu hỏi ngoài database (làm thơ, khích lệ anh em, tư vấn quán ăn/nhậu, kiến thức tài chính, đời sống, trò chuyện vui...): trả lời sáng tạo, tự nhiên, đúng trọng tâm bằng đầy đủ trí tuệ của bạn.
- Khi người dùng hỏi về dữ liệu lớp (ai ở khu vực nào, bao nhiêu người đăng ký/người thân đi cùng/đóng tiền, ai đang độc thân/tình trạng hôn nhân, STK ngân hàng, lịch họp 12/12, sinh nhật, tìm bạn...): lấy số liệu chính xác 100% từ cơ sở dữ liệu trên, tuyệt đối không bịa đặt.
- ĐỊNH DẠNG ZALO (BẮT BUỘC): TUYỆT ĐỐI KHÔNG dùng Markdown (không dùng **in đậm**, *in nghiêng*, ### tiêu đề, dấu backtick hay [text](url)) vì Zalo không render Markdown sẽ hiện nguyên ký tự ** rất xấu. Chỉ dùng văn bản thuần (plain text), xuống dòng gọn gàng, gạch đầu dòng bằng dấu "• " và emoji phù hợp. Link web tham khảo khi cần: https://tcdn4.top/#event hoặc https://tcdn4.top/#directory.`;

    let userPrompt = "";
    if (tone === "chat") {
      userPrompt = topic || "Xin chào Trợ lý AI K33!";
    } else {
      userPrompt = `Viết một mẩu tin nhắn gửi vào nhóm Zalo lớp/khóa:
- Chủ đề/Ý tưởng: "${topic || "Họp mặt 15 năm TCDN4 K33 UEH"}"
- Phong cách: ${
        tone === "funny"
          ? "Hài hước, dí dỏm, đậm chất sinh viên UEH"
          : tone === "warm"
          ? "Ấm áp, xúc động, hoài niệm 15 năm thanh xuân"
          : tone === "urgent"
          ? "Giục giã, hào hứng, chốt sổ gấp"
          : tone === "birthday"
          ? "Chúc mừng sinh nhật thân tình, hài hước, tuổi 36-37"
          : "Trang trọng, thông báo chính thức BLL"
      }
${memberName ? `- Tên thành viên: ${memberName}` : ""}
${className ? `- Lớp: ${className}` : ""}
${details ? `- Chi tiết thêm: ${details}` : ""}
Chỉ trả về nội dung tin nhắn hoàn chỉnh, không thêm lời dẫn giải thích.`;
    }

    if (activeKey) {
      // 1. NẾU LÀ KHÓA CLAUDE HOẶC YÊU CẦU MODEL CLAUDE
      const isClaude =
        activeKey.startsWith("sk-ant") ||
        (!activeKey.startsWith("AIza") && activeKey.startsWith("sk-")) ||
        targetModel.includes("claude");

      if (isClaude && !targetModel.includes("gemini")) {
        const candidateModels = [
          targetModel,
          "claude-sonnet-4-6",
          "claude-sonnet-5-5",
          "claude-haiku-4-5-20251001",
          "claude-sonnet-4-5-20250929",
          "claude-haiku-5-5",
        ].filter((v, i, a) => v && v.startsWith("claude") && a.indexOf(v) === i);

        for (const m of candidateModels) {
          try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": activeKey,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: m,
                max_tokens: 1024,
                system: systemPrompt,
                messages: [{ role: "user", content: userPrompt }],
              }),
            });

            if (res.ok) {
              const data = await res.json();
              const generated = data?.content?.[0]?.text;
              if (generated && generated.trim().length > 5) {
                return NextResponse.json({
                  success: true,
                  content: formatPlainTextForZalo(generated),
                  provider: "claude",
                  model: m,
                });
              }
            }
          } catch (e) {
            console.warn(`Claude model ${m} call failed:`, e);
          }
        }
      }

      // 2. NẾU LÀ KHÓA GEMINI HOẶC YÊU CẦU GEMINI
      if (activeKey.startsWith("AIza") || targetModel.includes("gemini") || !isClaude) {
        try {
          const geminiModel = targetModel.includes("gemini") ? targetModel : "gemini-1.5-flash";
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${activeKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `${systemPrompt}\n\nNgười dùng hỏi/yêu cầu: ${userPrompt}`,
                      },
                    ],
                  },
                ],
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (generated && generated.trim().length > 5) {
              return NextResponse.json({
                success: true,
                content: formatPlainTextForZalo(generated),
                provider: "gemini",
                model: geminiModel,
              });
            }
          }
        } catch (e) {
          console.warn("Gemini API call failed:", e);
        }
      }
    }

    // 3. Fallback thông minh: Sử dụng dữ liệu database & cấu hình thực tế K33
    if (tone === "chat") {
      const qLower = topic.toLowerCase();
      let answer = "";
      if (/(bao nhiêu\s*(người|bạn|slot|thành viên)|mấy\s*(người|bạn)|ai\s*(đã\s*)?(tham gia|đi|đăng ký|chốt|đóng tiền|chuyển khoản)|danh sách\s*(tham gia|đăng ký|đóng tiền|chuyển khoản)|đăng ký rồi|đã đóng tiền|đã chuyển khoản)/.test(qLower)) {
        answer = `📊 Hiện tại trên hệ thống tcdn4.top đã có ${dbContext.totalAttending} thành viên đăng ký tham dự Hội ngộ 15 Năm (${dbContext.totalConfirmed} bạn đã chuyển khoản xác nhận • ${dbContext.totalPending} bạn chờ CK • Tổng quỹ: ${dbContext.totalCollectedAmount.toLocaleString("vi-VN")} VNĐ) trên tổng số ${dbContext.totalProfiles} thành viên đã điểm danh.\nDanh sách: ${dbContext.attendingNames.slice(0, 10).join(", ")}${dbContext.attendingNames.length > 10 ? ` và ${dbContext.attendingNames.length - 10} bạn khác` : ""} 🎉!`;
      } else if (/số tài khoản|tài khoản|\bstk\b|chuyển khoản|cách thức|kinh phí|đóng quỹ|tiền quỹ|ngân hàng|vietqr|\bqr\b|giá vé|mức phí|cú pháp/.test(qLower)) {
        const b = dbContext.bankInfo;
        answer = `💳 Thông tin chuyển khoản Hội ngộ 15 Năm TCDN4:\n• Ngân hàng: ${b.bankName}\n• Số tài khoản: ${b.accountNumber}\n• Chủ tài khoản: ${b.accountName}\n• Mức phí: ${b.amountText} / người\n• Cú pháp: ${b.syntaxPrefix} [Họ và Tên] [SĐT]\n👉 Đăng ký & quét mã VietQR tự động đối soát SePay tại: https://tcdn4.top/#event`;
      } else if (qLower.includes("hà nội") || qLower.includes("hn")) {
        answer = dbContext.hnMembers.length > 0
          ? `📍 Đồng môn K33 tại Hà Nội hiện có: ${dbContext.hnMembers.join(", ")} 🗼!`
          : `📍 Hiện tại trong hệ thống chưa có bạn nào cập nhật sinh sống ở Hà Nội. Cả nhà nhắc anh em vào tcdn4.top điểm danh nhé!`;
      } else if (qLower.includes("hồ chí minh") || qLower.includes("hcm") || qLower.includes("sài gòn")) {
        answer = `📍 Khu vực TP.HCM đang là đông nhất với ${dbContext.hcmMembers.length} cựu sinh viên: ${dbContext.hcmMembers.slice(0, 15).join(", ")}... 🥂`;
      } else if (qLower.includes("nước ngoài") || qLower.includes("ngoại")) {
        answer = dbContext.overseasMembers.length > 0
          ? `✈️ Đồng môn đang ở Nước ngoài: ${dbContext.overseasMembers.join(", ")}!`
          : `✈️ Hiện chưa có bạn nào lưu hồ sơ ở Nước ngoài.`;
      } else if (/độc thân|\bfa\b|còn ế|chưa kết hôn|chưa lập gia đình|hội độc thân|tình trạng hôn nhân/.test(qLower)) {
        answer =
          dbContext.singleMembers.length > 0
            ? `💘 Hội độc thân vui tính TCDN4 hiện có ${dbContext.singleMembers.length} bạn:\n${dbContext.singleMembers.map((s) => `• ${s}`).join("\n")}\n👉 Xem danh bạ tại: https://tcdn4.top/#directory`
            : `💘 Hiện trên hệ thống chưa có bạn nào bật trạng thái Độc thân (${dbContext.marriedCount} bạn đã kết hôn).`;
      } else if (qLower.includes("sinh nhật")) {
        answer = dbContext.birthdayMembersThisMonth.length > 0
          ? `🎂 Danh sách sinh nhật tháng này gồm: ${dbContext.birthdayMembersThisMonth.join(", ")} 🎉!`
          : `🎂 Tháng này chưa có bạn nào ghi nhận sinh nhật trên hệ thống.`;
      } else if (dbContext.matchedMembers.length > 0) {
        answer = `🔍 Thông tin thành viên từ danh bạ tcdn4.top:\n${dbContext.matchedMembers.slice(0, 8).join("\n")}`;
      } else {
        answer = `🤖 Trợ lý K33 xin chào! Dữ liệu hiện tại: Có ${dbContext.totalProfiles} bạn đã điểm danh (${dbContext.tc10Count} TC10, ${dbContext.tc11Count} TC11, ${dbContext.tc12Count} TC12), ${dbContext.totalAttending} bạn đã đăng ký tham gia (${dbContext.totalConfirmed} bạn đã chuyển khoản) họp mặt ngày 12/12/2026 tại Cơ sở B UEH! ✨`;
      }

      return NextResponse.json({
        success: true,
        content: answer,
        provider: "builtin-engine",
        model: "k33-live-db",
      });
    }

    const synthFn = SYNTHESIZERS[tone] || SYNTHESIZERS.funny;
    const variants = synthFn(topic, memberName, className);
    const chosen = variants[Math.floor(Math.random() * variants.length)];

    return NextResponse.json({
      success: true,
      content: chosen,
      provider: "builtin-engine",
      model: "k33-templates",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi tạo nội dung AI" },
      { status: 500 }
    );
  }
}
