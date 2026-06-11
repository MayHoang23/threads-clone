const nodemailer = require("nodemailer");

// Transporter dùng Gmail — GMAIL_PASS là App Password (không phải mật khẩu Gmail thường)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const sendVerificationEmail = async (to, token) => {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: `"Threads Clone" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Xác thực email của bạn",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="color:#111">Xác thực email</h2>
        <p>Bấm vào nút bên dưới để xác thực tài khoản của bạn. Link có hiệu lực trong 24 giờ.</p>
        <a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#111;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Xác thực ngay</a>
        <p style="margin-top:24px;color:#888;font-size:13px">Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.</p>
      </div>
    `,
  });
};

const sendResetPasswordEmail = async (to, token) => {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: `"Threads Clone" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Đặt lại mật khẩu",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
        <h2 style="color:#111">Đặt lại mật khẩu</h2>
        <p>Bấm vào nút bên dưới để đặt lại mật khẩu. Link có hiệu lực trong 1 giờ.</p>
        <a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#111;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Đặt lại mật khẩu</a>
        <p style="margin-top:24px;color:#888;font-size:13px">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendResetPasswordEmail };
