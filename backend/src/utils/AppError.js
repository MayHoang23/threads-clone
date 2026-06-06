// Class lỗi tùy chỉnh — mở rộng Error có thêm statusCode
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // Đánh dấu đây là lỗi "có chủ ý" (khác với lỗi hệ thống bất ngờ)
    this.isOperational = true;
  }
}

module.exports = AppError;