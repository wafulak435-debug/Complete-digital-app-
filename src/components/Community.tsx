import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, Trash2, Reply, Send, ShieldAlert, Sparkles, Volume2, 
  Phone, Video, MoreVertical, Search, Paperclip, Smile, CheckCheck, 
  Image, FileText, Music, Mic, ChevronRight, ChevronLeft, Check, X, Shield, BookOpen,
  Megaphone, Pin, AlertCircle, Sparkle, Loader, Edit3
} from "lucide-react";
import { CommunityMessage, User } from "../types";

interface CommunityProps {
  currentUser: User | null;
  onLogIn: () => void;
  messages: CommunityMessage[];
  onSendMessage: (text: string, parentId?: string, channelName?: '#General' | '#Book Talks' | '#Leadership' | '#Publishing', extras?: any) => void;
  onDeleteMessage: (id: string) => void;
  onEditMessage?: (id: string, text: string) => void;
  broadcastAnnouncement: string;
  onUpdateBroadcastAnnouncement?: (msg: string) => void;
  isLoading?: boolean;
}

type ChannelType = '#General' | '#Book Talks' | '#Leadership' | '#Publishing';

const AVAILABLE_CHANNELS: { id: ChannelType; name: string; desc: string; icon: string }[] = [
  { id: '#General', name: "General Leadership Forum", desc: "A vibrant space with over 200,500 global participants discussing core concepts", icon: "🌐" },
  { id: '#Book Talks', name: "Book Club & Summaries", desc: "Peer reviews and structural analysis of digital books uploaded into Wafula Ledger", icon: "📚" },
  { id: '#Leadership', name: "Leadership School Cohort", desc: "Active academic cohorts testing, lessons, and seeking study problem solves", icon: "🎓" },
  { id: '#Publishing', name: "eBook Publishing machine", desc: "Coordinating draft chapters, translations, and custom PDF builds", icon: "✍️" }
];

interface AnnouncementNotice {
  id: string;
  text: string;
  date: string;
  author: string;
}

const QUICK_EMOJIS = ["😄", "😭", "😍", "👍", "🙏", "🔥", "🎉", "📚", "🎓", "🌟", "💡", "🌍", "🤝", "🦁"];

const STUDY_STICKERS = [
  { emoji: "🎓", label: "Super Grad!" },
  { emoji: "📚", label: "Hard Study!" },
  { emoji: "🦁", label: "Kenya Pride!" },
  { emoji: "🔥", label: "Brilliant!" },
  { emoji: "💡", label: "Aha! Idea" },
  { emoji: "🏆", label: "Champion" },
  { emoji: "🙌", label: "Respect!" },
  { emoji: "🤝", label: "Solid Support" },
  { emoji: "⭐", label: "Super Star" },
  { emoji: "🌱", label: "Keep Growing" }
];

