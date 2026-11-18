import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name, className, date, apiKey, style = "warm" } = await request.json();

    const claudeKey = apiKey || process.env.ANTHROPIC_API_KEY;

    if (claudeKey) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 400,
            messages: [
              {
                role: "user",
                content: `Hãy viết một lời chúc mừng sinh nhật thật đặc biệt, ấm áp và pha chút hài hước thân mật của thời sinh viên dành cho bạn ${name} (Cựu sinh viên lớp ${className || "TC4"}, khóa K33 Đại học Kinh tế TP.HCM - UEH). 
Nhân dịp sinh nhật ngày ${date || "hôm nay"}, nhắc bạn ấy nhớ giữ gìn sức khỏe, thành công trong sự nghiệp và hẹn gặp lại đông đủ tại Đại lễ Kỷ niệm 15 Năm Hội Ngộ TCDN4 ngày 12/12/2026 tới đây!
Sử dụng các emoji phù hợp (🎂, 🎉, 🍻, 🎓, ❤️). Độ dài khoảng 3-4 câu xúc tích, đậm chất bạn bè đồng môn.`,
              },
            ],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const aiText = result?.content?.[0]?.text;
          if (aiText) {
            return NextResponse.json({
              success: true,
              wish: aiText,
              provider: "claude-ai",
            });
          }
        }
      } catch (err) {
        console.warn("Claude API call failed, falling back to template:", err);
      }
    }

    // Fallback template sinh nhật thông minh và chuẩn chỉnh
    const templates = [
      `🎂🎉 CHÚC MỪNG SINH NHẬT BẠN ${name ? name.toUpperCase() : "BẠN TÔI"} - ${className || "K33"}! 🎉🎂\n\nThay mặt tập thể TCDN4 K33 UEH, chúc bạn thêm một tuổi mới luôn dồi dào sức khỏe, gia đình hạnh phúc và gặt hái thêm nhiều bước ngoặt rực rỡ trong sự nghiệp!\n\n15 năm trôi qua nhưng thanh xuân chúng ta vẫn luôn ở đó. Nhớ giữ lịch ngày 12/12 này để nâng ly hội ngộ cùng anh em TC10 - TC11 - TC12 nhé! 🍻🎓❤️\n\n✨ TCDN4 Alumni Hub: https://tcdn4.top`,
      `🥂✨ HAPPY BIRTHDAY ${name ? name.toUpperCase() : "ĐỒNG MÔN"} (${className || "TC4"})! ✨🥂\n\nChúc ${name} sinh nhật ngập tràn niềm vui, công việc thăng hoa và luôn giữ vững nụ cười rạng rỡ của những ngày ở giảng đường Cơ sở B UEH!\n\nÁo kỷ niệm 15 năm đã sẵn sàng, hẹn gặp ${name} tại buổi họp mặt 15 năm tốt nghiệp sắp tới nhé! 🎉🎂`,
    ];

    const randomWish = templates[Math.floor(Math.random() * templates.length)];

    return NextResponse.json({
      success: true,
      wish: randomWish,
      provider: "template",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi tạo lời chúc" },
      { status: 500 }
    );
  }
}
