import React, { useState } from "react";
import { MessageSquare, Trash2, Reply, Send, ShieldAlert, Sparkles, Volume2, UserCheck } from "lucide-react";
import { CommunityMessage, User } from "../types";

interface CommunityProps {
  currentUser: User | null;
  onLogIn: () => void;
  messages: CommunityMessage[];
  onSendMessage: (text: string, parentId?: string) => void;
  onDeleteMessage: (id: string) => void;
  broadcastAnnouncement: string;
}

export default function Community({
  currentUser,
  onLogIn,
  messages,
  onSendMessage,
  onDeleteMessage,
  broadcastAnnouncement
}: CommunityProps) {
  const [chatInput, setChatInput] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyInput, setReplyInput] = useState("");

  const handleSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!chatInput.trim()) return;

    onSendMessage(chatInput.trim());
    setChatInput("");
  };

  const handleSubmitReply = (parentId: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!replyInput.trim()) return;

    onSendMessage(replyInput.trim(), parentId);
    setReplyInput("");
    setReplyToId(null);
  };

  const rootMessages = messages.filter((m) => !m.parentId);

  return (
    <div id="community_discussion_board" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      
      {/* 1. Admin Broadcast Announcement Banner */}
      {broadcastAnnouncement && (
        <div id="admin_sticky_announcement" className="mb-6 rounded-2xl border-l-4 border-red-700 bg-red-50 p-5 shadow-xs relative overflow-hidden text-left">
          <div className="absolute top-0 right-0 h-24 w-24 bg-red-100 rounded-full blur-xl opacity-55 pointer-events-none" />
          <div className="flex items-center space-x-2 text-xs font-mono font-extrabold text-red-800 uppercase tracking-widest mb-1.5">
            <ShieldAlert className="h-4.5 w-4.5 text-red-700" />
            <span>CRITICAL ADMIN BROADCAST ANNOUNCEMENT</span>
          </div>
          <p className="text-xs text-neutral-800 leading-relaxed font-medium">
            "{broadcastAnnouncement}"
          </p>
          <div className="text-[9px] text-stone-400 font-mono mt-2 uppercase">Signed by Kelvin Opara Wafula, General Overseer</div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Chat Feed */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-bold text-stone-900">Community Discourse Boards</h3>
                <p className="text-[10px] text-stone-400 font-mono">Discuss literature, and lessons in real time</p>
              </div>
              <span className="rounded-full bg-red-50 text-red-850 font-bold px-3 py-1 text-[10px] uppercase font-mono tracking-wider">
                {messages.length} Posts Active
              </span>
            </div>

            {/* Chats flow */}
            <div className="h-[400px] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {rootMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center h-full text-stone-400">
                  <span className="text-3xl mb-1">🕊️</span>
                  <p className="text-xs font-bold text-neutral-850">Be the First to Spark Conversation!</p>
                  <p className="text-[11px] max-w-xs mt-1">Discuss insights or ask questions directly to Kelvin Opara Wafula here.</p>
                </div>
              ) : (
                rootMessages.map((m) => {
                  const repliesList = messages.filter((rep) => rep.parentId === m.id);
                  const canDelete = currentUser && (currentUser.role === "admin" || currentUser.email === m.userId);

                  return (
                    <div key={m.id} className="rounded-xl border border-stone-150 bg-[#fefefe] p-4 text-left space-y-3 shadow-xs">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2">
                          <span className="h-8 w-8 rounded-full bg-stone-900 border text-white font-bold flex items-center justify-center text-xs">
                            {m.userName.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-stone-850 text-xs">{m.userName}</span>
                              {m.role === "admin" && (
                                <span className="rounded bg-red-700 text-white font-mono text-[9px] font-bold px-1 py-0.2 select-none uppercase">Admin</span>
                              )}
                            </div>
                            <span className="text-[9px] text-stone-400 font-mono">{m.date}</span>
                          </div>
                        </div>

                        {canDelete && (
                          <button
                            onClick={() => onDeleteMessage(m.id)}
                            className="text-stone-305 hover:text-red-700 transition"
                            title="Remove your message"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-stone-750 text-xs leading-relaxed pl-1">
                        {m.text}
                      </p>

                      {/* Display nested replies */}
                      {repliesList.length > 0 && (
                        <div className="border-l-2 border-red-500/20 pl-4 space-y-3 mt-3 ml-2 bg-stone-50/80 p-3 rounded-r-lg">
                          {repliesList.map((reply) => {
                            const canDeleteReply = currentUser && (currentUser.role === "admin" || currentUser.email === reply.userId);

                            return (
                              <div key={reply.id} className="space-y-1 relative">
                                <div className="flex justify-between items-center text-[10px]">
                                  <div className="flex items-center space-x-1">
                                    <span className="font-bold text-stone-700">{reply.userName}</span>
                                    {reply.role === "admin" && (
                                      <span className="rounded bg-red-700 text-white text-[8px] px-1">Admin</span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2 text-[9px] text-stone-400 font-mono">
                                    <span>{reply.date}</span>
                                    {canDeleteReply && (
                                      <button
                                        onClick={() => onDeleteMessage(reply.id)}
                                        className="text-stone-400 hover:text-red-700 font-bold ml-1"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-stone-600 text-xs italic">"{reply.text}"</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Reply prompt */}
                      {replyToId === m.id ? (
                        <div className="flex gap-2 pt-2 items-center">
                          <input
                            type="text"
                            required
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            placeholder="Write an instant reply..."
                            className="flex-1 rounded border text-xs p-2.5 bg-neutral-50"
                          />
                          <button
                            onClick={() => handleSubmitReply(m.id)}
                            className="rounded bg-stone-900 text-white px-3 py-2 text-xs font-bold hover:bg-stone-955"
                          >
                            Post
                          </button>
                          <button
                            onClick={() => setReplyToId(null)}
                            className="text-xs text-stone-400 font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyToId(m.id)}
                          className="flex items-center space-x-1 text-[10px] font-bold text-red-700 hover:underline block pt-1.5"
                        >
                          <Reply className="h-3 w-3" />
                          <span>Reply directly to this post</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Direct primary query submission */}
            <form onSubmit={handleSubmitMessage} className="mt-4 flex gap-2">
              <input
                type="text"
                required
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Share your breakthrough, study testimony, or seek guidance..."
                className="flex-1 rounded-xl border border-stone-200 bg-neutral-50 px-4 py-3 text-xs outline-none focus:bg-white focus:border-red-750"
              />
              <button
                type="submit"
                className="rounded-xl bg-red-700 text-white font-bold hover:bg-red-800 px-4 transition active:scale-95"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Community sidebar highlights */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs text-xs space-y-4 text-left">
            <h4 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
              <UserCheck className="h-4.5 w-4.5 text-red-700" />
              <span>Leadership Ethics</span>
            </h4>

            <p className="text-[11px] leading-relaxed text-stone-500">
              The community space is strictly dedicated to constructive dialogue. In keeping with Bungoma Kenya community objectives:
            </p>

            <ul className="space-y-2 text-[11px] text-stone-600 font-medium list-disc list-inside">
              <li>Keep posts centered on books or leadership study.</li>
              <li>Encourage authors with reviews of their work.</li>
              <li>Admin maintains full capability to wipe non-conforming messages.</li>
            </ul>

            <div className="border-t border-stone-100 pt-3 flex items-center justify-between">
              <span className="font-mono text-[9px] text-stone-400">Verifiably encrypted offline</span>
              <span className="text-red-700 font-bold text-[10px]">Learn More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
