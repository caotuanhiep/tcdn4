import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // 1. Kiểm tra API Key từ Header nếu cấu hình SEPAY_API_KEY
    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const configuredApiKey = process.env.SEPAY_API_KEY;

    if (configuredApiKey && authHeader) {
      const token = authHeader.replace(/^Apikey\s+/i, "").trim();
      if (token !== configuredApiKey.trim()) {
        return NextResponse.json(
          { success: false, message: "Unauthorized API Key" },
          { status: 401 }
        );
      }
    }

    // 2. Parse body từ SePay
    const data = await request.json();
    const {
      gateway,
      transactionDate,
      accountNumber,
      content,
      transferType,
      transferAmount,
      referenceCode,
    } = data;

    // Chỉ xử lý giao dịch tiền vào (tiền vào tài khoản lớp)
    if (transferType !== "in" && transferType !== "IN") {
      return NextResponse.json({
        success: true,
        message: "Ignored: Giao dịch không phải tiền vào",
      });
    }

    const rawContent = (content || "").toUpperCase();
    const amountNum = Number(transferAmount) || 0;

    // 3. Cập nhật vào Supabase nếu có bảng registrations / profiles
    let matchedName = "Thành viên TCDN4";
    let matchedClass = "TC4";
    let isMatched = false;

    try {
      const supabaseAdmin = getSupabaseAdmin();

      // Tìm phiếu đăng ký tương ứng
      const { data: regs } = await supabaseAdmin
        .from("registrations")
        .select("*")
        .eq("status", "pending");

      if (regs && regs.length > 0) {
        for (const reg of regs) {
          const regNameClean = (reg.full_name || "").toUpperCase().replace(/\s+/g, "");
          const regPhoneLast4 = (reg.phone || "").slice(-4);

          // Khớp nếu nội dung chứa 4 số cuối điện thoại hoặc tên
          if (
            (regPhoneLast4 && rawContent.includes(regPhoneLast4)) ||
            (regNameClean && rawContent.includes(regNameClean)) ||
            (reg.id && rawContent.includes(reg.id.toUpperCase()))
          ) {
            matchedName = reg.full_name || matchedName;
            matchedClass = reg.class_name || matchedClass;
            isMatched = true;

            // Cập nhật trạng thái thành confirmed
            await supabaseAdmin
              .from("registrations")
              .update({
                status: "confirmed",
                paid_amount: amountNum,
                payment_ref: referenceCode || gateway,
                confirmed_at: new Date().toISOString(),
              })
              .eq("id", reg.id);
            break;
          }
        }
      }
    } catch (e) {
      console.warn("SePay webhook Supabase update note:", e);
    }

    // 4. Tự động bắn thông báo xác nhận thanh toán vào Nhóm Zalo qua Zalo Bot Webhook
    const zaloBotWebhook = process.env.ZALO_BOT_WEBHOOK_URL;
    const zaloNotification = `🔔 [XÁC NHẬN THANH TOÁN TỰ ĐỘNG - SEPAY]
━━━━━━━━━━━━━━━━━━━━
💰 Số tiền: +${amountNum.toLocaleString("vi-VN")} VNĐ
🏦 Ngân hàng: ${gateway || "Tài khoản lớp"} (${accountNumber || "..."})
📝 Nội dung: ${content || "TCDN4 Chuyển khoản"}
⏰ Thời gian: ${transactionDate || new Date().toLocaleString("vi-VN")}
🔢 Mã giao dịch: ${referenceCode || "N/A"}
━━━━━━━━━━━━━━━━━━━━
✨ Trạng thái: ${isMatched ? `Khớp lệnh thành công cho ${matchedName} (${matchedClass})` : "Đã ghi nhận tiền vào quỹ 15 năm!"}
🎉 Cảm ơn bạn đã đồng hành cùng Hội ngộ 15 năm TCDN4!`;

    if (zaloBotWebhook) {
      try {
        await fetch(zaloBotWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: zaloNotification,
            type: "sepay_payment_confirmed",
            data,
          }),
        });
      } catch (err) {
        console.error("Lỗi gửi SePay alert tới Zalo Bot Webhook:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "SePay webhook processed successfully",
      isMatched,
      matchedName,
      amount: amountNum,
    });
  } catch (error: any) {
    console.error("SePay Webhook Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