export default function Community({
  currentUser,
  onLogIn,
  messages,
  onSendMessage,
  onDeleteMessage,
  onEditMessage,
  broadcastAnnouncement,
  onUpdateBroadcastAnnouncement,
  isLoading = false
}: CommunityProps) {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('#General');
  const [chatInput, setChatInput] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<CommunityMessage | null>(null);
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);

  // Editing state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Emojis/Stickers state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Hidden native browser file input references
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Real attachment state
  const [realAttachedFile, setRealAttachedFile] = useState<{
    name: string;
    type: 'photo' | 'doc';
    dataUrl: string;
    sizeStr: string;
  } | null>(null);

  // Custom announcements list state (stored in local storage)
  const [announcements, setAnnouncements] = useState<AnnouncementNotice[]>(() => {
    const saved = localStorage.getItem("WAFULA_ANNOUNCEMENTS_LIST");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        // Safe fallback
      }
    }
    return [
      {
        id: "announce_1",
        text: "Welcome to the 2026 Academic Cohort! Access study lectures, peer uploads, and books in Wafula Reads safely.",
        date: "2026-05-24",
        author: "Kelvin Opara Wafula"
      },
      {
        id: "announce_2",
        text: "Zero-Charge Guarantee: Do not pay anyone cash for virtual registration. Core learning lectures are 100% free globally.",
        date: "2026-05-23",
        author: "Executive Admin Team"
      },
      {
        id: "announce_3",
        text: "Diplomas Open: Complete your Leadership Placement Exam under the Academic School tab and claim your certified PDF credentials.",
        date: "2026-05-22",
        author: "Kelvin Opara Wafula"
      }
    ];
  });

  const [announcementInput, setAnnouncementInput] = useState("");
  const [showAnnouncementMaker, setShowAnnouncementMaker] = useState(false);
  const [isNoticesExpanded, setIsNoticesExpanded] = useState(true);

  // Sync announcements to localStorage
  useEffect(() => {
    localStorage.setItem("WAFULA_ANNOUNCEMENTS_LIST", JSON.stringify(announcements));
  }, [announcements]);

  // Hook into the external announcement to sync
  useEffect(() => {
    if (broadcastAnnouncement && !announcements.some(a => a.text === broadcastAnnouncement)) {
      const next: AnnouncementNotice = {
        id: "announce_sync_" + Date.now(),
        text: broadcastAnnouncement,
        date: new Date().toISOString().split("T")[0],
        author: "Chancellor Kelvin"
      };
      setAnnouncements(prev => [next, ...prev.filter(x => !x.id.startsWith("announce_sync_"))]);
    }
  }, [broadcastAnnouncement]);

  // Attachments state
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [simulatedAttachment, setSimulatedAttachment] = useState<{ type: string; name: string } | null>(null);
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const recordingInterval = useRef<any>(null);

  // Scroll to bottom helper
  const chatFeedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messages, activeChannel, showSidebarMobile]);

  // Voice recording simulation
  const startRecording = () => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    setIsRecording(true);
    setRecordTimer(0);
    recordingInterval.current = setInterval(() => {
      setRecordTimer((prev) => prev + 1);
    }, 1000);
  };

  const stopRecordingAndSend = () => {
    clearInterval(recordingInterval.current);
    setIsRecording(false);
    
    const formattedTime = `${Math.floor(recordTimer / 60)}:${(recordTimer % 60).toString().padStart(2, '0')}`;
    const textToSend = `🎤 Simulated Voice Note (${formattedTime}) • Press play to listen.`;
    
    onSendMessage(textToSend, replyToMessage?.id, activeChannel);
    setRecordTimer(0);
  };

  const cancelRecording = () => {
    clearInterval(recordingInterval.current);
    setIsRecording(false);
    setRecordTimer(0);
  };

  // File system upload selector
  const handleRealFileClick = (inputRef: React.RefObject<HTMLInputElement>) => {
    inputRef.current?.click();
    setIsAttachmentOpen(false);
  };

  const handleNativeFileSelected = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'photo' | 'doc') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    const reader = new FileReader();
    reader.onload = () => {
      setRealAttachedFile({
        name: file.name,
        type: fileType,
        dataUrl: reader.result as string,
        sizeStr
      });
      // Clear legacy mocks
      setSimulatedAttachment(null);
    };
    reader.readAsDataURL(file);
  };

  // Submit Message
  const handleSubmitMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    
    if (!chatInput.trim() && !realAttachedFile && !simulatedAttachment) return;

    let extras: any = {};
    let textToSend = chatInput.trim();

    if (realAttachedFile) {
      if (realAttachedFile.type === 'photo') {
        extras = {
          imageContent: realAttachedFile.dataUrl
        };
        textToSend = textToSend || "Shared a workspace image";
      } else {
        extras = {
          attachedFile: {
            name: realAttachedFile.name,
            type: realAttachedFile.type,
            dataUrl: realAttachedFile.dataUrl,
            sizeStr: realAttachedFile.sizeStr
          }
        };
        textToSend = textToSend || `Shared file: ${realAttachedFile.name}`;
      }
      setRealAttachedFile(null);
    } else if (simulatedAttachment) {
      extras = {
        attachedFile: {
          name: simulatedAttachment.name,
          type: simulatedAttachment.type,
          sizeStr: "1.5 MB",
          url: "#"
        }
      };
      textToSend = textToSend || `Attached legacy ${simulatedAttachment.type}`;
      setSimulatedAttachment(null);
    }

    onSendMessage(textToSend, replyToMessage?.id, activeChannel, extras);
    
    setChatInput("");
    setReplyToMessage(null);
    setShowEmojiPicker(false);
    setShowStickerPicker(false);
  };

  // Submit Sticker message
  const handleSendStickerMsg = (stickerEmoji: string, label: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    const extras = { stickerEmoji };
    onSendMessage(label, replyToMessage?.id, activeChannel, extras);
    setReplyToMessage(null);
    setShowStickerPicker(false);
    setShowEmojiPicker(false);
  };

  // Post dynamic admin announcement notice
  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementInput.trim()) return;

    const freshNotice: AnnouncementNotice = {
      id: "announce_" + Date.now(),
      text: announcementInput.trim(),
      date: new Date().toISOString().split("T")[0],
      author: currentUser?.name || "Administrator"
    };

    setAnnouncements((prev) => [freshNotice, ...prev]);
    
    if (onUpdateBroadcastAnnouncement) {
      onUpdateBroadcastAnnouncement(announcementInput.trim());
    }
    
    setAnnouncementInput("");
    setShowAnnouncementMaker(false);
  };

  const handleDeleteAnnouncement = (id: string, text: string) => {
    const confirmation = window.confirm(`Permanently purge announcement notice?\n"${text.substring(0, 45)}..."`);
    if (!confirmation) return;

    setAnnouncements((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePruneOutdatedNotices = () => {
    const currentTime = new Date().getTime();
    const outdated = announcements.filter((item) => {
      try {
        const noticeTime = new Date(item.date).getTime();
        return (currentTime - noticeTime) > 24 * 60 * 60 * 1000;
      } catch (e) {
        return false;
      }
    });

    if (outdated.length === 0) {
      alert("No outdated notices found! All active announcements are fresh (under 24 hours old).");
      return;
    }

    const confirmation = window.confirm(`Found ${outdated.length} outdated announcement(s) older than 24 hours. Would you like to permanently prune/delete them?`);
    if (!confirmation) return;

    setAnnouncements((prev) => prev.filter((item) => {
      try {
        const noticeTime = new Date(item.date).getTime();
        return (currentTime - noticeTime) <= 24 * 60 * 60 * 1000;
      } catch (e) {
        return true; // Keep invalid formats
      }
    }));
    alert(`Successfully pruned ${outdated.length} outdated notice(s).`);
  };

  const triggerLanguageQuizHelp = (topic: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    setChatInput(topic);
  };

  const handleAttachMockFile = (type: 'photo' | 'video' | 'doc' | 'song') => {
    setIsAttachmentOpen(false);
    const mockNames = {
      photo: "Bungoma_Graduation_Ceremony.jpg",
      video: "Leadership_Masterclass_Clip.mp4",
      doc: "eBook_Executive_Summaries.pdf",
      song: "Inspiring_African_Leadership_Anthem.mp3"
    };
    setSimulatedAttachment({
      type,
      name: mockNames[type]
    });
    setRealAttachedFile(null);
  };

  // Filter messages based on active channel and search query
  const filteredMessages = messages.filter((m) => {
    const isChannelMatch = m.channel === activeChannel;
    const isSearchMatch = m.text.toLowerCase().includes(messageSearchQuery.toLowerCase()) || 
                          m.userName.toLowerCase().includes(messageSearchQuery.toLowerCase());
    return isChannelMatch && isSearchMatch;
  });

  // Root level messages in this channel
  const rootMessages = filteredMessages.filter((m) => !m.parentId);

  const isAdmin = currentUser && (
    currentUser.role === 'admin' || 
    currentUser.email === 'wafulak435@gmail.com' || 
    currentUser.email === 'wafula435@gmail.com'
  );

  return (
    <div id="whatsapp_community_clone" className="w-full h-[calc(100vh-5rem)] flex flex-col p-1 sm:p-2">
      
      {/* Hidden system files selectors */}
      <input 
        type="file" 
        accept="image/*" 
        ref={photoInputRef}
        className="hidden" 
        onChange={(e) => handleNativeFileSelected(e, 'photo')} 
      />
      <input 
        type="file" 
        accept=".pdf,.doc,.docx,.txt" 
        ref={docInputRef}
        className="hidden" 
        onChange={(e) => handleNativeFileSelected(e, 'doc')} 
      />

      {/* 1. Global Admin Announcements Panel Widget */}
      <div className="mb-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 p-2.5 shadow-sm text-left transition duration-300">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-900 pb-1.5 mb-1.5">
          <button 
            onClick={() => setIsNoticesExpanded(!isNoticesExpanded)}
            className="flex items-center space-x-1.5 hover:opacity-80 focus:outline-none text-rose-700 dark:text-rose-400 font-bold"
          >
            <Megaphone className="h-4 w-4 shrink-0 animate-bounce" />
            <span className="text-[11px] uppercase font-mono font-extrabold tracking-wider">📢 Admin Bulletin ({announcements.length})</span>
            <span className="text-[9px] text-stone-400 font-normal">({isNoticesExpanded ? "Collapse" : "Show All"})</span>
          </button>

          <div className="flex items-center space-x-1.5">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handlePruneOutdatedNotices}
                  className="bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 flex items-center space-x-1"
                  title="Prune/delete all announcements older than 24 hours"
                >
                  <Trash2 className="h-2.5 w-2.5 text-rose-650" />
                  <span>Prune</span>
                </button>
                <button
                  onClick={() => setShowAnnouncementMaker(!showAnnouncementMaker)}
                  className="bg-rose-750 hover:bg-rose-800 text-white font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded transition flex items-center space-x-1"
                >
                  <span>{showAnnouncementMaker ? "Cancel" : "✍️ Notice"}</span>
                </button>
              </>
            )}
            <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-[8px] font-mono px-1.5 py-0.5 rounded font-black uppercase">Official</span>
          </div>
        </div>

        {/* New announcement input form */}
        {showAnnouncementMaker && isAdmin && (
          <form onSubmit={handlePostAnnouncement} className="mb-2 p-2 bg-rose-50/50 dark:bg-rose-950/10 rounded-lg border border-rose-100 dark:border-rose-900/60 animate-in slide-in-from-top-2">
            <span className="text-[9px] uppercase font-mono font-extrabold text-rose-900 dark:text-rose-300 block mb-1">Compose New Broadcast Notice</span>
            <div className="flex gap-2">
              <input 
                type="text"
                required
                placeholder="Publish administrative cohort notes..."
                value={announcementInput}
                onChange={(e) => setAnnouncementInput(e.target.value)}
                className="flex-grow text-xs rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-stone-900 px-3 py-1.5 cursor-text focus:outline-none focus:ring-1 focus:ring-rose-700 text-stone-900 dark:text-slate-100"
              />
              <button 
                type="submit" 
                className="bg-rose-700 hover:bg-rose-800 text-white font-mono text-[10px] font-bold px-3 rounded-lg transition"
              >
                Publish
              </button>
            </div>
          </form>
        )}

        {/* Announcements list rendering */}
        {isNoticesExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 max-h-24 overflow-y-auto pr-1">
            {announcements.map((item) => {
              const itemTime = (() => {
                try {
                  return new Date(item.date).getTime();
                } catch {
                  return 0;
                }
              })();
              const isNew = Math.abs(new Date().getTime() - itemTime) <= 24 * 60 * 60 * 1000;
              return (
                <div 
                  key={item.id} 
                  className="bg-stone-50 dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-800 relative flex flex-col justify-between text-left"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1 border-b border-dashed border-stone-200 dark:border-stone-800 pb-0.5">
                      <span className="text-[8.5px] font-extrabold text-[#111] dark:text-slate-350 font-mono flex items-center select-none">
                        <Pin className="h-2.5 w-2.5 mr-0.5 text-rose-600 rotate-45" /> {item.author.split(" ")[0]}
                        {isNew && (
                          <span className="ml-1 bg-rose-600 text-white text-[7px] font-extrabold uppercase px-1 py-0.2 rounded-sm tracking-wide animate-pulse">
                            New
                          </span>
                        )}
                      </span>
                      <span className="text-[7.5px] text-stone-400 font-mono">{item.date}</span>
                    </div>
                    <p className="text-[10px] text-stone-700 dark:text-stone-300 leading-normal font-sans">
                      {item.text}
                    </p>
                  </div>
 
                  {/* Admins can delete any notice */}
                  {isAdmin && (
                    <div className="flex justify-end mt-0.5 pt-0.5 border-t border-stone-100 dark:border-stone-850/40">
                      <button
                        onClick={() => handleDeleteAnnouncement(item.id, item.text)}
                        className="text-[7.5px] text-rose-600 hover:text-rose-800 font-mono font-bold flex items-center space-x-0.5 p-0.5 cursor-pointer"
                        title="Delete global notice"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Main Dual Panel WhatsApp Desk - Fully Responsive for and collapsible */}
      <div className="flex-grow flex rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 overflow-hidden shadow-lg min-h-0">
        
        {/* Left hand channel selection layout */}
        <div className={`w-full md:w-72 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-955 flex flex-col shrink-0 select-none ${showSidebarMobile ? "flex" : "hidden md:flex"}`}>
          {/* Sidebar user container header in WA theme */}
          <div className="p-2.5 bg-emerald-800 dark:bg-emerald-950 text-white flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-left">
              <div className="h-8 w-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs border border-white/20 uppercase select-none">
                {currentUser ? currentUser.name.charAt(0) : "G"}
              </div>
              <div className="truncate max-w-[120px]">
                <h4 className="text-xs font-bold truncate">{currentUser ? currentUser.name : "Guest Scholar"}</h4>
                <p className="text-[9px] text-emerald-200 font-mono tracking-tight">Active Academic Ledger</p>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 text-emerald-100">
              <span className="bg-emerald-700/60 text-[8px] font-mono px-1.5 py-0.5 rounded font-extrabold uppercase">ONLINE</span>
              <MoreVertical className="h-3.5 w-3.5 cursor-pointer" />
            </div>
          </div>

          {/* Search channel/chats input block */}
          <div className="p-2 bg-stone-50 dark:bg-stone-900 border-b border-stone-150 dark:border-stone-800">
            <div className="relative flex items-center bg-white dark:bg-stone-950 rounded-lg px-2 py-1 border border-stone-200 dark:border-stone-800">
              <Search className="h-3 w-3 text-stone-400 mr-1.5 shrink-0" />
              <input 
                type="text" 
                placeholder="Search chats or lessons..."
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none cursor-text text-stone-800 dark:text-stone-100 font-sans"
              />
              {messageSearchQuery && (
                <button onClick={() => setMessageSearchQuery("")} className="text-stone-400 hover:text-stone-600 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Communities & Channels list */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-900">
            <div className="p-2 text-[8px] uppercase font-mono tracking-wider text-stone-400 text-left font-black">
              📚 COHORT GROUP DIRECTORIES
            </div>
            {AVAILABLE_CHANNELS.map((chan) => {
              const isActive = activeChannel === chan.id;
              const channelMsgsCount = messages.filter((m) => m.channel === chan.id).length;
              
              // Find last message snippet
              const channelMsgs = messages.filter((m) => m.channel === chan.id);
              const lastMsg = channelMsgs[channelMsgs.length - 1];
              const lastMsgSnippet = lastMsg ? lastMsg.text : "No messages posted in this channel ledger...";

              return (
                <button
                  key={chan.id}
                  onClick={() => {
                    setActiveChannel(chan.id);
                    setReplyToMessage(null);
                    setShowSidebarMobile(false);
                  }}
                  className={`w-full flex items-start p-2.5 text-left transition ${
                    isActive 
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-emerald-600" 
                      : "hover:bg-stone-50 dark:hover:bg-stone-900"
                  }`}
                >
                  <span className="text-xl mr-2 shrink-0 select-none bg-stone-100 dark:bg-stone-800 h-8 w-8 rounded-full flex items-center justify-center">
                    {chan.icon}
                  </span>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-stone-900 dark:text-stone-100 font-sans tracking-tight truncate">
                        {chan.id} {chan.name.split(" ")[0]}
                      </span>
                      <span className="text-[7.5px] text-stone-400 font-mono shrink-0">
                        {lastMsg ? lastMsg.time.split(" ")[0] : "11:58 AM"}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5 font-sans">
                      {lastMsgSnippet}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[7.5px] font-mono text-stone-400 max-w-[130px] truncate leading-none">
                        {chan.desc}
                      </span>
                      {channelMsgsCount > 0 && (
                        <span className="bg-emerald-650 text-white font-mono font-bold text-[8px] rounded-full h-3.5 min-w-[14px] px-0.5 flex items-center justify-center shrink-0">
                          {channelMsgsCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick AI Shortcuts */}
          <div className="p-2 sm:p-3 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-850 text-left space-y-1.5 shrink-0">
            <span className="font-mono text-[8px] font-extrabold text-stone-405 text-stone-400 uppercase tracking-widest block">🎓 AI SHORTCUT CHEATS</span>
            <div className="flex flex-wrap gap-1">
              <button 
                onClick={() => {
                  triggerLanguageQuizHelp("@ai Teach me core Swahili grammar vocabulary");
                  setShowSidebarMobile(false);
                }}
                className="bg-white dark:bg-stone-800 hover:bg-stone-100 border border-stone-200 dark:border-stone-700/50 rounded px-1.5 py-0.5 text-[8.5px] text-stone-600 dark:text-stone-300 font-sans transition cursor-pointer"
              >
                🌍 Swahili Grammar
              </button>
              <button 
                onClick={() => {
                  triggerLanguageQuizHelp("@ai Explain core strategic leadership principles");
                  setShowSidebarMobile(false);
                }}
                className="bg-white dark:bg-stone-800 hover:bg-stone-100 border border-stone-200 dark:border-stone-700/50 rounded px-1.5 py-0.5 text-[8.5px] text-stone-600 dark:text-stone-300 font-sans transition cursor-pointer"
              >
                🎓 Leadership Theory
              </button>
            </div>
          </div>
        </div>

        {/* Right hand WhatsApp chat view panel */}
        <div className={`flex-grow flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative min-w-0 ${!showSidebarMobile ? "flex" : "hidden md:flex"}`}>
          
          {/* Wallpaper pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] bg-[radial-gradient(#005c4b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Chat Header block */}
          <div className="p-2.5 bg-stone-100 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between z-15 select-none shrink-0 text-left">
            <div className="flex items-center space-x-2 min-w-0">
              <button 
                onClick={() => setShowSidebarMobile(true)}
                className="md:hidden p-1 text-emerald-850 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-250 select-none"
                title="Go back to cohort list"
              >
                <ChevronLeft className="h-5.5 w-5.5" />
              </button>
              
              <span className="text-xl h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 border border-stone-250 dark:border-stone-800">
                {AVAILABLE_CHANNELS.find((c) => c.id === activeChannel)?.icon || "🌐"}
              </span>
              
              <div className="truncate">
                <h3 className="text-xs font-black font-sans text-stone-900 dark:text-stone-100 tracking-tight flex items-center leading-tight">
                  <span className="truncate">{activeChannel} Chatroom</span>
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                </h3>
                <p className="text-[8.5px] text-stone-500 dark:text-stone-400 font-mono truncate max-w-[200px] mt-0.5">
                  Secure Workspace Ledger • Active Administrators
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5 text-stone-500 dark:text-stone-400 mr-1 shrink-0">
              <button onClick={() => alert("📞 establishing secure VOIP conference channel...")} title="Start Voice Call" className="hover:text-emerald-600 transition">
                <Phone className="h-4 w-4" />
              </button>
              <button onClick={() => alert("📹 Peer-to-peer visual cohort session connecting...")} title="Start Video Call" className="hover:text-emerald-600 transition">
                <Video className="h-4 w-4" />
              </button>
              <span className="h-3.5 w-px bg-stone-250 dark:bg-stone-800" />
              <button 
                onClick={() => {
                  const s = prompt("Enter text to filter messages:");
                  if (s !== null) setMessageSearchQuery(s);
                }} 
                title="Filter messages"
                className="hover:text-emerald-600 transition"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable messages area */}
          <div 
            ref={chatFeedRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-4.5 z-10 scrollbar-thin select-text text-left"
          >
            {/* Security Indicator */}
            <div className="mx-auto max-w-sm text-center">
              <div className="bg-yellow-50 dark:bg-[#182229] border border-yellow-250/30 dark:border-stone-800/80 rounded-lg p-2 text-[9px] text-stone-600 dark:text-stone-400 font-sans tracking-wide space-y-0.5 shadow-xs">
                <div className="font-extrabold flex items-center justify-center text-emerald-700 dark:text-emerald-400 uppercase tracking-widest font-mono">
                  🔒 Zion Verified Community Ledger
                </div>
                <p>Messages, photos, stickers, and credentials are encrypted in local caches. Digital books study is free and guarded.</p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex flex-col max-w-[70%] ${i % 2 === 0 ? "self-end items-end ml-auto" : "self-start items-start mr-auto"}`}>
                    <div className="p-3 rounded-xl bg-stone-100 dark:bg-[#202c33] space-y-1.5 w-56 border border-stone-200/40">
                      <div className="h-2 bg-stone-200 dark:bg-stone-750 rounded w-1/4"></div>
                      <div className="h-2.5 bg-stone-250 dark:bg-stone-700 rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : rootMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24 text-stone-405 dark:text-stone-500">
                <span className="text-3xl animate-bounce">🕊️</span>
                <h4 className="text-xs font-bold text-stone-850 dark:text-stone-250 mt-2 font-mono">Ledger is empty in {activeChannel}</h4>
                <p className="text-[9px] max-w-xs mt-0.5">Post an idea, Swahili note, photo, or study query below!</p>
              </div>
            ) : (
              rootMessages.map((m) => {
                const isMe = currentUser && (m.userId === currentUser.email);
                const repliesList = messages.filter((rep) => rep.parentId === m.id);
                const canDelete = currentUser && (currentUser.role === "admin" || currentUser.email === m.userId);
                const isVoiceNote = m.text.includes("🎤 Simulated Voice Note");

                return (
                  <div key={m.id} className="flex flex-col space-y-1.5">
                    
                    {/* Message Bubble Container */}
                    <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMe ? "self-end items-end ml-auto text-right" : "self-start items-start mr-auto text-left"}`}>
                      <div className={`p-2.5 rounded-xl relative shadow-xs text-left group ${
                        isMe 
                          ? "bg-emerald-100 dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none" 
                          : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none border border-stone-200/80 dark:border-stone-800/40"
                      }`}>
                        
                        {/* Member classification tag */}
                        {!isMe && (
                          <div className="flex items-center space-x-1 mb-1 justify-between select-none">
                            <span className="text-[10px] font-extrabold text-[#00a884] uppercase tracking-wider font-sans">
                              {m.userName}
                            </span>
                            <span className="text-[7.5px] bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-300 rounded px-1.5 py-0.2 font-bold shrink-0 border border-stone-205 dark:border-stone-705">
                              {m.role === "admin" ? "OFFICER" : "STUDENT"}
                            </span>
                          </div>
                        )}

                        {/* Inline Graphic STICKER display */}
                        {m.stickerEmoji && (
                          <div className="my-1.5 p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 dark:from-stone-900 dark:to-emerald-950 border border-amber-200/50 dark:border-emerald-900/40 text-center shadow-inner max-w-[150px] mx-auto">
                            <div className="text-4xl animate-bounce my-1 select-none">{m.stickerEmoji}</div>
                            <span className="text-[8px] font-black uppercase tracking-wider text-amber-800 dark:text-emerald-400 font-mono block">
                              {m.text}
                            </span>
                          </div>
                        )}

                        {/* Inline uploaded Image display */}
                        {m.imageContent && (
                          <div className="my-1.5 overflow-hidden rounded-lg max-w-[240px] border border-stone-200 dark:border-stone-800 shadow-xs bg-stone-50 dark:bg-stone-900">
                            <img 
                              src={m.imageContent} 
                              alt="Upload Shared" 
                              className="object-cover w-full max-h-48 select-all" 
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {/* Inline Document (DOC, PDF, Doce) display */}
                        {m.attachedFile && (
                          <div className="my-1.5 p-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-805 rounded-lg flex items-center justify-between gap-2.5 text-left max-w-[250px]">
                            <div className="flex items-center space-x-2 truncate">
                              <div className="p-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg shrink-0">
                                <FileText className="h-4.5 w-4.5" />
                              </div>
                              <div className="truncate text-left leading-normal">
                                <span className="font-extrabold text-[10.5px] text-stone-850 dark:text-stone-100 block truncate">{m.attachedFile.name}</span>
                                <span className="text-[8px] text-stone-400 font-mono uppercase">{m.attachedFile.sizeStr || "1.0 MB"} • {m.attachedFile.type.toUpperCase()}</span>
                              </div>
                            </div>
                            <a 
                              href={m.attachedFile.url || m.attachedFile.dataUrl} 
                              download={m.attachedFile.name}
                              className="p-1 px-1.5 text-[8.5px] font-mono font-black uppercase text-white bg-emerald-700 hover:bg-emerald-800 rounded cursor-pointer transition shrink-0 inline-block text-center"
                            >
                              Get
                            </a>
                          </div>
                        )}

                        {/* Edit Mode Inline Textarea Form */}
                        {editingMessageId === m.id ? (
                          <div className="space-y-1.5 py-1 min-w-[200px]">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full text-xs p-1.5 rounded border border-emerald-400 dark:border-emerald-750 bg-white dark:bg-stone-900 text-stone-900 dark:text-slate-100 focus:outline-none min-h-[50px] font-sans"
                              placeholder="Edit your message..."
                            />
                            <div className="flex items-center space-x-1 justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingText.trim() && onEditMessage) {
                                    onEditMessage(m.id, editingText.trim());
                                  }
                                  setEditingMessageId(null);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[9px] uppercase font-mono cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMessageId(null)}
                                className="bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded text-[9px] uppercase font-mono cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Render plain text or Voice memos sounds bar */
                          <>
                            {isVoiceNote ? (
                              <div className="flex items-center space-x-3 py-1">
                                <button 
                                  onClick={() => alert("🔊 Audio Player: playing voice cohort memo simulation...")}
                                  className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 hover:bg-emerald-750 transition"
                                  title="Play memo"
                                >
                                  <Volume2 className="h-4 w-4" />
                                </button>
                                <div className="min-w-[100px]">
                                  <div className="flex items-center space-x-0.5 h-3">
                                    {[2, 5, 1, 7, 3, 6, 2, 4, 8, 3, 5, 2].map((h, index) => (
                                      <span key={index} className="w-0.5 bg-emerald-700 dark:bg-emerald-400 rounded-sm" style={{ height: `${h * 1.2}px` }} />
                                    ))}
                                  </div>
                                  <span className="text-[8px] text-stone-405 dark:text-stone-400 block font-mono mt-0.5">Voice memo • 0:14</span>
                                </div>
                              </div>
                            ) : (
                              /* Standard Text payload: render unless Sticker block rendered without text */
                              (!m.stickerEmoji || m.imageContent || m.attachedFile) && (
                                <p className="text-xs leading-normal break-words whitespace-pre-wrap font-sans text-stone-850 dark:text-slate-100">
                                  {m.text}
                                </p>
                              )
                            )}
                          </>
                        )}

                        {/* Ticks and timestamps */}
                        <div className="flex items-center space-x-1 justify-end mt-1 text-[8px] text-stone-500 dark:text-stone-400 select-none font-mono">
                          {m.isEdited && <span className="text-[7.5px] italic text-stone-400 mr-1 select-none">(Edited)</span>}
                          <span>{m.time.split(" ")[0]} {m.time.split(" ")[1] || ""}</span>
                          {isMe ? <CheckCheck className="h-3 w-3 text-sky-400 shrink-0" /> : <CheckCheck className="h-3 w-3 text-stone-400/55 shrink-0" />}
                        </div>

                        {/* Actions (Reply, Edit, Delete) bar under card */}
                        <div className="mt-1.5 pt-1.5 border-t border-stone-100 dark:border-stone-860/30 flex items-center gap-2 justify-end text-[8.5px] select-none text-stone-400">
                          <button 
                            onClick={() => setReplyToMessage(m)}
                            className="hover:text-emerald-600 font-bold font-mono transition flex items-center space-x-0.5 p-0.5 cursor-pointer"
                          >
                            <Reply className="h-2.5 w-2.5" />
                            <span>Reply</span>
                          </button>
                          
                          {isMe && onEditMessage && (
                            <button 
                              onClick={() => {
                                setEditingMessageId(m.id);
                                setEditingText(m.text);
                              }}
                              className="hover:text-amber-600 font-bold font-mono transition flex items-center space-x-0.5 p-0.5 cursor-pointer"
                            >
                              <Edit3 className="h-2.5 w-2.5" />
                              <span>Edit</span>
                            </button>
                          )}

                          {canDelete && (
                            <button 
                              onClick={() => onDeleteMessage(m.id)}
                              className="text-rose-500 hover:text-rose-700 font-bold font-mono transition flex items-center space-x-0.5 p-0.5 cursor-pointer"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              <span>Purge</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Threaded Replies */}
                    {repliesList.length > 0 && (
                      <div className="flex flex-col space-y-1.5 mt-0.5 pl-6 sm:pl-8 border-l border-emerald-500/20 ml-3 max-w-[95%]">
                        {repliesList.map((reply) => {
                          const isReplyMe = currentUser && (reply.userId === currentUser.email);
                          const canDeleteReply = currentUser && (currentUser.role === "admin" || currentUser.email === reply.userId);

                          return (
                            <div 
                              key={reply.id}
                              className={`flex flex-col max-w-[90%] ${isReplyMe ? "self-end items-end ml-auto text-right" : "self-start items-start mr-auto text-left"}`}
                            >
                              <div className={`p-2 rounded-xl relative shadow-2xs text-left ${
                                isReplyMe 
                                  ? "bg-emerald-50 dark:bg-[#004d3c]/80 text-[#111b21] dark:text-[#e9edef] rounded-tr-none" 
                                  : "bg-stone-100 dark:bg-[#1f2c34] text-[#111b21] dark:text-[#e9edef] rounded-tl-none border border-stone-200/50 dark:border-stone-800/40"
                              }`}>
                                <div className="flex items-center space-x-1.5 mb-1 justify-between select-none font-sans">
                                  <span className="text-[9px] font-extrabold text-[#00a884] uppercase">
                                    {isReplyMe ? "You" : reply.userName}
                                  </span>
                                  <span className="text-[7px] bg-stone-200 dark:bg-stone-800 px-1 py-0.2 rounded font-mono font-bold uppercase shrink-0">
                                    {reply.role === "admin" ? "OFFICER" : "STUDENT"}
                                  </span>
                                </div>

                                {editingMessageId === reply.id ? (
                                  <div className="space-y-1.5 py-1 min-w-[180px]">
                                    <textarea
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      className="w-full text-xs p-1 rounded border border-emerald-400 bg-white dark:bg-stone-900 text-stone-900 dark:text-slate-100 min-h-[45px] focus:outline-none"
                                    />
                                    <div className="flex items-center space-x-1 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (editingText.trim() && onEditMessage) {
                                            onEditMessage(reply.id, editingText.trim());
                                          }
                                          setEditingMessageId(null);
                                        }}
                                        className="bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded text-[8.5px] uppercase cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingMessageId(null)}
                                        className="bg-stone-250 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded text-[8.5px] uppercase cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs leading-normal break-words font-sans text-stone-850 dark:text-slate-150">
                                    {reply.text}
                                  </p>
                                )}

                                <div className="flex items-center space-x-1 justify-end mt-0.5 text-[7.5px] text-stone-405 text-stone-500 select-none font-mono">
                                  {reply.isEdited && <span className="text-[7px] italic text-stone-400 mr-0.5 select-none">(Edited)</span>}
                                  <span>{reply.time.split(" ")[0]}</span>
                                  {isReplyMe ? <CheckCheck className="h-2.5 w-2.5 text-sky-400" /> : <CheckCheck className="h-2.5 w-2.5 text-stone-400/50" />}
                                </div>

                                <div className="mt-1 pt-1 border-t border-stone-200/50 dark:border-stone-700/30 flex justify-end gap-1.5 text-[8px]">
                                  {isReplyMe && onEditMessage && (
                                    <button
                                      onClick={() => {
                                        setEditingMessageId(reply.id);
                                        setEditingText(reply.text);
                                      }}
                                      className="hover:text-amber-600 font-bold font-mono transition text-[8px]"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {canDeleteReply && (
                                    <button 
                                      onClick={() => onDeleteMessage(reply.id)}
                                      className="text-rose-550 hover:text-rose-700 font-mono font-bold flex items-center space-x-0.5 cursor-pointer"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                      <span>Purge</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Reply quotes info panel prior to input tray */}
          {replyToMessage && (
            <div className="bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 p-2 flex items-center justify-between z-15 relative text-left shrink-0">
              <div className="border-l-4 border-emerald-600 pl-2">
                <span className="text-[9.5px] font-bold text-emerald-600 block">Replying to {replyToMessage.userName}'s post:</span>
                <p className="text-[10.5px] text-stone-500 dark:text-stone-350 truncate max-w-[320px]">"{replyToMessage.text}"</p>
              </div>
              <button 
                onClick={() => setReplyToMessage(null)}
                className="text-stone-400 hover:text-stone-605 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Selected physical real file preview notification block */}
          {realAttachedFile && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border-t border-emerald-250 p-2 flex items-center justify-between z-15 relative text-left shrink-0">
              <div className="flex items-center space-x-2 pl-2">
                <Paperclip className="h-4 w-4 text-emerald-600 animate-pulse" />
                <div className="leading-tight">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block uppercase font-mono">
                    [{realAttachedFile.type.toUpperCase()} READY] {realAttachedFile.name}
                  </span>
                  <p className="text-[8.5px] text-stone-550 dark:text-stone-400 font-mono">Payload: {realAttachedFile.sizeStr}</p>
                </div>
              </div>
              <button onClick={() => setRealAttachedFile(null)} className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Legacy fallback attachment indicators */}
          {simulatedAttachment && (
            <div className="bg-emerald-100/40 dark:bg-emerald-950/10 border-t border-emerald-200 p-1.5 flex items-center justify-between z-15 relative text-left shrink-0 text-[10px]">
              <div className="flex items-center space-x-1.5 pl-2 leading-tight">
                <Paperclip className="h-3.5 w-3.5 text-emerald-600" />
                <span>Simulated [{simulatedAttachment.type.toUpperCase()}]: {simulatedAttachment.name}</span>
              </div>
              <button onClick={() => setSimulatedAttachment(null)} className="text-stone-450 hover:text-stone-600 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Quick inline Emojis bar above typing box */}
          {showEmojiPicker && (
            <div className="bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-850 p-2 flex flex-wrap gap-1.5 justify-start z-15 animate-in slide-in-from-bottom-2 shrink-0 select-none">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setChatInput((prev) => prev + e);
                  }}
                  className="p-1 px-1.5 text-base hover:scale-125 transition active:scale-95 cursor-pointer rounded bg-stone-50 dark:bg-stone-800"
                >
                  {e}
                </button>
              ))}
              <div className="text-[9px] text-stone-400 font-bold self-center ml-2">Tap to inject</div>
            </div>
          )}

          {/* Quick inline STICKERS tray above typing box */}
          {showStickerPicker && (
            <div className="bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-850 p-2 z-15 shrink-0 select-none text-left">
              <span className="text-[8px] font-black uppercase text-stone-400 block tracking-widest mb-1 pl-1">📚 INSTANT ACADEMIC BADGES STICKERS</span>
              <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1 text-center">
                {STUDY_STICKERS.map((st) => (
                  <button
                    key={st.emoji}
                    type="button"
                    onClick={() => handleSendStickerMsg(st.emoji, st.label)}
                    className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white dark:bg-stone-900 text-center cursor-pointer transition"
                  >
                    <div className="text-2xl">{st.emoji}</div>
                    <span className="text-[8px] font-mono text-stone-500 truncate block mt-0.5">{st.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Typing Container & Send elements */}
          <div className="p-2 sm:p-3 bg-stone-105 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 z-15 shrink-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              
              {/* Attachment clips */}
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => {
                    setIsAttachmentOpen(!isAttachmentOpen);
                    setShowStickerPicker(false);
                    setShowEmojiPicker(false);
                  }}
                  title="Attach Documents or Media files" 
                  className={`h-8.5 w-8.5 rounded-full flex items-center justify-center transition shrink-0 ${isAttachmentOpen ? "bg-emerald-605 bg-emerald-600 text-white" : "hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-300"}`}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                {isAttachmentOpen && (
                  <div className="absolute bottom-11 left-0 bg-white dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xl p-1.5 w-48 space-y-0.5 text-left z-35 animate-in slide-in-from-bottom-2 selection:bg-none">
                    <button 
                      type="button"
                      onClick={() => handleRealFileClick(photoInputRef)} 
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 text-left text-xs"
                    >
                      <Image className="h-4 w-4 text-sky-500 shrink-0" />
                      <span>Upload Photo from device</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleRealFileClick(docInputRef)} 
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-900 text-left text-xs"
                    >
                      <FileText className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>Upload Doce/PDF from device</span>
                    </button>
                    <div className="h-px bg-stone-100 dark:bg-stone-900 my-1"></div>
                    <button 
                      type="button"
                      onClick={() => handleAttachMockFile('photo')} 
                      className="w-full flex items-center space-x-2 p-1 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-900/60 text-left text-[10.5px] italic text-stone-400"
                    >
                      <span>📎 Fast Mock Photo</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleAttachMockFile('video')} 
                      className="w-full flex items-center space-x-2 p-1 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-900/60 text-left text-[10.5px] italic text-stone-400"
                    >
                      <span>📎 Fast Mock Video</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleAttachMockFile('doc')} 
                      className="w-full flex items-center space-x-2 p-1 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-900/60 text-left text-[10.5px] italic text-stone-400"
                    >
                      <span>📎 Fast Mock Doce</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Emoji tray toggler */}
              <button 
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowStickerPicker(false);
                  setIsAttachmentOpen(false);
                }}
                title="Toggle Emojis Picker Keyboard"
                className={`h-8.5 w-8.5 rounded-full flex items-center justify-center transition shrink-0 ${showEmojiPicker ? "bg-amber-100 text-amber-700" : "hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-300"}`}
              >
                <Smile className="h-4.5 w-4.5" />
              </button>

              {/* Stickers badge trigger */}
              <button 
                type="button"
                onClick={() => {
                  setShowStickerPicker(!showStickerPicker);
                  setShowEmojiPicker(false);
                  setIsAttachmentOpen(false);
                }}
                title="Sticker Academy Badges Store"
                className={`h-8.5 w-8.5 rounded-full flex items-center justify-center transition shrink-0 font-extrabold text-xs ${showStickerPicker ? "bg-emerald-100 text-emerald-700" : "hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-300"}`}
              >
                🎓 Sticker
              </button>

              {/* Swahili helper translator */}
              <button 
                type="button"
                onClick={() => {
                  const keyword = prompt("Translate Swahili query into English instantly (e.g. Asanti, Kiongozi, Karibu):");
                  if (keyword) {
                    setChatInput(`Swahili vocabulary: "${keyword}" translates to relevant contextual learning.`);
                  }
                }}
                title="Instant Swahili glossary translation"
                className="h-8.5 w-8.5 rounded-full flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-300 transition shrink-0"
              >
                🌎
              </button>

              {/* Input edit field or recording mic */}
              <form onSubmit={handleSubmitMessage} className="flex-1 flex items-center space-x-1.5 sm:space-x-2 relative">
                {isRecording ? (
                  <div className="flex-grow flex items-center justify-between rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/60 px-3.5 py-1.5 z-30">
                    <div className="flex items-center space-x-1.5 text-red-600 animate-pulse text-[11px]">
                      <Mic className="h-4 w-4" />
                      <span className="font-extrabold">🎤 VoIP Study Memo...</span>
                      <span className="font-mono">({recordTimer}s)</span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono">
                      <button 
                        type="button" 
                        onClick={stopRecordingAndSend}
                        className="bg-emerald-600 text-white rounded px-2.5 py-0.5 text-[9.5px] font-black uppercase cursor-pointer"
                      >
                        Send
                      </button>
                      <button 
                        type="button" 
                        onClick={cancelRecording}
                        className="text-[9.5px] text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 font-bold uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <input 
                    type="text"
                    required={!realAttachedFile && !simulatedAttachment}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={currentUser ? "Type a message or school request..." : "Please sign in to participate in discussion forums..."}
                    disabled={!currentUser}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-emerald-600 text-stone-850 dark:text-stone-100 placeholder-stone-400 cursor-text"
                  />
                )}

                {/* Send action */}
                {!chatInput.trim() && !realAttachedFile && !simulatedAttachment && !isRecording ? (
                  <button 
                    type="button"
                    onClick={startRecording}
                    title="Press and talk"
                    className="h-8.5 w-8.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center transition shrink-0 cursor-pointer shadow-xs"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                ) : (
                  <button 
                    type="submit"
                    className="h-8.5 w-8.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center transition shrink-0 cursor-pointer shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
