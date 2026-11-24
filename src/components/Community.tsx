import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, Trash2, Reply, Send, ShieldAlert, Sparkles, Volume2, 
  Phone, Video, MoreVertical, Search, Paperclip, Smile, CheckCheck, 
  Image, FileText, Music, Mic, ChevronRight, ChevronLeft, Check, X, Shield, BookOpen,
  Megaphone, Pin, AlertCircle, Sparkle, Loader, Edit3
} from "lucide-react";
import { CommunityMessage, User } from "../types";
import { secureApiFetch } from "../lib/aiClient";

export function isUserWorker(user: User | null): boolean {
  if (!user) return false;
  return ["main_admin", "admin", "sub_admin", "manager", "tutor"].includes(user.role);
}

interface CommunityProps {
  currentUser: User | null;
  onLogIn: () => void;
  messages: CommunityMessage[];
  onSendMessage: (text: string, parentId?: string, channelName?: string, extras?: any) => void;
  onDeleteMessage: (id: string) => void;
  onEditMessage?: (id: string, text: string) => void;
  broadcastAnnouncement: string;
  onUpdateBroadcastAnnouncement?: (msg: string) => void;
  isLoading?: boolean;
}

type ChannelType = '#General' | '#Book Talks' | '#Leadership' | '#Publishing' | '#Bible Study' | '#Computing' | '#workers' | string;

