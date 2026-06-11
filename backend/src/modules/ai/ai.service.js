const { GoogleGenerativeAI } = require("@google/generative-ai");

const MOCK_MODE = false;
// gemini-1.5-flash đã bị Google gỡ (404) — dùng 2.5-flash là bản stable thay thế
const GEMINI_MODEL = "gemini-2.5-flash";

const getGeminiClient = () => {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

const generateCaption = async (topic, tone = "friendly") => {
  if (MOCK_MODE) {
    return [
      `${topic} - khoảnh khắc đáng nhớ! ✨`,
      `Chia sẻ cùng mọi người về ${topic} 🌟`,
      `${topic} - mỗi ngày một niềm vui mới 💫`,
    ];
  }
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `Tạo 3 caption mạng xã hội về "${topic}", tone: ${tone}.
Yêu cầu: ngắn gọn, có emoji, phù hợp mạng xã hội Việt Nam.
Trả về JSON array gồm 3 string, KHÔNG có markdown hay text thừa.
Ví dụ: ["caption 1", "caption 2", "caption 3"]`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error("[AI] generateCaption error:", err.message);
    return [
      `${topic} - khoảnh khắc đáng nhớ! ✨`,
      `Chia sẻ cùng mọi người về ${topic} 🌟`,
      `${topic} - mỗi ngày một niềm vui mới 💫`,
    ];
  }
};

const suggestHashtags = async (content) => {
  if (MOCK_MODE) {
    return ["#threads", "#xuhuong", "#vietnam", "#lifestyle", "#daily"];
  }
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `Gợi ý 5 hashtag phù hợp cho nội dung: "${content}".
Trả về JSON array gồm 5 string có dấu #, KHÔNG có markdown hay text thừa.
Ví dụ: ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error("[AI] suggestHashtags error:", err.message);
    return ["#threads", "#xuhuong", "#vietnam", "#lifestyle", "#daily"];
  }
};

const moderateContent = async (content) => {
  if (MOCK_MODE) {
    return { safe: true, reason: null, isSafe: true, severity: "low" };
  }
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = `Kiểm duyệt nội dung mạng xã hội: "${content}".
Trả về JSON object, KHÔNG có markdown hay text thừa.
Ví dụ: {"safe": true, "reason": null, "isSafe": true, "severity": "low"}
severity có thể là: "low", "medium", "high"`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    // Normalize: post.service check isSafe — nếu AI chỉ trả "safe" mà thiếu "isSafe"
    // thì !undefined sẽ chặn oan mọi bài đăng
    const isSafe = parsed.isSafe ?? parsed.safe ?? true;
    return {
      safe: isSafe,
      isSafe,
      reason: parsed.reason ?? null,
      severity: parsed.severity ?? "low",
    };
  } catch (err) {
    console.error("[AI] moderateContent error:", err.message);
    return { safe: true, reason: null, isSafe: true, severity: "low" };
  }
};

module.exports = { generateCaption, suggestHashtags, moderateContent };
