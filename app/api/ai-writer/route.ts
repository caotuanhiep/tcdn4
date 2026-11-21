import { NextRequest, NextResponse } from "next/server";

interface AiWriterRequest {
  topic?: string;
  tone?: "funny" | "warm" | "urgent" | "formal" | "birthday" | "checkin" | "registration";
  memberName?: string;
  className?: string;
  details?: string;
  apiKey?: string;
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
};

export async function POST(req: NextRequest) {
  try {
    const body: AiWriterRequest = await req.json();
    const { topic = "", tone = "funny", memberName, className, details, apiKey } = body;

    // Nếu người dùng cung cấp Gemini API Key hoặc đã có trong ENV
    const activeGeminiKey = apiKey || process.env.GEMINI_API_KEY;

    if (activeGeminiKey) {
      try {
        const prompt = `Bạn là một chuyên gia truyền thông và là cựu sinh viên lớp Tài chính doanh nghiệp 4 (TCDN4), Khóa 33 (K33) Đại học Kinh tế TP.HCM (UEH).
Hãy viết một mẩu tin nhắn ngắn gọn (khoảng 3 - 6 câu), dí dỏm, thân tình, có icon emoji sinh động, dùng để gửi vào Nhóm Zalo của lớp/khóa.
Thông tin:
- Chủ đề/Ý tưởng: "${topic || "Nhắc họp mặt 15 năm ngày 12/12/2026 tại Cơ sở B và chốt size áo"}"
- Phong cách viết: ${tone === "funny" ? "Hài hước, dí dỏm, đậm chất sinh viên UEH" : tone === "warm" ? "Ấm áp, xúc động, hoài niệm 15 năm thanh xuân" : tone === "urgent" ? "Giục giã, hào hứng, chốt sổ gấp" : tone === "birthday" ? "Chúc mừng sinh nhật thân tình, hài hước, tuổi 36-37" : "Trang trọng, thông báo chính thức BLL"}
${memberName ? `- Tên thành viên: ${memberName}` : ""}
${className ? `- Lớp: ${className}` : ""}
${details ? `- Chi tiết thêm: ${details}` : ""}
Quy tắc:
- Chèn link tự nhiên: https://tcdn4.top/#event hoặc https://tcdn4.top/#directory
- Không dùng từ ngữ sáo rỗng. Hãy gần gũi như đồng môn nói chuyện với nhau.
- Chỉ trả về duy nhất nội dung tin nhắn, không thêm lời dẫn hay giải thích.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeGeminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const generated = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generated && generated.trim().length > 10) {
            return NextResponse.json({
              success: true,
              content: generated.trim(),
              provider: "gemini",
            });
          }
        }
      } catch (e) {
        console.warn("Gemini API call failed, falling back to built-in synthesizer:", e);
      }
    }

    // Fallback: Sử dụng bộ máy AI tổng hợp thông minh nội bộ K33
    const synthFn = SYNTHESIZERS[tone] || SYNTHESIZERS.funny;
    const variants = synthFn(topic, memberName, className);
    const chosen = variants[Math.floor(Math.random() * variants.length)];

    return NextResponse.json({
      success: true,
      content: chosen,
      provider: "builtin-engine",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi tạo nội dung AI" },
      { status: 500 }
    );
  }
}
