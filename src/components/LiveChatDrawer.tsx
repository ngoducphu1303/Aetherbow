import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, Shield, Sparkles, Users, X } from 'lucide-react';
import type { AiLiveChatChannel, AiLiveChatMessage } from '../types/game';
import { liveAiSocket, type LiveSocketStatus } from '../services/liveAiSocket';

interface LiveChatDrawerProps {
  isOpen: boolean;
  initialChannel?: AiLiveChatChannel;
  playerDisplayName: string;
  guildName?: string | null;
  onInspectAiPlayer?: (aiPlayerId: string) => void;
  onClose: () => void;
}

const QUICK_CHAT_LINES: Record<AiLiveChatChannel, string[]> = {
  lobby: [
    'Ai đi Co-op Raid Boss Tinh Giới không?',
    'Vừa né hoàn hảo Boss Tuần, mọi người thử chưa?',
    'Đấu giá có món Thần Thoại ngon quá!',
    'Chào cả sảnh, ai rảnh giao hữu Arena 1v1 không?',
  ],
  guild: [
    'Cả bang gom sát thương Boss Bang hôm nay nhé!',
    'Ai cần tổ đội Co-op cày mảnh Sử Thi hú mình!',
    'Nhớ điểm danh nhận Xu Bang nha anh em!',
    'Tối nay đua Top Chiến Trường Bang cùng nhau!',
  ],
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const LiveChatDrawer: React.FC<LiveChatDrawerProps> = ({
  isOpen,
  initialChannel = 'lobby',
  playerDisplayName,
  guildName,
  onInspectAiPlayer,
  onClose,
}) => {
  const [channel, setChannel] = useState<AiLiveChatChannel>(initialChannel);
  const [messagesByChannel, setMessagesByChannel] = useState<{
    lobby: AiLiveChatMessage[];
    guild: AiLiveChatMessage[];
  }>(() => liveAiSocket.getChatMessages());
  const [socketStatus, setSocketStatus] = useState<LiveSocketStatus>(() => liveAiSocket.getStatus());
  const [draft, setDraft] = useState('');
  const [cooldownHint, setCooldownHint] = useState<string | null>(null);
  const lastSendAtRef = useRef<number>(0);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setChannel(initialChannel);
  }, [initialChannel]);

  useEffect(() => {
    if (!isOpen) return;
    liveAiSocket.ensureConnected(playerDisplayName);
    const unsubChat = liveAiSocket.subscribeChat((next) => {
      setMessagesByChannel(next);
    });
    const unsubSnap = liveAiSocket.subscribeSnapshot((_snap, st) => {
      setSocketStatus(st);
    });
    return () => {
      unsubChat();
      unsubSnap();
    };
  }, [isOpen, playerDisplayName]);

  const activeMessages = useMemo(
    () => (channel === 'guild' ? messagesByChannel.guild : messagesByChannel.lobby),
    [channel, messagesByChannel]
  );

  useEffect(() => {
    if (!isOpen) return;
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeMessages.length, channel, isOpen]);

  if (!isOpen) return null;

  const handleSend = (rawText: string) => {
    const clean = rawText.replace(/\s+/g, ' ').trim();
    if (!clean) return;
    const now = Date.now();
    if (now - lastSendAtRef.current < 1200) {
      setCooldownHint('Vui lòng đợi 1 giây trước khi gửi tin tiếp theo.');
      return;
    }
    setCooldownHint(null);
    const ok = liveAiSocket.sendChatMessage(channel, clean, playerDisplayName);
    if (ok) {
      lastSendAtRef.current = now;
      setDraft('');
    } else {
      setCooldownHint('Đang kết nối lại máy chủ trò chuyện trực tiếp…');
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-end bg-[#040611]/78 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:w-[440px] h-[82vh] sm:h-[640px] bg-[#070d20] border border-amber-400/35 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-amber-400/20 bg-[#0b132b] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <MessageSquare className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="truncate">Kênh Trò Chuyện Trực Tuyến</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mt-0.5">
              <span
                className={`size-1.5 rounded-full shrink-0 ${
                  socketStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>
                {socketStatus === 'connected'
                  ? 'Kết nối trực tiếp · Người thật & Chiến binh AI Live'
                  : 'Đang đồng bộ kênh trò chuyện…'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng kênh trò chuyện"
            className="a2-slate-btn p-2 rounded-xl cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Channel Switcher */}
        <div className="px-4 py-2.5 border-b border-slate-800/90 bg-[#060a18] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setChannel('lobby')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                channel === 'lobby'
                  ? 'bg-amber-400/20 text-amber-200 border border-amber-400/50'
                  : 'text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kênh Sảnh</span>
            </button>
            <button
              type="button"
              onClick={() => setChannel('guild')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                channel === 'guild'
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50'
                  : 'text-slate-300 hover:text-white border border-transparent'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{guildName ? `Bang · ${guildName}` : 'Kênh Bang Hội'}</span>
            </button>
          </div>
          <span className="text-[10px] font-mono-nums tabular-nums text-slate-400">
            {activeMessages.length} tin gần nhất
          </span>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {activeMessages.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa có tin nhắn nào trong kênh này. Hãy gửi lời chào đầu tiên!
            </div>
          ) : (
            activeMessages.map((msg) => {
              const isAiLive = msg.senderTag === '[AI Live]';
              const isMe = !isAiLive && msg.senderName === playerDisplayName;
              return (
                <div
                  key={msg.id}
                  className={`rounded-2xl px-3 py-2.5 border text-xs ${
                    isMe
                      ? 'bg-amber-400/10 border-amber-400/35'
                      : isAiLive
                      ? 'bg-[#0b132b] border-sky-400/20'
                      : 'bg-[#0c162e] border-emerald-400/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isAiLive && msg.aiPlayerId && onInspectAiPlayer ? (
                        <button
                          type="button"
                          onClick={() => onInspectAiPlayer(msg.aiPlayerId!)}
                          className="font-bold text-sky-200 hover:text-amber-300 underline decoration-sky-400/40 underline-offset-2 truncate cursor-pointer"
                          title="Xem hồ sơ Build & Thách đấu chiến binh AI Live"
                        >
                          {msg.senderName}
                        </button>
                      ) : (
                        <span className={`font-bold truncate ${isMe ? 'text-amber-200' : 'text-emerald-200'}`}>
                          {msg.senderName}
                          {isMe ? ' (Bạn)' : ''}
                        </span>
                      )}
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span
                        className={`text-[10px] font-bold shrink-0 ${
                          isAiLive ? 'text-sky-300' : 'text-emerald-300'
                        }`}
                      >
                        {msg.senderTag}
                      </span>
                    </div>
                    <span className="font-mono-nums tabular-nums text-[10px] text-slate-400 shrink-0">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed break-words">{msg.text}</p>
                </div>
              );
            })
          )}
          <div ref={listEndRef} />
        </div>

        {/* Quick Chat Suggestions */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-[#060a18] flex items-center gap-1.5 overflow-x-auto">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          {QUICK_CHAT_LINES[channel].map((line) => (
            <button
              key={line}
              type="button"
              onClick={() => handleSend(line)}
              className="px-2.5 py-1 rounded-lg bg-[#0d1630] border border-slate-700/80 hover:border-amber-300/60 text-[11px] text-slate-200 hover:text-amber-200 whitespace-nowrap cursor-pointer transition-colors"
            >
              {line}
            </button>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(draft);
          }}
          className="p-3.5 border-t border-amber-400/20 bg-[#0b132b] space-y-1.5"
        >
          {cooldownHint && (
            <div className="text-[11px] text-amber-300">{cooldownHint}</div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={180}
              placeholder={
                channel === 'guild'
                  ? 'Nhắn tin cho Bang Hội (AI Live sẽ phản hồi)…'
                  : 'Nhắn tin Sảnh Chính (AI Live sẽ trò chuyện)…'
              }
              className="flex-1 rounded-xl bg-[#060a18] border border-slate-700 focus:border-amber-400/70 focus:outline-none px-3 py-2 text-xs text-white placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="a2-yellow-btn px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi</span>
            </button>
          </div>
          <div className="text-[10px] text-slate-400">
            Bấm vào tên bất kỳ chiến binh <span className="text-sky-300 font-bold">[AI Live]</span> nào để xem Build trang bị, Thách đấu 1v1 hoặc chọn làm Đồng Đội Co-op.
          </div>
        </form>
      </div>
    </div>
  );
};