const AVAILABLE_CHANNELS: { id: ChannelType; name: string; desc: string; icon: string }[] = [
  { id: '#General', name: "General", desc: "Welcome lounge, daily reflections, and reader introductions", icon: "#" },
  { id: '#Book Talks', name: "Book Talks", desc: "Discuss chapters, highlights, and reading club notes", icon: "#" },
  { id: '#Leadership', name: "Leadership", desc: "Cohort strategy, ethics, and fellowship mentorship", icon: "#" },
  { id: '#Publishing', name: "Publishing", desc: "Drafting manuscripts, editing, and author discussions", icon: "#" },
  { id: '#Bible Study', name: "Bible Study", desc: "Scripture reflections across all 66 NIV books", icon: "#" },
  { id: '#Computing', name: "Computing", desc: "Programming, digital tools, and technology study group", icon: "#" },
  { id: '#workers', name: "Staff & Faculty Room", desc: "Private room verified for tutors, managers, and administrators", icon: "🔒" }
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
  const [serverChannelMessages, setServerChannelMessages] = useState<CommunityMessage[]>([]);
  const [channelAccessError, setChannelAccessError] = useState<string | null>(null);

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

  // Sync verified room history from backend (respecting private room membership checks)
  useEffect(() => {
    let active = true;
    setChannelAccessError(null);
    secureApiFetch(`/api/community/messages?channel=${encodeURIComponent(activeChannel)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.status === 403) {
          setChannelAccessError(data?.error || "Restricted room: Only verified tutors, managers, and administrators may view #workers.");
          setServerChannelMessages([]);
          return;
        }
        if (res.ok && Array.isArray(data?.messages)) {
          setServerChannelMessages(data.messages);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeChannel, currentUser?.email, currentUser?.role]);

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messages, serverChannelMessages, activeChannel, showSidebarMobile]);

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
    secureApiFetch("/api/community/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: activeChannel,
        text: textToSend,
        parentId: replyToMessage?.id,
        ...extras,
      }),
    }).catch(() => {});
    
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

  // Combine local & server-verified channel messages without duplicates
  const mergedMessages = React.useMemo(() => {
    const map = new Map<string, CommunityMessage>();
    for (const m of messages) map.set(m.id, m);
    for (const m of serverChannelMessages) map.set(m.id, m);
    return Array.from(map.values());
  }, [messages, serverChannelMessages]);

  const normalizeChannel = (raw?: string): string => {
    if (!raw || raw === "#generatechat" || raw.toLowerCase() === "#general") return "#General";
    if (raw.toLowerCase() === "#book talks") return "#Book Talks";
    if (raw.toLowerCase() === "#leadership") return "#Leadership";
    if (raw.toLowerCase() === "#publishing") return "#Publishing";
    if (raw.toLowerCase() === "#bible study") return "#Bible Study";
    if (raw.toLowerCase() === "#computing") return "#Computing";
    if (raw.toLowerCase() === "#workers") return "#workers";
    return raw;
  };

  // Filter messages based on active channel and search query
  const filteredMessages = mergedMessages.filter((m) => {
    const msgChan = normalizeChannel(m.channel);
    if (msgChan === "#workers" && !isUserWorker(currentUser)) return false;
    const isChannelMatch = msgChan === activeChannel;
    const isSearchMatch = m.text.toLowerCase().includes(messageSearchQuery.toLowerCase()) || 
                          m.userName.toLowerCase().includes(messageSearchQuery.toLowerCase());
    return isChannelMatch && isSearchMatch;
  });

  // Root level messages in this channel
  const rootMessages = filteredMessages.filter((m) => !m.parentId);

  const isAdmin = Boolean(
    currentUser && (
      ["main_admin", "admin"].includes(currentUser.role) ||
      (currentUser.role === "sub_admin" && currentUser.permissions?.allowModeration)
    )
  );

  // Unique participants in the active view for the left sidebar members roster
  const activeRoomMembers = React.useMemo(() => {
    const seen = new Map<string, { name: string; initial: string; role?: string }>();
    if (currentUser && currentUser.role !== "guest") {
      seen.set(currentUser.email, {
        name: currentUser.name,
        initial: currentUser.name.charAt(0).toUpperCase(),
        role: currentUser.role,
      });
    }
    for (const m of filteredMessages) {
      if (!seen.has(m.userId) && m.userName) {
        seen.set(m.userId, {
          name: m.userName,
          initial: m.userName.charAt(0).toUpperCase(),
          role: m.role,
        });
      }
    }
    return Array.from(seen.values()).slice(0, 8);
  }, [filteredMessages, currentUser]);

  return (
    <div id="whatsapp_community_clone" className="w-full max-w-7xl mx-auto min-h-[calc(100vh-8rem)] flex flex-col px-3 sm:px-6 lg:px-8 py-4 space-y-4">
      
      {/* Editorial Section Header matching Screenshot 3 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-left">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1B18] dark:text-[#F5F1EB] flex items-center gap-2 tracking-tight">
            <MessageSquare className="h-6 w-6 text-[#A8421B] dark:text-[#D96B3E]" />
            <span>Community</span>
          </h2>
          <p className="text-xs text-[#6E655E] dark:text-[#B6ABA0] mt-0.5">
            Share photos, PDFs and documents. Reply, tag members, send emojis or discuss readings together.
          </p>
        </div>
      </div>
      
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

      {/* 1. Admin Announcements Strip */}
      <div className="rounded-2xl border border-[#E7E1D8] dark:border-[#332C26] bg-white dark:bg-[#1E1A17] p-3 shadow-2xs text-left">
        <div className="flex items-center justify-between border-b border-[#E7E1D8]/70 dark:border-[#332C26] pb-1.5 mb-2">
          <button 
            onClick={() => setIsNoticesExpanded(!isNoticesExpanded)}
            className="flex items-center space-x-1.5 hover:opacity-80 focus:outline-none text-[#A8421B] dark:text-[#D96B3E] font-bold cursor-pointer"
          >
            <Megaphone className="h-4 w-4 shrink-0" />
            <span className="text-[11px] uppercase font-mono font-bold tracking-wider">Campus Bulletin ({announcements.length})</span>
            <span className="text-[10px] text-[#6E655E] dark:text-[#B6ABA0] font-normal">({isNoticesExpanded ? "Hide" : "Show"})</span>
          </button>

          <div className="flex items-center space-x-1.5">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handlePruneOutdatedNotices}
                  className="bg-transparent hover:bg-[#FAF8F4] text-[#A8421B] dark:text-[#D96B3E] font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-[#E7E1D8] dark:border-[#332C26] flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                  <span>Prune</span>
                </button>
                <button
                  onClick={() => setShowAnnouncementMaker(!showAnnouncementMaker)}
                  className="bg-[#A8421B] hover:bg-[#8F3614] text-white font-mono text-[9px] uppercase font-bold px-2.5 py-0.5 rounded transition cursor-pointer"
                >
                  <span>{showAnnouncementMaker ? "Cancel" : "+ Notice"}</span>
                </button>
              </>
            )}
            <span className="bg-[#A8421B]/10 text-[#A8421B] dark:text-[#D96B3E] text-[8.5px] font-mono px-2 py-0.5 rounded font-bold uppercase">Official</span>
          </div>
        </div>

        {showAnnouncementMaker && isAdmin && (
          <form onSubmit={handlePostAnnouncement} className="mb-2 p-2.5 bg-[#FAF8F4] dark:bg-[#141210] rounded-xl border border-[#E7E1D8] dark:border-[#332C26]">
            <span className="text-[9px] uppercase font-mono font-bold text-[#6E655E] block mb-1">Post New Campus Notice</span>
            <div className="flex gap-2">
              <input 
                type="text"
                required
                placeholder="Share a cohort update or schedule notice..."
                value={announcementInput}
                onChange={(e) => setAnnouncementInput(e.target.value)}
                className="flex-grow text-xs rounded-lg border border-[#E7E1D8] dark:border-[#332C26] bg-white dark:bg-[#1E1A17] px-3 py-1.5 cursor-text focus:outline-none focus:border-[#A8421B] text-[#1F1B18] dark:text-[#F5F1EB]"
              />
              <button 
                type="submit" 
                className="bg-[#A8421B] hover:bg-[#8F3614] text-white font-mono text-[10px] font-bold px-3 rounded-lg transition cursor-pointer"
              >
                Publish
              </button>
            </div>
          </form>
        )}

        {isNoticesExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-24 overflow-y-auto pr-1">
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
                  className="bg-[#FAF8F4] dark:bg-[#141210] p-2.5 rounded-xl border border-[#E7E1D8] dark:border-[#332C26] relative flex flex-col justify-between text-left"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1 border-b border-dashed border-[#E7E1D8] dark:border-[#332C26] pb-0.5">
                      <span className="text-[9px] font-bold text-[#1F1B18] dark:text-[#F5F1EB] font-mono flex items-center select-none">
                        <Pin className="h-2.5 w-2.5 mr-1 text-[#A8421B] rotate-45" /> {item.author.split(" ")[0]}
                        {isNew && (
                          <span className="ml-1 bg-[#A8421B] text-white text-[7px] font-bold uppercase px-1 rounded-sm">New</span>
                        )}
                      </span>
                      <span className="text-[8px] text-[#6E655E] font-mono">{item.date}</span>
                    </div>
                    <p className="text-[10.5px] text-[#6E655E] dark:text-[#B6ABA0] leading-normal">{item.text}</p>
                  </div>

                  {isAdmin && (
                    <div className="flex justify-end mt-1 pt-0.5 border-t border-[#E7E1D8]/50">
                      <button
                        onClick={() => handleDeleteAnnouncement(item.id, item.text)}
                        className="text-[8px] text-rose-700 dark:text-rose-400 font-mono font-bold flex items-center space-x-0.5 p-0.5 cursor-pointer"
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

      {/* 2. Editorial Dual-Panel Community Rooms Desk */}
      <div className="flex-grow flex rounded-2xl border border-[#E7E1D8] dark:border-[#332C26] bg-[#FAF8F4] dark:bg-[#141210] overflow-hidden shadow-xs min-h-[480px]">
        
        {/* Left Rooms & Members Column */}
        <div className={`w-full md:w-64 border-r border-[#E7E1D8] dark:border-[#332C26] bg-[#FAF8F4] dark:bg-[#141210] flex flex-col shrink-0 select-none ${showSidebarMobile ? "flex" : "hidden md:flex"}`}>
          {/* Room Search */}
          <div className="p-3 border-b border-[#E7E1D8] dark:border-[#332C26]">
            <div className="relative flex items-center bg-white dark:bg-[#1E1A17] rounded-lg px-2.5 py-1.5 border border-[#E7E1D8] dark:border-[#332C26]">
              <Search className="h-3.5 w-3.5 text-[#6E655E] mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="Search messages..."
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-none cursor-text text-[#1F1B18] dark:text-[#F5F1EB]"
              />
              {messageSearchQuery && (
                <button onClick={() => setMessageSearchQuery("")} className="text-[#6E655E] hover:text-[#1F1B18] p-0.5">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Rooms list */}
          <div className="p-3 space-y-1 flex-1 overflow-y-auto">
            <span className="px-2 text-[9px] uppercase font-mono tracking-[0.18em] text-[#6E655E] dark:text-[#B6ABA0] font-bold block mb-2 text-left">
              ROOMS
            </span>
            {AVAILABLE_CHANNELS.filter(chan => chan.id !== '#workers' || isUserWorker(currentUser)).map((chan) => {
              const isActive = activeChannel === chan.id;
              const channelMsgsCount = mergedMessages.filter((m) => normalizeChannel(m.channel) === chan.id).length;

              return (
                <button
                  key={chan.id}
                  onClick={() => {
                    setActiveChannel(chan.id);
                    setReplyToMessage(null);
                    setShowSidebarMobile(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold transition cursor-pointer ${
                    isActive 
                      ? "bg-[#A8421B] text-white font-bold shadow-2xs" 
                      : "text-[#1F1B18]/80 dark:text-[#F5F1EB]/80 hover:bg-[#EFECE6] dark:hover:bg-[#1E1A17]"
                  }`}
                >
                  <span className="truncate">
                    {chan.id === '#workers' ? '🔒 Workers Room' : `# ${chan.name}`}
                  </span>
                  {channelMsgsCount > 0 && (
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : "text-[#6E655E] dark:text-[#B6ABA0]"}`}>
                      {channelMsgsCount}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Active Members Roster */}
            <div className="pt-5 mt-4 border-t border-[#E7E1D8] dark:border-[#332C26]">
              <span className="px-2 text-[9px] uppercase font-mono tracking-[0.18em] text-[#6E655E] dark:text-[#B6ABA0] font-bold block mb-2 text-left">
                MEMBERS ({activeRoomMembers.length})
              </span>
              <div className="space-y-1.5 px-1">
                {activeRoomMembers.map((mem, i) => (
                  <div key={i} className="flex items-center space-x-2.5 py-1 text-left">
                    <div className="h-6 w-6 rounded-full bg-[#EFECE6] dark:bg-[#26211D] text-[#A8421B] dark:text-[#D96B3E] flex items-center justify-center text-[10px] font-bold shrink-0">
                      {mem.initial}
                    </div>
                    <span className="text-xs text-[#1F1B18] dark:text-[#F5F1EB] truncate">{mem.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Chat Area */}
        <div className={`flex-grow flex flex-col bg-white dark:bg-[#1E1A17] relative min-w-0 ${!showSidebarMobile ? "flex" : "hidden md:flex"}`}>
          
          {/* Chat Header */}
          <div className="px-4 py-3 bg-white dark:bg-[#1E1A17] border-b border-[#E7E1D8] dark:border-[#332C26] flex items-center justify-between z-15 select-none shrink-0 text-left">
            <div className="flex items-center space-x-2.5 min-w-0">
              <button 
                onClick={() => setShowSidebarMobile(true)}
                className="md:hidden p-1 text-[#A8421B] hover:opacity-80 cursor-pointer"
                title="Back to rooms"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="truncate">
                <h3 className="text-sm font-bold text-[#1F1B18] dark:text-[#F5F1EB] tracking-tight truncate">
                  {activeChannel === '#workers' ? '🔒 Workers Room' : `# ${AVAILABLE_CHANNELS.find((c) => c.id === activeChannel)?.name || activeChannel.replace('#', '')}`}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-[#6E655E] dark:text-[#B6ABA0] shrink-0">
              <span className="text-xs font-mono">{Math.max(activeRoomMembers.length, 3)} members</span>
              <button 
                onClick={() => {
                  const s = prompt("Filter messages in this room:");
                  if (s !== null) setMessageSearchQuery(s);
                }} 
                title="Filter messages"
                className="hover:text-[#A8421B] transition cursor-pointer"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable messages area */}
          <div 
            ref={chatFeedRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 z-10 scrollbar-thin select-text text-left bg-[#FAF8F4]/40 dark:bg-[#141210]/40"
          >
            {channelAccessError ? (
              <div className="max-w-md mx-auto my-12 p-6 rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900/50 text-center space-y-2">
                <ShieldAlert className="h-7 w-7 text-rose-600 mx-auto" />
                <h4 className="font-bold text-sm text-rose-800 dark:text-rose-300">Restricted Staff Room</h4>
                <p className="text-xs text-rose-700 dark:text-rose-200">{channelAccessError}</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`flex flex-col max-w-[70%] ${i % 2 === 0 ? "self-end items-end ml-auto" : "self-start items-start mr-auto"}`}>
                    <div className="p-3 rounded-2xl bg-[#ECE7DF] dark:bg-[#26211D] space-y-1.5 w-56">
                      <div className="h-2 bg-[#E7E1D8] rounded w-1/4"></div>
                      <div className="h-2.5 bg-[#E7E1D8] rounded w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : rootMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 text-[#6E655E] dark:text-[#B6ABA0]">
                <MessageSquare className="h-8 w-8 text-[#A8421B]/50 mb-2" />
                <h4 className="text-sm font-bold text-[#1F1B18] dark:text-[#F5F1EB]">Start the conversation in {activeChannel}</h4>
                <p className="text-xs max-w-xs mt-1">Share book thoughts, fellowship prayers, or study questions with the community.</p>
              </div>
            ) : (
              rootMessages.map((m) => {
                const isMe = Boolean(currentUser && m.userId?.toLowerCase() === currentUser.email?.toLowerCase());
                const repliesList = mergedMessages.filter((rep) => rep.parentId === m.id);
                const canDelete = Boolean(isAdmin || (currentUser && currentUser.email?.toLowerCase() === m.userId?.toLowerCase()));
                const isVoiceNote = m.text.includes("Simulated Voice Note");

                return (
                  <div key={m.id} className="flex flex-col space-y-2">
                    <div className={`flex items-start gap-2.5 max-w-[85%] sm:max-w-[72%] ${isMe ? "self-end flex-row-reverse ml-auto text-right" : "self-start mr-auto text-left"}`}>
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${
                        isMe ? "bg-[#A8421B] text-white" : "bg-[#ECE7DF] dark:bg-[#26211D] text-[#1F1B18] dark:text-[#F5F1EB]"
                      }`}>
                        {m.userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col space-y-1">
                        {!isMe && (
                          <div className="flex items-center space-x-2 select-none px-1">
                            <span className="text-[11px] font-semibold text-[#6E655E] dark:text-[#B6ABA0]">{m.userName}</span>
                            {["main_admin", "admin", "sub_admin", "manager", "tutor"].includes(m.role || "") && (
                              <span className="text-[8.5px] bg-[#A8421B]/10 text-[#A8421B] dark:text-[#D96B3E] rounded px-1.5 py-0.5 font-mono font-bold uppercase">
                                Staff
                              </span>
                            )}
                          </div>
                        )}
                        <div className={`px-3.5 py-2.5 rounded-2xl relative text-left ${
                          isMe 
                            ? "bg-[#A8421B] text-white rounded-tr-sm" 
                            : "bg-[#ECE7DF] dark:bg-[#26211D] text-[#1F1B18] dark:text-[#F5F1EB] rounded-tl-sm"
                        }`}>

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
                                <p className={`text-xs leading-normal break-words whitespace-pre-wrap font-sans ${isMe ? "text-white" : "text-[#1F1B18] dark:text-[#F5F1EB]"}`}>
                                  {m.text}
                                </p>
                              )
                            )}
                          </>
                        )}

                        <div className={`flex items-center space-x-1 justify-end mt-1 text-[8.5px] select-none font-mono ${isMe ? "text-white/75" : "text-[#6E655E] dark:text-[#B6ABA0]"}`}>
                          {m.isEdited && <span className="italic mr-1">(Edited)</span>}
                          <span>{m.time.split(" ")[0]} {m.time.split(" ")[1] || ""}</span>
                        </div>

                        <div className={`mt-1.5 pt-1 border-t flex items-center gap-2 justify-end text-[9px] select-none ${isMe ? "border-white/20 text-white/85" : "border-[#1F1B18]/10 text-[#6E655E] dark:text-[#B6ABA0]"}`}>
                          <button 
                            onClick={() => setReplyToMessage(m)}
                            className="hover:underline font-bold font-mono flex items-center space-x-0.5 cursor-pointer"
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
                              className="hover:underline font-bold font-mono flex items-center space-x-0.5 cursor-pointer"
                            >
                              <Edit3 className="h-2.5 w-2.5" />
                              <span>Edit</span>
                            </button>
                          )}

                          {canDelete && (
                            <button 
                              onClick={() => onDeleteMessage(m.id)}
                              className="hover:underline font-bold font-mono flex items-center space-x-0.5 cursor-pointer"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>

                    {/* Threaded Replies */}
                    {repliesList.length > 0 && (
                      <div className="flex flex-col space-y-1.5 mt-0.5 pl-6 sm:pl-8 border-l-2 border-[#A8421B]/30 ml-3 max-w-[95%]">
                        {repliesList.map((reply) => {
                          const isReplyMe = Boolean(currentUser && reply.userId?.toLowerCase() === currentUser.email?.toLowerCase());
                          const canDeleteReply = Boolean(isAdmin || (currentUser && currentUser.email?.toLowerCase() === reply.userId?.toLowerCase()));

                          return (
                            <div 
                              key={reply.id}
                              className={`flex flex-col max-w-[90%] ${isReplyMe ? "self-end items-end ml-auto text-right" : "self-start items-start mr-auto text-left"}`}
                            >
                              <div className={`px-3 py-2 rounded-xl relative text-left ${
                                isReplyMe 
                                  ? "bg-[#A8421B] text-white rounded-tr-sm" 
                                  : "bg-[#ECE7DF] dark:bg-[#26211D] text-[#1F1B18] dark:text-[#F5F1EB] rounded-tl-sm"
                              }`}>
                                <div className="flex items-center space-x-1.5 mb-1 justify-between select-none">
                                  <span className={`text-[9.5px] font-bold uppercase ${isReplyMe ? "text-white/85" : "text-[#A8421B] dark:text-[#D96B3E]"}`}>
                                    {isReplyMe ? "You" : reply.userName}
                                  </span>
                                </div>

                                {editingMessageId === reply.id ? (
                                  <div className="space-y-1.5 py-1 min-w-[180px]">
                                    <textarea
                                      value={editingText}
                                      onChange={(e) => setEditingText(e.target.value)}
                                      className="w-full text-xs p-1.5 rounded border border-[#E7E1D8] bg-white text-[#1F1B18] min-h-[45px] focus:outline-none"
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
                                        className="bg-[#A8421B] text-white font-bold px-2 py-0.5 rounded text-[8.5px] uppercase cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingMessageId(null)}
                                        className="bg-[#ECE7DF] text-[#1F1B18] px-2 py-0.5 rounded text-[8.5px] uppercase cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className={`text-xs leading-normal break-words ${isReplyMe ? "text-white" : "text-[#1F1B18] dark:text-[#F5F1EB]"}`}>
                                    {reply.text}
                                  </p>
                                )}

                                <div className={`flex items-center space-x-1 justify-end mt-1 text-[8px] select-none font-mono ${isReplyMe ? "text-white/75" : "text-[#6E655E]"}`}>
                                  {reply.isEdited && <span className="italic mr-0.5">(Edited)</span>}
                                  <span>{reply.time.split(" ")[0]}</span>
                                </div>

                                <div className={`mt-1 pt-1 border-t flex justify-end gap-2 text-[8.5px] ${isReplyMe ? "border-white/20 text-white/85" : "border-[#1F1B18]/10 text-[#6E655E]"}`}>
                                  {isReplyMe && onEditMessage && (
                                    <button
                                      onClick={() => {
                                        setEditingMessageId(reply.id);
                                        setEditingText(reply.text);
                                      }}
                                      className="hover:underline font-bold font-mono cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                  )}
                                  {canDeleteReply && (
                                    <button 
                                      onClick={() => onDeleteMessage(reply.id)}
                                      className="hover:underline font-mono font-bold flex items-center space-x-0.5 cursor-pointer"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                      <span>Delete</span>
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
          <div className="p-2.5 sm:p-3.5 bg-white dark:bg-[#1E1A17] border-t border-[#E7E1D8] dark:border-[#332C26] z-15 shrink-0">
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
                  title="Attach Documents or Media" 
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer ${isAttachmentOpen ? "bg-[#A8421B] text-white" : "hover:bg-[#FAF8F4] dark:hover:bg-[#26211D] text-[#6E655E] dark:text-[#B6ABA0]"}`}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                {isAttachmentOpen && (
                  <div className="absolute bottom-11 left-0 bg-white dark:bg-[#1E1A17] rounded-xl border border-[#E7E1D8] dark:border-[#332C26] shadow-xl p-1.5 w-52 space-y-0.5 text-left z-35">
                    <button 
                      type="button"
                      onClick={() => handleRealFileClick(photoInputRef)} 
                      className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-[#FAF8F4] dark:hover:bg-[#26211D] text-left text-xs text-[#1F1B18] dark:text-[#F5F1EB] cursor-pointer"
                    >
                      <Image className="h-4 w-4 text-[#A8421B] shrink-0" />
                      <span>Upload Photo</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleRealFileClick(docInputRef)} 
                      className="w-full flex items-center space-x-2 p-2 rounded-lg hover:bg-[#FAF8F4] dark:hover:bg-[#26211D] text-left text-xs text-[#1F1B18] dark:text-[#F5F1EB] cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Upload Document / PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Emoji tray */}
              <button 
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowStickerPicker(false);
                  setIsAttachmentOpen(false);
                }}
                title="Emojis"
                className={`h-8 w-8 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer ${showEmojiPicker ? "bg-[#A8421B]/10 text-[#A8421B]" : "hover:bg-[#FAF8F4] dark:hover:bg-[#26211D] text-[#6E655E] dark:text-[#B6ABA0]"}`}
              >
                <Smile className="h-4 w-4" />
              </button>

              {/* Stickers */}
              <button 
                type="button"
                onClick={() => {
                  setShowStickerPicker(!showStickerPicker);
                  setShowEmojiPicker(false);
                  setIsAttachmentOpen(false);
                }}
                title="Community Badges"
                className={`h-8 w-8 rounded-full flex items-center justify-center transition shrink-0 text-xs cursor-pointer ${showStickerPicker ? "bg-[#A8421B]/10 text-[#A8421B]" : "hover:bg-[#FAF8F4] dark:hover:bg-[#26211D] text-[#6E655E] dark:text-[#B6ABA0]"}`}
              >
                🎓
              </button>

              {/* Compose field */}
              <form onSubmit={handleSubmitMessage} className="flex-1 flex items-center space-x-2 relative">
                {isRecording ? (
                  <div className="flex-grow flex items-center justify-between rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 px-3.5 py-1.5 z-30">
                    <div className="flex items-center space-x-1.5 text-rose-700 dark:text-rose-300 text-[11px]">
                      <Mic className="h-4 w-4" />
                      <span className="font-bold">Recording voice note ({recordTimer}s)</span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono">
                      <button 
                        type="button" 
                        onClick={stopRecordingAndSend}
                        className="bg-[#A8421B] text-white rounded px-2.5 py-0.5 text-[9.5px] font-bold uppercase cursor-pointer"
                      >
                        Send
                      </button>
                      <button 
                        type="button" 
                        onClick={cancelRecording}
                        className="text-[9.5px] text-[#6E655E] font-bold uppercase cursor-pointer"
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
                    placeholder={currentUser ? "Write a message..." : "Sign in to write a message..."}
                    disabled={!currentUser || Boolean(channelAccessError)}
                    className="w-full rounded-xl border border-[#E7E1D8] dark:border-[#332C26] bg-[#FAF8F4] dark:bg-[#141210] px-3.5 py-2 text-xs outline-none focus:border-[#A8421B] text-[#1F1B18] dark:text-[#F5F1EB] placeholder-[#6E655E]/70 cursor-text"
                  />
                )}

                {!chatInput.trim() && !realAttachedFile && !simulatedAttachment && !isRecording ? (
                  <button 
                    type="button"
                    onClick={startRecording}
                    title="Voice note"
                    className="h-9 w-9 rounded-xl bg-[#EFECE6] dark:bg-[#26211D] hover:bg-[#A8421B] hover:text-white text-[#1F1B18] dark:text-[#F5F1EB] flex items-center justify-center transition shrink-0 cursor-pointer"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                ) : (
                  <button 
                    type="submit"
                    className="h-9 w-9 rounded-xl bg-[#A8421B] hover:bg-[#8F3614] text-white flex items-center justify-center transition shrink-0 cursor-pointer shadow-xs"
                  >
                    <Send className="h-4 w-4" />
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
