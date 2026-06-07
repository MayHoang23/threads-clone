const anthropic = require("../../config/anthropic");

const MODEL = "claude-haiku-4-5";

// ========================
// TẠO CAPTION TỪ Ý TƯỞNG
// ========================
// idea: ý tưởng post, tone: casual | professional | funny
// Trả về mảng 3 caption string
const generateCaption = async (idea, tone = "casual") => {
  const toneMap = {
    casual: "thân thiện, gần gũi, tự nhiên như đang nói chuyện với bạn bè",
    professional: "chuyên nghiệp, lịch sự, phù hợp môi trường công việc",
    funny: "hài hước, vui tươi, có thể dùng emoji và ngôn ngữ trendy",
  };
  const toneDesc = toneMap[tone] || toneMap.casual;

  const systemPrompt =
    "Bạn là chuyên gia viết caption mạng xã hội cho người Việt Nam.\n" +
    "Nhiệm vụ: Tạo đúng 3 caption dựa trên ý tưởng và giọng văn người dùng cung cấp.\n" +
    "Giọng văn yêu cầu: " + toneDesc + ".\n" +
    "Quy tắc bắt buộc:\n" +
    "- Phản hồi PHẢI là JSON thuần túy, không có markdown, không có chú thích nào khác\n" +
    '- Format: {"captions": ["caption1", "caption2", "caption3"]}\n' +
    "- Mỗi caption dài 50-150 ký tự\n" +
    "- Phù hợp văn hóa Việt Nam\n" +
    "- Có thể kèm emoji nếu phù hợp giọng văn";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: "Ý tưởng bài viết: " + idea,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  // Parse JSON — nếu AI trả về format sai thì throw để controller bắt
  const parsed = JSON.parse(raw);
  return parsed.captions;
};

// ========================
// GỢI Ý HASHTAG TỪ NỘI DUNG
// ========================
// content: nội dung bài viết
// Trả về mảng 5-10 hashtag string (không có dấu #)
const suggestHashtags = async (content) => {
  const systemPrompt =
    "Bạn là chuyên gia tối ưu hashtag cho mạng xã hội Việt Nam.\n" +
    "Nhiệm vụ: Phân tích nội dung và đề xuất hashtag phù hợp nhất.\n" +
    "Quy tắc bắt buộc:\n" +
    "- Phản hồi PHẢI là JSON thuần túy, không có markdown, không có chú thích nào khác\n" +
    '- Format: {"hashtags": ["hashtag1", "hashtag2", ...]}\n' +
    "- Trả về 5-10 hashtag, không có dấu #\n" +
    "- Mix hashtag tiếng Việt và tiếng Anh khi phù hợp\n" +
    "- Ưu tiên hashtag phổ biến, có lượt tìm kiếm cao\n" +
    "- Không có dấu cách trong hashtag";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: "Nội dung bài viết: " + content,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  const parsed = JSON.parse(raw);
  return parsed.hashtags;
};

// ========================
// KIỂM DUYỆT NỘI DUNG
// ========================
// content: nội dung cần kiểm tra
// Trả về: { isSafe: bool, reason: string, severity: "low"|"medium"|"high" }
const moderateContent = async (content) => {
  if (!content?.trim()) {
    return { isSafe: true, reason: "", severity: "low" };
  }

  const systemPrompt =
    "Bạn là hệ thống kiểm duyệt nội dung mạng xã hội Việt Nam.\n" +
    "Phân tích nội dung xem có vi phạm các quy tắc sau không:\n" +
    "- Ngôn từ thù ghét, phân biệt đối xử\n" +
    "- Nội dung bạo lực, kích động\n" +
    "- Spam, quảng cáo trá hình\n" +
    "- Thông tin sai lệch nguy hiểm\n" +
    "- Nội dung người lớn không phù hợp\n\n" +
    "Quy tắc bắt buộc:\n" +
    "- Phản hồi PHẢI là JSON thuần túy, không có markdown, không có chú thích nào khác\n" +
    '- Format: {"isSafe": true/false, "reason": "lý do nếu không an toàn, bỏ trống nếu an toàn", "severity": "low|medium|high"}\n' +
    "- isSafe=false chỉ khi nội dung rõ ràng vi phạm\n" +
    "- severity: low=nhẹ, medium=trung bình, high=nghiêm trọng";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: "Kiểm tra nội dung sau: " + content,
      },
    ],
  });

  const raw = message.content[0].text.trim();
  const parsed = JSON.parse(raw);
  return {
    isSafe: Boolean(parsed.isSafe),
    reason: parsed.reason || "",
    severity: parsed.severity || "low",
  };
};

module.exports = { generateCaption, suggestHashtags, moderateContent };
