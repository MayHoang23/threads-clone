// Layout cho nhóm route (auth): /login và /register
// Căn giữa màn hình, nền trắng
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
