const { PrismaClient } = require("@prisma/client");

// Singleton — chỉ tạo một instance duy nhất để tránh quá nhiều kết nối database
const prisma = new PrismaClient();

module.exports = prisma;
