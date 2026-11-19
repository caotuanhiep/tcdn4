import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const type = payload.type || "registration";

    let botMessage = "";
    let summaryTitle = "";

    // 1. LUỒNG ĐĂNG KÝ THAM GIA HỘI NGỘ 15 NĂM (Dí dỏm, hào hứng)
    if (type === "registration") {
      const { fullName, className, shirtSize, phone, address, paidAmount, guestsCount } = payload;

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

      botMessage = `🔥 KÈO NÀY CĂNG ĐÂY ANH EM ƠI!
👤 ${fullName || "Đồng môn K33"} (${className || "TC10"})${guestsText} đã chính thức chốt slot họp mặt 15 năm tại Cơ sở B và rinh áo Polo size ${shirtSize || "L"}!
🍻 Đã có ${totalCount} anh em lên thuyền sẵn sàng cụng ly ngày 12/12.
👉 Ai chưa chốt thì vào lẹ kẻo hết bàn nhé: https://tcdn4.top/#event`;
    }

    // 2. LUỒNG THÔNG BÁO ĐIỂM DANH (Khi có thành viên mới tạo tài khoản / điểm danh)
    else if (type === "checkin") {
      const { fullName, className, jobTitle, company, location } = payload;
      summaryTitle = `Điểm danh mới: ${fullName} (${className || "K33"})`;

      const jobInfo = jobTitle ? ` đang làm ${jobTitle}${company ? ` tại ${company}` : ""}` : "";
      const locInfo = location ? ` ở ${location}` : "";

      botMessage = `🎉 ỐI DỒI ÔI CẢ NHÀ ƠI!
Sau 15 năm 'mất tích', cựu sinh viên ${fullName || "Một bạn"} (${className || "TC10"})${jobInfo}${locInfo} vừa chính thức lộ diện điểm danh trên Alumni Hub!
👉 Anh em cùng khóa vào 'soi' hồ sơ và kết nối lại ngay nào: https://tcdn4.top/#directory`;
    }

    // 3. LUỒNG CHÚC MỪNG SINH NHẬT (Ấm áp, vui vẻ, hài hước)
    else if (type === "birthday") {
      const { name, className, customWish } = payload;
      summaryTitle = `Sinh nhật: ${name} (${className || "K33"})`;

      if (customWish) {
        botMessage = customWish;
      } else {
        botMessage = `🎂 ALO ALO CẢ NHÀ ƠI!
Hôm nay là sinh nhật của bạn ${name} (${className || "TC10"})! 🎉
Thay mặt đại gia đình TCDN4 K33, chúc bạn tuổi mới ngày càng phong độ, tiền vào như nước Sông Sài Gòn, sự nghiệp thăng hoa và mãi giữ tinh thần trẻ khỏe thời sinh viên nhé! 🍻
👉 Gửi lời chúc tới ${name}: https://tcdn4.top`;
      }
    }

    // 4. LUỒNG THÔNG BÁO TỨC THÌ / THEO LỊCH (Broadcast)
    else if (type === "broadcast") {
      const { title, message } = payload;
      summaryTitle = title || "Thông báo từ Ban Liên Lạc";
      botMessage = message || "Thông báo từ Ban Liên Lạc TCDN4 K33 UEH";
    }

    // Gửi đến Webhook nếu có cấu hình
    const webhookUrl = process.env.ZALO_BOT_WEBHOOK_URL;
    let webhookSent = false;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            title: summaryTitle,
            message: botMessage,
            data: payload,
            sentAt: new Date().toISOString(),
          }),
        });
        webhookSent = true;
      } catch (e) {
        console.error("Failed to post to webhook:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Đã xử lý thông báo Zalo Bot thành công",
      type,
      title: summaryTitle,
      botMessage,
      webhookSent,
      sentAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi xử lý Zalo Bot" },
      { status: 500 }
    );
  }
}
