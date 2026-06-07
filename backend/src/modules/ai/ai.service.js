const MOCK_MODE = true; // Bật mock vì chưa có credit

const generateCaption = async (topic, tone = "friendly") => {
  if (MOCK_MODE) {
    return [
      `${topic} - khoảnh khắc đáng nhớ! ✨`,
      `Chia sẻ cùng mọi người về ${topic} 🌟`,
      `${topic} - mỗi ngày một niềm vui mới 💫`,
    ];
  }
  // Code Anthropic API thật giữ nguyên bên dưới
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    messages: [{ role: "user", content: `Tạo 3 caption mạng xã hội về "${topic}", tone: ${tone}. Trả về JSON array.` }],
  });
  return JSON.parse(response.content[0].text);
};

const suggestHashtags = async (content) => {
  if (MOCK_MODE) {
    return ["#threads", "#xuhuong", "#vietnam", "#lifestyle", "#daily"];
  }
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 200,
    messages: [{ role: "user", content: `Gợi ý 5 hashtag cho: "${content}". Trả về JSON array.` }],
  });
  return JSON.parse(response.content[0].text);
};

const moderateContent = async (content) => {
  if (MOCK_MODE) return { safe: true, reason: null, isSafe: true, severity: "low" };
  if (MOCK_MODE) return { safe: true, reason: null };
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 100,
    messages: [{ role: "user", content: `Kiểm duyệt nội dung: "${content}". Trả về JSON {safe: bool, reason: string|null}.` }],
  });
  return JSON.parse(response.content[0].text);
};

module.exports = { generateCaption, suggestHashtags, moderateContent };
