import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadRegistrations, saveRegistrations } from "@/app/api/registrations/route";
import { loadBankConfigServer } from "@/lib/bank-server";
import { readPrivateJson, writePrivateJson } from "@/lib/private-storage";
import fs from "fs";
import path from "path";

const CLOUD_SEPAY_LOGS_PATH = "settings/sepay-webhook-logs.json";
const SEPAY_LOGS_PATH = path.join(process.cwd(), "data", "sepay-webhook-logs.json");

async function loadSepayLogs(): Promise<any[]> {
  // 1. Ưu tiên đọc từ Private Bucket `alumni-private` (hoạt động trên Vercel Production)
  try {
    const parsed = await readPrivateJson<any[]>(CLOUD_SEPAY_LOGS_PATH);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  // 2. Fallback file local
  try {
    if (fs.existsSync(SEPAY_LOGS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(SEPAY_LOGS_PATH, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

async function appendSepayLog(entry: any) {
  try {
    const logs = await loadSepayLogs();
    logs.unshift({
      time: new Date().toISOString(),
      ...entry,
    });
    const trimmed = logs.slice(0, 30);
    const json = JSON.stringify(trimmed, null, 2);

    // Lưu local
    try {
      const dir = path.dirname(SEPAY_LOGS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SEPAY_LOGS_PATH, json, "utf-8");
    } catch {}

    // Lưu kín vào Private Bucket `alumni-private`
    try {
      await writePrivateJson(CLOUD_SEPAY_LOGS_PATH, trimmed);
    } catch {}
  } catch {}
}

function removeVietnameseTones(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalizeUpper(str: string) {
  return removeVietnameseTones((str || "").toUpperCase());
}

/**
 * Chấm điểm mức độ khớp giữa nội dung chuyển khoản ngân hàng và một thành viên.
 * Trả về điểm số (0 = không khớp; càng cao càng chính xác).
 */
function scoreMemberMatch(
  cleanContent: string,
  spacedContent: string,
  member: { id?: string; fullName?: string; phone?: string; className?: string }
): { score: number; reason: string } {
  const phoneDigits = (member.phone || "").replace(/[^0-9]/g, "");
  const phoneNoZero = phoneDigits.startsWith("0") ? phoneDigits.slice(1) : phoneDigits;
  const phoneWith84 = phoneNoZero ? `84${phoneNoZero}` : "";
  const phoneLast6 = phoneDigits.length >= 6 ? phoneDigits.slice(-6) : "";
  const phoneLast4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : "";

  const idClean = (member.id || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const nameUpper = normalizeUpper(member.fullName || "");
  const nameClean = nameUpper.replace(/[^A-Z0-9]/g, "");
  const nameTokens = nameUpper
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  // 1. Khớp đầy đủ số điện thoại (có 0, bỏ 0, hoặc 84...)
  if (
    phoneDigits.length >= 9 &&
    (cleanContent.includes(phoneDigits) ||
      (phoneNoZero.length >= 8 && cleanContent.includes(phoneNoZero)) ||
      (phoneWith84.length >= 10 && cleanContent.includes(phoneWith84)))
  ) {
    return { score: 100, reason: "full_phone" };
  }

  // 2. Khớp mã ID đăng ký (khi độ dài >= 6)
  if (idClean.length >= 6 && cleanContent.includes(idClean)) {
    return { score: 95, reason: "registration_id" };
  }

  // 3. Khớp chính xác nguyên họ tên không dấu viết liền (VD: TRANVUYENLINH)
  if (nameClean.length >= 4 && cleanContent.includes(nameClean)) {
    return { score: 90, reason: "exact_full_name" };
  }

  // 4. Khớp ĐỦ các từ trong họ tên bất kể thứ tự (VD: profile "Hiệp Cao Tuấn" vs CK "CAO TUAN HIEP")
  if (nameTokens.length >= 2 && nameTokens.every((t) => cleanContent.includes(t))) {
    return { score: 85, reason: "all_name_tokens_any_order" };
  }

  // 5. Khớp 6 số cuối SĐT
  if (phoneLast6.length === 6 && cleanContent.includes(phoneLast6)) {
    return { score: 80, reason: "phone_last6" };
  }

  // 6. Khớp 4 số cuối SĐT
  if (phoneLast4.length === 4 && cleanContent.includes(phoneLast4)) {
    // Ưu tiên cao hơn nếu có thêm 1 từ của tên hoặc chữ TCDN4
    const hasNameHint = nameTokens.some((t) => t.length >= 3 && cleanContent.includes(t));
    return { score: hasNameHint ? 78 : 65, reason: "phone_last4" };
  }

  // 7. Khớp tên gọi (2 từ cuối cùng của họ tên, VD: "YEN LINH", "PHUC NGHIA", "TUAN HIEP")
  // Hoặc 2 từ bất kỳ độ dài >= 3 trong tên (VD: profile "Hiệp Cao Tuấn" -> "TUAN" + "HIEP")
  if (nameTokens.length >= 2) {
    const lastTwo = nameTokens.slice(-2);
    const lastTwoJoined = lastTwo.join("");
    if (lastTwoJoined.length >= 5 && cleanContent.includes(lastTwoJoined)) {
      return { score: 70, reason: "last_two_name_words" };
    }
    // Khớp ít nhất 2 từ riêng biệt (tổng >= 6 ký tự) xuất hiện trong nội dung CK
    const matchedTokens = nameTokens.filter((t) => t.length >= 3 && spacedContent.includes(t));
    if (matchedTokens.length >= 2 && matchedTokens.join("").length >= 6) {
      return { score: 62, reason: "two_name_tokens" };
    }
  }

  return { score: 0, reason: "none" };
}

export async function GET() {
  const logs = await loadSepayLogs();
  return NextResponse.json(
    {
      status: "active",
      endpoint: "https://tcdn4.top/api/sepay-webhook",
      logsCount: logs.length,
      recentLogs: logs.slice(0, 20),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    // 1. Đọc cấu hình Ngân hàng & SePay API Key từ Cloud Storage (ưu tiên cao nhất)
    const { config: bankConfig } = await loadBankConfigServer();
    const configuredApiKey = (bankConfig.sepayApiKey || process.env.SEPAY_API_KEY || "").trim();

    // Kiểm tra API Key từ Header (hỗ trợ Apikey, Bearer, raw Authorization, x-api-key)
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization") ||
      request.headers.get("x-api-key") ||
      request.headers.get("X-Api-Key") ||
      "";

    if (configuredApiKey !== "") {
      const token = authHeader
        .replace(/^(Apikey|Bearer)\s+/i, "")
        .trim();
      if (!token || token !== configuredApiKey) {
        await appendSepayLog({
          status: "unauthorized",
          receivedAuth: authHeader ? `${authHeader.slice(0, 12)}...` : "(none)",
          message: "API Key trong Header không khớp với API Key SePay đã lưu trong Admin",
        });
        return NextResponse.json(
          { success: false, message: "Unauthorized API Key" },
          { status: 401 }
        );
      }
    }

    // 2. Parse body từ SePay
    let data: any = {};
    try {
      data = await request.json();
    } catch {
      data = {};
    }

    const {
      id: sepayTxId,
      gateway,
      transactionDate,
      accountNumber,
      code,
      content,
      description,
      transferType,
      transferAmount,
      referenceCode,
    } = data;

    // Chỉ xử lý giao dịch tiền vào (tiền vào tài khoản lớp)
    if (transferType && String(transferType).toLowerCase() !== "in") {
      await appendSepayLog({
        status: "ignored_not_in",
        transferType,
        amount: transferAmount,
        content: content || description || "",
      });
      return NextResponse.json({
        success: true,
        message: "Ignored: Giao dịch không phải tiền vào",
      });
    }

    const combinedRawContent = [content, description, code].filter(Boolean).join(" ").trim();
    const upperContent = normalizeUpper(combinedRawContent);
    const spacedContent = ` ${upperContent.replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ")} `;
    const cleanContent = upperContent.replace(/[^A-Z0-9]/g, "");
    const amountNum = Number(transferAmount) || 0;
    const txRef = String(referenceCode || sepayTxId || gateway || "SEPAY_AUTO");

    let matchedName = "Thành viên TCDN4";
    let matchedClass = "TC4";
    let matchedShirtSize = "L (Nam)";
    let matchedRegType: "attending" | "shirt_only" = "attending";
    let isMatched = false;
    let matchReason = "none";
    let matchedId = "";
    let saveOk = false;

    // 3. Khớp lệnh thông minh với danh sách đăng ký tập trung (loadRegistrations)
    try {
      const allRegs = await loadRegistrations();
      if (allRegs && allRegs.length > 0) {
        // Chấm điểm toàn bộ phiếu đang pending (và cả phiếu đã confirmed phòng trường hợp kiểm tra lại)
        let bestIdx = -1;
        let bestScore = 0;
        let bestReason = "none";

        allRegs.forEach((reg, idx) => {
          const { score, reason } = scoreMemberMatch(cleanContent, spacedContent, {
            id: reg.id,
            fullName: reg.fullName,
            phone: reg.phone,
            className: reg.className,
          });
          // Ưu tiên phiếu đang pending lên trên phiếu đã confirmed
          const effectiveScore = reg.status === "pending" ? score + 10 : score;
          if (score > 0 && effectiveScore > bestScore) {
            bestScore = effectiveScore;
            bestIdx = idx;
            bestReason = reason;
          }
        });

        if (bestIdx >= 0) {
          const target = allRegs[bestIdx];
          const looksLikeShirtOnly =
            target.registrationType === "shirt_only" ||
            (amountNum > 0 && amountNum < 500000 && (spacedContent.includes(" AO ") || cleanContent.includes("TCDN4AO")));
          matchedRegType = looksLikeShirtOnly ? "shirt_only" : "attending";
          isMatched = true;
          matchReason = bestReason;
          matchedName = target.fullName;
          matchedClass = target.className;
          matchedId = target.id;
          matchedShirtSize = target.shirtSize || "L (Nam)";
          const targetPhoneClean = (target.phone || "").replace(/[^0-9]/g, "");

          // Cập nhật trạng thái sang confirmed (cập nhật luôn mọi bản ghi trùng ID/SĐT nếu có)
          const updated = allRegs.map((reg, idx) => {
            const regPhoneClean = (reg.phone || "").replace(/[^0-9]/g, "");
            const isSamePerson =
              idx === bestIdx ||
              (target.id && reg.id === target.id) ||
              (targetPhoneClean.length >= 9 && regPhoneClean === targetPhoneClean);

            if (isSamePerson) {
              return {
                ...reg,
                registrationType: matchedRegType,
                status: "confirmed" as const,
                paidAmount:
                  amountNum > 0
                    ? amountNum
                    : reg.paidAmount ||
                      (matchedRegType === "shirt_only"
                        ? bankConfig.shirtOnlyAmount || 250000
                        : bankConfig.amount || 1000000),
                paymentRef: txRef,
                confirmedAt: new Date().toISOString(),
                note: (reg.note ? reg.note + " | " : "") + `SePay tự động khớp (${bestReason}): ${txRef}`,
              };
            }
            return reg;
          });

          saveOk = await saveRegistrations(updated);

          // Đồng bộ attendance_status trên bảng profiles (giữ đúng shirt_only nếu là đặt áo kỷ niệm)
          try {
            if (matchedId && !matchedId.startsWith("reg-") && !matchedId.startsWith("profile-")) {
              const supabase = getSupabaseAdmin();
              await supabase.from("profiles").update({ attendance_status: matchedRegType }).eq("id", matchedId);
            }
          } catch {}
        }
      }

      // 4. Nếu chưa khớp trong registrations, đối soát trong bảng profiles trên Supabase
      if (!isMatched) {
        const supabase = getSupabaseAdmin();
        const { data: dbProfiles } = await supabase.from("profiles").select("*");
        if (dbProfiles && dbProfiles.length > 0) {
          let bestProfile: any = null;
          let bestScore = 0;
          let bestReason = "none";

          for (const p of dbProfiles) {
            const { score, reason } = scoreMemberMatch(cleanContent, spacedContent, {
              id: p.id,
              fullName: p.full_name,
              phone: p.phone,
              className: p.class_name,
            });
            if (score > bestScore) {
              bestScore = score;
              bestProfile = p;
              bestReason = reason;
            }
          }

          if (bestProfile && bestScore > 0) {
            const isProfileShirtOnly =
              bestProfile.attendance_status === "shirt_only" ||
              (amountNum > 0 && amountNum < 500000);
            matchedRegType = isProfileShirtOnly ? "shirt_only" : "attending";
            isMatched = true;
            matchReason = `profile_${bestReason}`;
            matchedName = bestProfile.full_name || "Thành viên K33";
            matchedClass = (bestProfile.class_name as any) || "TC10";
            matchedId = bestProfile.id;
            matchedShirtSize = bestProfile.shirt_size || "L (Nam)";
            const pPhone = (bestProfile.phone || "").replace(/[^0-9]/g, "");

            // Cập nhật profile theo đúng loại (attending hoặc shirt_only)
            try {
              await supabase.from("profiles").update({ attendance_status: matchedRegType }).eq("id", bestProfile.id);
            } catch {}

            // Cập nhật / Thêm mới vào danh sách registrations
            const currentRegs = await loadRegistrations();
            const newConfirmedReg = {
              id: bestProfile.id || `reg-${Date.now()}`,
              fullName: bestProfile.full_name || "Thành viên K33",
              className: (bestProfile.class_name as any) || "TC10",
              phone: bestProfile.phone || "",
              shirtSize: bestProfile.shirt_size || "L (Nam)",
              address: bestProfile.delivery_address || (bestProfile.location_region === "hn" ? "Hà Nội" : "TP. Hồ Chí Minh"),
              avatarUrl: bestProfile.avatar_url || undefined,
              guestsCount: 0,
              registrationType: matchedRegType,
              status: "confirmed" as const,
              paidAmount:
                amountNum > 0
                  ? amountNum
                  : matchedRegType === "shirt_only"
                  ? bankConfig.shirtOnlyAmount || 250000
                  : bankConfig.amount || 1000000,
              paymentRef: txRef,
              confirmedAt: new Date().toISOString(),
              createdAt: new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
              note: `SePay tự động khớp từ danh bạ (${bestReason}): ${txRef}`,
            };

            const existingIdx = currentRegs.findIndex(
              (r: any) => r.id === bestProfile.id || (pPhone.length >= 9 && (r.phone || "").replace(/[^0-9]/g, "") === pPhone)
            );
            if (existingIdx >= 0) {
              currentRegs[existingIdx] = { ...currentRegs[existingIdx], ...newConfirmedReg };
            } else {
              currentRegs.unshift(newConfirmedReg);
            }
            saveOk = await saveRegistrations(currentRegs);
          }
        }
      }
    } catch (err) {
      console.warn("Lỗi khớp lệnh manifest registrations:", err);
    }

    // 5. Phát sóng Supabase Realtime Broadcast để mọi trình duyệt (Admin & User QR) tự đổi trạng thái ngay lập tức
    if (isMatched) {
      try {
        const supabase = getSupabaseAdmin();
        const ch = supabase.channel("tcdn4-realtime");
        await ch.send({
          type: "broadcast",
          event: "data_updated",
          payload: { reason: "registration", id: matchedId, status: "confirmed", paidAmount: amountNum, time: Date.now() },
        });
      } catch {}
    }

    // 6. Ghi log SePay tập trung (Cloud + Local) để kiểm tra đối soát trong Admin
    await appendSepayLog({
      status: isMatched ? "matched" : "unmatched",
      matchReason,
      saveOk,
      amount: amountNum,
      gateway,
      accountNumber,
      content: combinedRawContent,
      cleanContent,
      transactionDate,
      referenceCode: txRef,
      matchedMember: isMatched ? `${matchedName} (${matchedClass})` : null,
    });

    // 7. Tự động bắn thông báo xác nhận chuyển khoản vào Zalo Bot (nhóm Ban Liên Lạc / nhóm bật nhận tin chuyển khoản)
    try {
      const origin = new URL(request.url).origin;
      const siteUrl = origin && !origin.includes("localhost") ? origin : (process.env.NEXT_PUBLIC_SITE_URL || origin || "https://tcdn4.top");
      await fetch(`${siteUrl}/api/zalo-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment",
          fullName: matchedName,
          className: matchedClass,
          paidAmount: amountNum,
          shirtSize: matchedShirtSize || "L (Nam)",
          registrationType: matchedRegType,
          bankGateway: gateway || bankConfig.bankName || accountNumber || "Tài khoản lớp",
          content: combinedRawContent || "",
          transactionDate: transactionDate || new Date().toLocaleString("vi-VN"),
          referenceCode: txRef,
        }),
      });
    } catch (zErr) {
      console.warn("Lỗi gửi tin Zalo Bot từ SePay webhook:", zErr);
    }

    return NextResponse.json({
      success: true,
      matched: isMatched,
      matchReason,
      saveOk,
      matchedMember: isMatched ? `${matchedName} (${matchedClass})` : null,
      message: isMatched
        ? `Đã khớp thành công cho ${matchedName} (${matchedClass}) [${matchReason}]`
        : "Đã nhận webhook giao dịch nhưng chưa khớp được với thành viên nào",
    });
  } catch (err: any) {
    console.error("SePay webhook error:", err);
    await appendSepayLog({
      status: "error",
      error: err.message,
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
