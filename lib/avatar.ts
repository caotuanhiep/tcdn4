/**
 * Tạo chữ viết tắt 2 ký tự cho avatar tự sinh:
 * Lấy chữ cái đầu của từ đầu tiên và chữ cái đầu của từ cuối cùng.
 * Ví dụ: "Lê Trần Phúc Nghĩa" -> "LN"
 *        "Cao Tuấn Hiệp"       -> "CH"
 *        "Trần Vũ Yến Linh"   -> "TL"
 *        "Hiệp"               -> "HI"
 */
export function getAvatarInitials(name?: string | null): string {
  if (!name) return "TC";
  const clean = name.trim();
  if (!clean) return "TC";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "TC";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  const first = words[0][0];
  const last = words[words.length - 1][0];
  return (first + last).toUpperCase();
}
