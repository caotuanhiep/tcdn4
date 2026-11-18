import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { fullName, className, shirtSize, phone, address, paidAmount } = payload;

    // Lấy tổng số lượng đã đăng ký tham gia thực tế từ Supabase
    let totalCount = 35; // Số lượng cơ sở ban đầu
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

    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
    const zaloPersonalLink = cleanPhone ? `https://zalo.me/${cleanPhone}` : "Chưa có";

    const botMessage = `🎉 [TCDN4-K33 15 NĂM] ĐĂNG KÝ HỘI NGỘ MỚI!
━━━━━━━━━━━━━━━━━━━━
👤 Họ và tên: ${fullName || "Cựu sinh viên K33"}
🎓 Lớp: ${className || "TC10"}
👕 Size áo Polo: ${shirtSize || "L (Nam)"}
📞 Số điện thoại: ${phone || "Chưa cập nhật"}
💬 Nhắn Zalo riêng: ${zaloPersonalLink}
📍 Địa chỉ nhận áo: ${address || "Tại buổi gặp mặt"}
💰 Kinh phí: ${paidAmount ? paidAmount.toLocaleString("vi-VN") + " VNĐ" : "1.000.000 VNĐ"}
━━━━━━━━━━━━━━━━━━━━
📊 TỔNG CỘNG ĐÃ ĐĂNG KÝ: ${totalCount} thành viên K33!
✨ Nhóm Zalo lớp: https://zalo.me/g/yodibu606`;

    // Gửi đến Webhook nếu có cấu hình
    const webhookUrl = process.env.ZALO_BOT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: botMessage,
            data: {
              ...payload,
              totalCount,
              zaloPersonalLink,
            },
          }),
        });
      } catch (e) {
        console.error("Failed to post to webhook:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Đã xử lý thông báo Zalo Bot",
      botMessage,
      totalCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Lỗi xử lý" },
      { status: 500 }
    );
  }
}
