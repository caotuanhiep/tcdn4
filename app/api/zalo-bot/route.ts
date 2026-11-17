import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { fullName, className, shirtSize, phone, address, paidAmount } = payload;

    const botMessage = `🎉 [TCDN4-K33 15 NĂM] ĐĂNG KÝ MỚI:\n👤 Họ tên: ${fullName}\n🎓 Lớp: ${className}\n👕 Size áo: ${shirtSize}\n📞 SĐT: ${phone}\n📍 Địa chỉ nhận áo: ${address}\n💰 Kinh phí: ${paidAmount ? paidAmount.toLocaleString("vi-VN") + " VNĐ" : "500.000 VNĐ"}\n✨ Link nhóm: https://zalo.me/g/yodibu606`;

    // Check if custom webhook URL is configured in environment or admin settings
    const webhookUrl = process.env.ZALO_BOT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: botMessage,
            data: payload,
          }),
        });
      } catch (e) {
        console.error("Failed to post to custom webhook:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Đã xử lý thông báo Zalo Bot",
      botMessage,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi xử lý" },
      { status: 500 }
    );
  }
}
