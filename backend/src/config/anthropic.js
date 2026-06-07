const Anthropic = require("@anthropic-ai/sdk");

// Singleton Anthropic client — khởi tạo 1 lần khi app start
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

module.exports = anthropic;
