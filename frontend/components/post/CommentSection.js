"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";

function timeAgo(dateStr) {
  const s = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)}ph`;
  if (s < 86400) return `${Math.floor(s / 3600)}g`;
  return `${Math.floor(s / 86400)}ng`;
}

function UserAvatar({ user, size = "md" }) {
  const cls = size === "sm" ? "w-7 h-7 text-xs" : "w-8 h-8 text-sm";
  return (
    <div className={`${cls} rounded-full overflow-hidden bg-gray-200 flex-shrink-0`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-bold select-none">
          {user?.username?.[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
}

// Component hiển thị 1 comment + form reply
function CommentItem({ comment, postId, onReplyAdded }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim() || posting) return;
    setPosting(true);
    try {
      const data = await fetchAPI(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: replyText.trim(), parentId: comment.id }),
      });
      if (data?.success) {
        onReplyAdded(comment.id, data.data); // Thêm reply vào danh sách
        setReplyText("");
        setShowReply(false);
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="py-3">
      {/* Comment gốc */}
      <div className="flex gap-3">
        <UserAvatar user={comment.user} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm">{comment.user?.username}</span>
            <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-800 mt-0.5 leading-relaxed break-words">{comment.content}</p>
          <button
            onClick={() => setShowReply((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-700 mt-1.5 font-medium transition-colors"
          >
            Trả lời
          </button>

          {/* Form reply */}
          {showReply && (
            <div className="flex gap-2 mt-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Trả lời @${comment.user?.username}...`}
                className="flex-1 text-sm bg-gray-100 rounded-2xl px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 transition-all min-w-0"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
                autoFocus
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim() || posting}
                className="text-sm font-semibold text-black disabled:opacity-30 transition-opacity flex-shrink-0"
              >
                {posting ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : "Gửi"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Replies nested — thụt vào bên phải với đường viền */}
      {comment.replies?.length > 0 && (
        <div className="ml-11 mt-1 pl-3 border-l-2 border-gray-100 space-y-2">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-2.5 pt-2">
              <UserAvatar user={reply.user} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-xs">{reply.user?.username}</span>
                  <span className="text-xs text-gray-400">{timeAgo(reply.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-800 mt-0.5 leading-relaxed break-words">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({ postId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  // Load comments khi component mount
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAPI(`/posts/${postId}/comments`);
        if (data?.success) setComments(data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  const handleAddComment = async () => {
    if (!newComment.trim() || posting) return;
    setPosting(true);
    try {
      const data = await fetchAPI(`/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (data?.success) {
        // Thêm comment mới vào cuối danh sách kèm replies rỗng
        setComments((prev) => [...prev, { ...data.data, replies: [] }]);
        setNewComment("");
      }
    } finally {
      setPosting(false);
    }
  };

  // Thêm reply vào đúng comment cha
  const handleReplyAdded = (parentId, reply) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c
      )
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-sm text-gray-700">
          Bình luận{comments.length > 0 ? ` (${comments.length})` : ""}
        </h3>
      </div>

      {/* Form thêm comment mới */}
      {currentUser && (
        <div className="px-4 py-3 border-b border-gray-100 flex gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-400 to-fuchsia-400 flex items-center justify-center text-white text-xs font-bold">
                {currentUser.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Thêm bình luận..."
              className="flex-1 text-sm bg-gray-100 rounded-2xl px-4 py-2 outline-none focus:ring-2 focus:ring-black/10 transition-all min-w-0"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || posting}
              className="text-sm font-semibold text-black disabled:opacity-30 transition-opacity flex-shrink-0"
            >
              Gửi
            </button>
          </div>
        </div>
      )}

      {/* Danh sách comments */}
      <div className="px-4">
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="py-14 text-center text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-3 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Chưa có bình luận</p>
            <p className="text-xs mt-1">Hãy là người đầu tiên bình luận!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onReplyAdded={handleReplyAdded}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
