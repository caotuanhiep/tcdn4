/**
 * Chuẩn hóa văn bản thuần (plain text) trước khi gửi qua Zalo Bot / hiển thị cho Zalo.
 * Zalo không render cú pháp Markdown (**bold**, *italic*, ### heading, `code`, [text](url)),
 * nên mọi ký tự Markdown từ AI cần được bóc sạch để tin nhắn đẹp, tự nhiên trên điện thoại.
 */
export function formatPlainTextForZalo(raw: string): string {
  if (!raw) return "";

  let text = String(raw).replace(/\r\n/g, "\n");

  // 1. Gỡ code fence ```lang ... ```
  text = text.replace(/```[a-zA-Z0-9_-]*\n?/g, "");

  // 2. Chuyển link Markdown [nhãn](url) -> nhãn (url) hoặc chỉ url nếu trùng
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label: string, url: string) => {
    const cleanLabel = label.trim();
    if (!cleanLabel || cleanLabel === url || url.includes(cleanLabel)) return url;
    return `${cleanLabel}: ${url}`;
  });

  // 3. Xóa dấu tiêu đề Markdown ở đầu dòng (#, ##, ###...)
  text = text.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "");

  // 4. Chuyển đường kẻ ngang Markdown (---, ***, ___) thành thanh kẻ Zalo đẹp mắt
  text = text.replace(/^[ \t]*([-*_])\1{2,}[ \t]*$/gm, "━━━━━━━━━━━━━━━━━━━━");

  // 5. Chuyển bullet đầu dòng kiểu Markdown (* item hoặc - item) thành dấu chấm tròn gọn (• item)
  text = text.replace(/^[ \t]*[*-][ \t]+/gm, "• ");

  // 6. Gỡ ký tự blockquote `> ` ở đầu dòng
  text = text.replace(/^[ \t]*>[ \t]?/gm, "");

  // 7. Gỡ **bold**, __bold__, ***bold italic***, ~~strike~~, `inline code`
  text = text.replace(/\*\*\*([^*\n]+?)\*\*\*/g, "$1");
  text = text.replace(/\*\*([^*\n]+?)\*\*/g, "$1");
  text = text.replace(/__([^_\n]+?)__/g, "$1");
  text = text.replace(/~~([^~\n]+?)~~/g, "$1");
  text = text.replace(/`([^`\n]+?)`/g, "$1");

  // 8. Gỡ *italic* đơn (sau khi đã chuyển bullet đầu dòng sang •)
  text = text.replace(/(^|[\s([{"'“‘])\*([^*\n]+?)\*(?=[\s.,!?;:)\]}"'”’]|$)/g, "$1$2");

  // 9. Xóa mọi cụm ** hoặc __ còn sót lại nếu AI đóng mở lệch dòng
  text = text.replace(/\*\*/g, "");
  text = text.replace(/__/g, "");

  // 10. Thu gọn dòng trống thừa
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}
