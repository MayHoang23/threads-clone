import Link from "next/link";

// Sidebar tĩnh — có thể thay bằng API thật sau này
// Server Component: không cần "use client"

const SUGGESTED_USERS = [
  { username: "design.daily", displayName: "Design Daily", gradient: "from-orange-400 to-pink-500", followers: "24.1K" },
  { username: "code.journey", displayName: "Code Journey", gradient: "from-blue-400 to-indigo-500", followers: "11.8K" },
  { username: "photo.vibes", displayName: "Photo Vibes", gradient: "from-green-400 to-teal-500", followers: "48.3K" },
];

const TRENDING_TAGS = [
  { name: "threads", count: "125K bài" },
  { name: "nextjs14", count: "43K bài" },
  { name: "design", count: "89K bài" },
  { name: "saigon", count: "234K bài" },
  { name: "photography", count: "512K bài" },
];

export default function Sidebar() {
  return (
    <div className="space-y-8 pt-2">
      {/* Gợi ý người theo dõi */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Gợi ý cho bạn</h3>
        <div className="space-y-4">
          {SUGGESTED_USERS.map((user) => (
            <div key={user.username} className="flex items-center gap-3">
              {/* Avatar với gradient màu riêng */}
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${user.gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.username}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{user.followers} người theo dõi</p>
              </div>
              <button className="text-xs font-semibold text-black dark:text-white border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
                Follow
              </button>
            </div>
          ))}
        </div>
        <button className="mt-3 text-xs text-blue-500 hover:underline font-medium">
          Xem thêm →
        </button>
      </div>

      {/* Hashtag đang trending */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Đang hot 🔥</h3>
        <div className="space-y-3">
          {TRENDING_TAGS.map((tag, i) => (
            <Link
              key={tag.name}
              href={`/hashtag/${tag.name}`}
              className="flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-500 transition-colors">
                  #{tag.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{tag.count}</p>
              </div>
              <span className="text-xs text-gray-300 dark:text-gray-600">#{i + 1}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer links nhỏ */}
      <div className="text-xs text-gray-300 dark:text-gray-600 space-y-1 pb-4">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {["Điều khoản", "Quyền riêng tư", "Cookies", "Trợ giúp"].map((t) => (
            <span key={t} className="hover:text-gray-500 dark:hover:text-gray-400 cursor-pointer transition-colors">{t}</span>
          ))}
        </div>
        <p>© 2024 Threads Clone</p>
      </div>
    </div>
  );
}
