"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { getSocket } from "@/lib/socket";
import { getAccessToken } from "@/lib/auth";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// EmojiPicker truy cập window khi mount → tải động phía client để tránh lỗi SSR
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

// Props:
//   onSend(content, mediaUrl, mediaType): callback khi gửi
//   conversationId: string
//   disabled: boolean
const STOP_TYPING_DELAY = 2000; // ms
const MIN_RECORD_MS = 800; // bỏ qua bản ghi quá ngắn (lỡ tay bấm)
const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 50;

function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MessageInput({
    onSend,
    conversationId,
    disabled = false,
}) {
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);
    const [showEmoji, setShowEmoji] = useState(false);

    // Media đính kèm (ảnh hoặc video)
    const [attachPreview, setAttachPreview] = useState(null); // blob: (đang upload) hoặc URL cloud
    const [attachUrl, setAttachUrl] = useState(null); // URL cloud sau khi upload xong
    const [attachType, setAttachType] = useState(null); // "image" | "video"
    const [uploadingAttach, setUploadingAttach] = useState(false);
    const [attachError, setAttachError] = useState("");
    const [sendError, setSendError] = useState(""); // lỗi khi gửi (vd 403 giới hạn nhắn tin)

    // Ghi âm
    const [recording, setRecording] = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [willCancel, setWillCancel] = useState(false); // trượt tới nút hủy

    const { isDark } = useTheme();
    const { t } = useLanguage();

    const textareaRef = useRef(null);
    const fileRef = useRef(null);
    const emojiRef = useRef(null);
    const cancelBtnRef = useRef(null);

    const stopTypingTimerRef = useRef(null);
    const isTypingRef = useRef(false); // track trạng thái typing đã emit chưa

    // Refs cho MediaRecorder
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const streamRef = useRef(null);
    const recordTimerRef = useRef(null);
    const recordStartRef = useRef(0);
    const recordingRef = useRef(false); // trạng thái thực (đồng bộ, dùng trong async)
    const cancelRecordingRef = useRef(false);
    const willCancelRef = useRef(false);
    const pendingStopRef = useRef(null); // nếu thả nút trước khi getUserMedia xong

    // Tự resize textarea khi nội dung thay đổi
    const resizeTextarea = () => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = "24px";
        ta.style.height = `${ta.scrollHeight}px`;
        if (ta.scrollHeight > 120) {
            ta.style.height = "120px";
            ta.style.overflowY = "auto";
        } else {
            ta.style.overflowY = "hidden";
        }
    };

    const emitTyping = () => {
        const socket = getSocket();
        if (!socket || !conversationId) return;

        // Chỉ emit "typing" khi chưa emit (tránh spam)
        if (!isTypingRef.current) {
            socket.emit("typing", { conversationId });
            isTypingRef.current = true;
        }

        // Reset timer: sau 2s ngừng gõ thì emit "stop_typing"
        clearTimeout(stopTypingTimerRef.current);
        stopTypingTimerRef.current = setTimeout(() => {
            socket.emit("stop_typing", { conversationId });
            isTypingRef.current = false;
        }, STOP_TYPING_DELAY);
    };

    const handleChange = (e) => {
        setContent(e.target.value);
        if (sendError) setSendError(""); // gõ lại → xóa thông báo lỗi cũ
        if (e.target.value.trim()) emitTyping();
    };

    // Resize sau mỗi lần content thay đổi (sau render)
    useEffect(() => {
        resizeTextarea();
    }, [content]);

    // Đóng emoji picker khi click ra ngoài
    useEffect(() => {
        if (!showEmoji) return;
        const handler = (e) => {
            if (emojiRef.current && !emojiRef.current.contains(e.target)) {
                setShowEmoji(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showEmoji]);

    // Cleanup khi unmount
    useEffect(() => {
        return () => {
            clearTimeout(stopTypingTimerRef.current);
            clearInterval(recordTimerRef.current);
            streamRef.current?.getTracks().forEach((tr) => tr.stop());
            if (attachPreview && attachPreview.startsWith("blob:")) {
                URL.revokeObjectURL(attachPreview);
            }
            const socket = getSocket();
            if (socket && isTypingRef.current && conversationId) {
                socket.emit("stop_typing", { conversationId });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    // ========================
    // EMOJI
    // ========================
    const insertEmoji = (emoji) => {
        const ta = textareaRef.current;
        if (!ta) {
            setContent((p) => p + emoji);
            return;
        }
        const start = ta.selectionStart ?? content.length;
        const end = ta.selectionEnd ?? content.length;
        setContent(content.slice(0, start) + emoji + content.slice(end));
        // Khôi phục con trỏ ngay sau emoji vừa chèn (sau khi React re-render)
        setTimeout(() => {
            ta.focus();
            const pos = start + emoji.length;
            ta.setSelectionRange(pos, pos);
        }, 0);
    };

    // ========================
    // MEDIA ĐÍNH KÈM (ảnh / video)
    // ========================
    const clearAttach = () => {
        if (attachPreview && attachPreview.startsWith("blob:")) {
            URL.revokeObjectURL(attachPreview);
        }
        setAttachPreview(null);
        setAttachUrl(null);
        setAttachType(null);
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // reset để chọn lại cùng 1 file được
        if (!file) return;

        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        if (!isImage && !isVideo) {
            setAttachError("Chỉ hỗ trợ ảnh hoặc video");
            return;
        }

        // Kiểm tra dung lượng trước khi upload (khớp giới hạn backend)
        const maxMb = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
        if (file.size > maxMb * 1024 * 1024) {
            setAttachError(`${isVideo ? "Video" : "Ảnh"} tối đa ${maxMb}MB`);
            return;
        }
        setAttachError("");

        const type = isVideo ? "video" : "image";
        if (attachPreview && attachPreview.startsWith("blob:")) {
            URL.revokeObjectURL(attachPreview);
        }
        setAttachPreview(URL.createObjectURL(file));
        setAttachType(type);
        setAttachUrl(null);
        setUploadingAttach(true);
        try {
            const endpoint = isVideo
                ? "/media/upload-video"
                : "/media/upload-image";
            const field = isVideo ? "video" : "image";
            const form = new FormData();
            form.append(field, file);
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getAccessToken()}` },
                body: form,
            });
            const data = await res.json();
            if (data?.success) {
                setAttachUrl(data.data.url);
            } else {
                setAttachError(data?.message || "Tải lên thất bại");
                clearAttach();
            }
        } catch {
            setAttachError("Lỗi tải lên, vui lòng thử lại");
            clearAttach();
        } finally {
            setUploadingAttach(false);
        }
    };

    // ========================
    // GỬI TIN (text + ảnh/video)
    // ========================
    const hasText = content.trim().length > 0;
    const hasAttach = !!attachPreview;
    const showSend = hasText || hasAttach;
    const canSend =
        (hasText || attachUrl) && !uploadingAttach && !sending && !disabled;

    const handleSend = async () => {
        if (!canSend) return;

        // Dừng typing indicator ngay khi gửi
        clearTimeout(stopTypingTimerRef.current);
        const socket = getSocket();
        if (socket && isTypingRef.current) {
            socket.emit("stop_typing", { conversationId });
            isTypingRef.current = false;
        }

        setSending(true);
        const sentContent = content.trim();
        const sentMediaUrl = attachUrl;
        const sentMediaType = attachUrl ? attachType : null;
        setContent(""); // Reset ngay (optimistic)
        clearAttach();
        setAttachError("");
        setSendError("");
        setShowEmoji(false);
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        try {
            await onSend(sentContent, sentMediaUrl, sentMediaType);
        } catch (err) {
            // Nếu lỗi → khôi phục nội dung + media (dùng URL cloud đã upload)
            setContent(sentContent);
            if (sentMediaUrl) {
                setAttachUrl(sentMediaUrl);
                setAttachPreview(sentMediaUrl);
                setAttachType(sentMediaType);
            }
            // Hiện thông báo: 403 (giới hạn nhắn tin) dùng message từ server,
            // lỗi mạng/khác dùng thông báo chung — không mất nội dung đã gõ
            setSendError(
                err?.status ? err.message || t("messages.failed") : t("messages.failed")
            );
        } finally {
            setSending(false);
            textareaRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        // Enter gửi, Shift+Enter xuống dòng
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ========================
    // TIN NHẮN THOẠI (giữ để ghi, thả để gửi, trượt tới nút hủy để hủy)
    // ========================
    const uploadAndSendVoice = async (blob) => {
        setUploadingAudio(true);
        try {
            const file = new File([blob], `voice_${Date.now()}.webm`, {
                type: "audio/webm",
            });
            const form = new FormData();
            form.append("video", file); // dùng lại endpoint video (Cloudinary nhận audio/webm)
            const res = await fetch(`${API_BASE}/media/upload-video`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getAccessToken()}` },
                body: form,
            });
            const data = await res.json();
            if (data?.success) await onSend("", data.data.url, "audio");
        } catch {
            // Bỏ qua lỗi upload thoại
        } finally {
            setUploadingAudio(false);
        }
    };

    const startRecording = async () => {
        if (recordingRef.current || uploadingAudio || disabled) return;
        pendingStopRef.current = null;
        cancelRecordingRef.current = false;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            streamRef.current = stream;

            const mime =
                typeof MediaRecorder !== "undefined" &&
                MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "";
            const mr = mime
                ? new MediaRecorder(stream, { mimeType: mime })
                : new MediaRecorder(stream);
            chunksRef.current = [];

            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };
            mr.onstop = () => {
                streamRef.current?.getTracks().forEach((tr) => tr.stop());
                streamRef.current = null;
                const duration = Date.now() - recordStartRef.current;
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                if (
                    !cancelRecordingRef.current &&
                    blob.size > 0 &&
                    duration >= MIN_RECORD_MS
                ) {
                    uploadAndSendVoice(blob);
                }
            };

            mediaRecorderRef.current = mr;
            recordStartRef.current = Date.now();
            mr.start();
            recordingRef.current = true;
            setRecording(true);
            setRecordSeconds(0);
            recordTimerRef.current = setInterval(
                () => setRecordSeconds((s) => s + 1),
                1000,
            );

            // Nếu user đã thả nút trong lúc chờ quyền micro → dừng ngay
            if (pendingStopRef.current) {
                const { cancel } = pendingStopRef.current;
                pendingStopRef.current = null;
                stopRecording(cancel);
            }
        } catch {
            toast.error("Không thể truy cập micro. Vui lòng cấp quyền và thử lại.");
        }
    };

    const stopRecording = (cancel) => {
        // Recording chưa kịp bắt đầu (đang chờ quyền) → ghi nhận để dừng sau
        if (!recordingRef.current) {
            pendingStopRef.current = { cancel: !!cancel };
            return;
        }
        recordingRef.current = false;
        cancelRecordingRef.current = !!cancel;
        clearInterval(recordTimerRef.current);
        setRecording(false);
        setWillCancel(false);
        willCancelRef.current = false;
        const mr = mediaRecorderRef.current;
        if (mr && mr.state !== "inactive") mr.stop(); // → kích hoạt onstop
    };

    const handleMicPointerDown = (e) => {
        e.preventDefault();
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
            // bỏ qua nếu trình duyệt không hỗ trợ pointer capture
        }
        startRecording();
    };

    const handleMicPointerMove = (e) => {
        if (!recordingRef.current) return;
        const btn = cancelBtnRef.current;
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        const over =
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom;
        willCancelRef.current = over;
        setWillCancel(over);
    };

    const handleMicPointerUp = (e) => {
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
            // bỏ qua
        }
        stopRecording(willCancelRef.current);
    };

    // ========================
    // RENDER
    // ========================
    // Trạng thái đang ghi âm — thay toàn bộ thanh nhập
    if (recording) {
        return (
            <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3">
                <div className="flex items-center gap-3">
                    {/* Nút hủy — trượt mic tới đây rồi thả để hủy */}
                    <button
                        ref={cancelBtnRef}
                        type="button"
                        onClick={() => stopRecording(true)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            willCancel
                                ? "bg-red-500 text-white scale-110"
                                : "bg-gray-100 dark:bg-gray-800 text-red-500"
                        }`}
                        title="Hủy"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-9 0v14a2 2 0 002 2h6a2 2 0 002-2V6" />
                        </svg>
                    </button>

                    {/* Waveform + timer */}
                    <div className="flex-1 flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 h-10">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                        <div className="flex-1 flex items-center gap-0.5 h-5 overflow-hidden">
                            {[...Array(28)].map((_, i) => (
                                <span
                                    key={i}
                                    className="w-0.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-pulse"
                                    style={{
                                        height: `${6 + ((i * 7) % 14)}px`,
                                        animationDelay: `${(i % 6) * 90}ms`,
                                    }}
                                />
                            ))}
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 tabular-nums flex-shrink-0">
                            {formatDuration(recordSeconds)}
                        </span>
                    </div>

                    {/* Nút mic — thả để gửi */}
                    <button
                        type="button"
                        onPointerUp={handleMicPointerUp}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500 text-white scale-110 transition-transform"
                        title="Thả để gửi"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
                            <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V21a1 1 0 102 0v-3.08A7 7 0 0019 11z" />
                        </svg>
                    </button>
                </div>
                <p className="text-[11px] text-center text-gray-400 dark:text-gray-500 mt-1.5">
                    {willCancel ? "Thả để hủy" : "Trượt tới 🗑 để hủy · Thả để gửi"}
                </p>
            </div>
        );
    }

    return (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-3">
            {/* Preview media đính kèm */}
            {attachPreview && (
                <div className="relative inline-block mb-2">
                    {attachType === "video" ? (
                        <div className="relative">
                            <video
                                src={attachPreview}
                                className="rounded-xl max-h-28 max-w-[160px] object-cover"
                                muted
                                playsInline
                            />
                            {!uploadingAttach && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <img
                            src={attachPreview}
                            alt=""
                            className="rounded-xl max-h-28 max-w-[160px] object-cover"
                        />
                    )}
                    {uploadingAttach && (
                        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            clearAttach();
                            setAttachError("");
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center transition-colors"
                    >
                        <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Lỗi đính kèm */}
            {attachError && (
                <p className="text-xs text-red-500 mb-2">{attachError}</p>
            )}

            {/* Lỗi gửi tin (vd: người nhận giới hạn ai có thể nhắn tin) */}
            {sendError && (
                <p className="text-xs text-red-500 mb-2">{sendError}</p>
            )}

            <div className="flex items-end gap-2">
                {/* Nút emoji + popup */}
                <div className="relative flex-shrink-0" ref={emojiRef}>
                    <button
                        type="button"
                        onClick={() => setShowEmoji((v) => !v)}
                        disabled={disabled}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
                        title="Emoji"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path strokeLinecap="round" d="M8 14s1.5 2 4 2 4-2 4-2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" />
                            <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                    </button>
                    {showEmoji && (
                        <div className="absolute bottom-14 left-0 z-50 shadow-xl rounded-lg">
                            <EmojiPicker
                                onEmojiClick={(d) => insertEmoji(d.emoji)}
                                theme={isDark ? "dark" : "light"}
                                width={300}
                                height={380}
                                lazyLoadEmojis
                                previewConfig={{ showPreview: false }}
                                searchPlaceHolder="Tìm emoji..."
                            />
                        </div>
                    )}
                </div>

                {/* Nút đính kèm ảnh / video */}
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={disabled || uploadingAttach}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
                    title="Đính kèm ảnh / video"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </button>

                {/* Khung nhập */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 flex items-end gap-2 min-h-[40px]">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập tin nhắn..."
                        rows={1}
                        disabled={disabled}
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none leading-relaxed w-full"
                        style={{
                            height: "24px",
                            maxHeight: "120px",
                            overflowY: "hidden",
                        }}
                    />
                </div>

                {/* Nút gửi (khi có nội dung/media) hoặc nút mic (khi trống) */}
                {uploadingAudio ? (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                        <svg className="animate-spin w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                    </div>
                ) : showSend ? (
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!canSend}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed bg-black dark:bg-white text-white dark:text-black"
                    >
                        {sending ? (
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        )}
                    </button>
                ) : (
                    <button
                        type="button"
                        onPointerDown={handleMicPointerDown}
                        onPointerMove={handleMicPointerMove}
                        onPointerUp={handleMicPointerUp}
                        disabled={disabled}
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-30 bg-black dark:bg-white text-white dark:text-black touch-none select-none"
                        title="Giữ để ghi âm"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
                            <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V21a1 1 0 102 0v-3.08A7 7 0 0019 11z" />
                        </svg>
                    </button>
                )}

                {/* Hidden file input — nhận ảnh hoặc video */}
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>
        </div>
    );
}
