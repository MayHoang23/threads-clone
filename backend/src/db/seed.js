const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");

// Tạo tài khoản admin mặc định — chạy: node src/db/seed.js
async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: "admin@threads.clone" },
  });
  if (existing) {
    console.log("Admin đã tồn tại, bỏ qua.");
    return;
  }

  const password = await bcrypt.hash("Admin@123456", 10);
  await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@threads.clone",
      password,
      displayName: "Administrator",
      role: "ADMIN",
      emailVerified: true, // Admin không cần verify qua email
    },
  });
  console.log("Tạo admin thành công: admin@threads.clone / Admin@123456");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
