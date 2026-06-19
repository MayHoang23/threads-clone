const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// Response chung khi vượt giới hạn — đúng format { success, data, message }
const limitExceeded = (req, res) => {
    res.status(429).json({
        success: false,
        data: null,
        message: "Quá nhiều yêu cầu, vui lòng thử lại sau",
    });
};

// Key theo IP (ipKeyGenerator xử lý đúng cả IPv6)
const byIp = (req) => ipKeyGenerator(req.ip);

// POST /auth/login — tối đa 10 request / 15 phút / IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 10,
    keyGenerator: byIp,
    handler: limitExceeded,
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /auth/register — tối đa 5 request / 1 giờ / IP
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 5,
    keyGenerator: byIp,
    handler: limitExceeded,
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /auth/forgot-password — tối đa 5 request / 1 giờ / IP
const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 5,
    keyGenerator: byIp,
    handler: limitExceeded,
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { loginLimiter, registerLimiter, forgotPasswordLimiter };
