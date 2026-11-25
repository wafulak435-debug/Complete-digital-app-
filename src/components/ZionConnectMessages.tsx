import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MessageSquare,
  Phone,
  Video,
  Search,
  Paperclip,
  Smile,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  Mic,
  ChevronLeft,
  X,
  Edit3,
  Trash2,
  Reply,
  ShieldAlert,
  Play,
  Pause,
  Send,
  Sparkles,
  Lock,
  Clock,
  Archive,
  Ban,
  Flag,
  Plus,
  VideoOff,
  PhoneOff,
  Eye,
  EyeOff,
  BadgeCheck,
} from "lucide-react";
import { CommunityMessage, User } from "../types";
import { secureApiFetch } from "../lib/aiClient";
import zionLogo from "../assets/images/zion_digital_logo_1781070536038.png";

export interface DmConversation {
  id: string;
  participants: string[];
  disappearingTimer: "off" | "24h" | "7d";
  archivedBy: string[];
  mutedBy: string[];
  updatedAt: string;
  lastMessagePreview?: string;
}

export interface DmAttachment {
  id: string;
  kind: "image" | "video" | "audio" | "document";
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes?: number;
}

export interface DmMessage {
  id: string;
  conversationId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  replyToId?: string;
  attachments?: DmAttachment[];
  reactions?: Record<string, string[]>;
  readBy: string[];
  edited?: boolean;
  deleted?: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface SocialProfileEntry {
  email: string;
  name: string;
  headline?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  location?: string;
  onlineStatusVisible?: boolean;
  lastSeenAt?: string;
  skills?: string[];
  updatedAt: string;
}

export interface ChannelDef {
  id: string;
  name: string;
  desc: string;
  kind: "group" | "dm";
  avatar?: string;
  roleTitle?: string;
  online?: boolean;
  skills?: string[];
}

export interface PeerDirectoryItem {
  id: string;
  name: string;
  email?: string;
  title: string;
  avatar: string;
  verified: boolean;
  skills: string[];
  channelId: string;
}

interface ZionConnectMessagesProps {
  currentUser: User | null;
  onLogIn: () => void;
  freeMode: boolean;
  messages: CommunityMessage[];
  onSendMessage: (text: string, parentId?: string, channelName?: string, extras?: any) => void;
  onDeleteMessage: (id: string) => void;
  onEditMessage?: (id: string, text: string) => void;
  isLoading?: boolean;
  channels: ChannelDef[];
  peers: PeerDirectoryItem[];
  profiles: SocialProfileEntry[];
  blockedEmails: string[];
  connectedPeerIds: string[];
  onToggleConnectPeer: (peerId: string, peerName: string) => void;
  onRefreshProfiles: () => void;
  initialDmTarget?: { email: string; name: string } | null;
  onClearDmTarget?: () => void;
  initialChannelId?: string | null;
  onClearInitialChannel?: () => void;
  onTriggerToast: (msg: string) => void;
  onOpenFriends: () => void;
  isAdmin: boolean;
  isWorker: boolean;
}

const QUICK_EMOJIS = ["😄", "🙏", "🔥", "🎉", "📚", "🎓", "🌟", "💡", "🌍", "🤝", "❤️", "🙌"];
const DM_REACTIONS = ["🙏", "❤️", "👍", "🔥", "🎉"];
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
  { emoji: "🌱", label: "Keep Growing" },
];

export default function ZionConnectMessages({
  currentUser,
  onLogIn,
  freeMode,
  messages,
  onSendMessage,
  onDeleteMessage,
  onEditMessage,
  isLoading = false,
  channels,
  peers,
  profiles,
  blockedEmails,
  connectedPeerIds,
  onToggleConnectPeer,
  onRefreshProfiles,
  initialDmTarget,
  onClearDmTarget,
  initialChannelId,
  onClearInitialChannel,
  onTriggerToast,
  onOpenFriends,
  isAdmin,
  isWorker,
}: ZionConnectMessagesProps) {
  const [messengerMode, setMessengerMode] = useState<"private_dm" | "channels">(
    initialDmTarget ? "private_dm" : "private_dm"
  );
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(true);

  // ---------------- PRIVATE 1-TO-1 DM STATE ----------------
  const [dmConversations, setDmConversations] = useState<DmConversation[]>([]);
  const [activeDmId, setActiveDmId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<DmMessage[]>([]);
  const [dmSearchQuery, setDmSearchQuery] = useState("");
  const [showArchivedDms, setShowArchivedDms] = useState(false);
  const [dmInput, setDmInput] = useState("");
  const [dmReplyTo, setDmReplyTo] = useState<DmMessage | null>(null);
  const [dmEditingId, setDmEditingId] = useState<string | null>(null);
  const [dmEditingText, setDmEditingText] = useState("");
  const [dmAttachment, setDmAttachment] = useState<{
    kind: "image" | "video" | "audio" | "document";
    name: string;
    mimeType: string;
    dataUrl: string;
    sizeBytes: number;
  } | null>(null);
  const [dmRecording, setDmRecording] = useState(false);
  const [dmRecordSeconds, setDmRecordSeconds] = useState(0);
  const dmMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const dmAudioChunksRef = useRef<Blob[]>([]);
  const dmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // New DM modal
  const [showNewDmModal, setShowNewDmModal] = useState(false);
  const [newDmEmail, setNewDmEmail] = useState("");
  const [newDmName, setNewDmName] = useState("");

  // Online visibility preference
  const [onlineVisible, setOnlineVisible] = useState(true);

  // Free Mode click-to-load media unlock cache
  const [unlockedMediaIds, setUnlockedMediaIds] = useState<Record<string, boolean>>({});

  // WebRTC Call Modal State
  const [activeCall, setActiveCall] = useState<{
    conversationId: string;
    peerName: string;
    callType: "audio" | "video";
    statusText: string;
    mediaWarning?: string;
  } | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnRef = useRef<RTCPeerConnection | null>(null);

  // DM File Refs
  const dmPhotoRef = useRef<HTMLInputElement>(null);
  const dmVideoRef = useRef<HTMLInputElement>(null);
  const dmAudioRef = useRef<HTMLInputElement>(null);
  const dmDocRef = useRef<HTMLInputElement>(null);
  const dmFeedRef = useRef<HTMLDivElement>(null);

  // ---------------- COMMUNITY CHANNELS STATE ----------------
  const [activeChannel, setActiveChannel] = useState<string>(initialChannelId || "#General");
  const [chatInput, setChatInput] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<CommunityMessage | null>(null);
  const [serverChannelMessages, setServerChannelMessages] = useState<CommunityMessage[]>([]);
  const [channelAccessError, setChannelAccessError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [realAttachedFile, setRealAttachedFile] = useState<{
    name: string;
    type: "photo" | "doc";
    dataUrl: string;
    sizeStr: string;
  } | null>(null);

  const myEmail = currentUser?.email?.toLowerCase() || "";

  useEffect(() => {
    if (initialChannelId) {
      setMessengerMode("channels");
      setActiveChannel(initialChannelId);
      onClearInitialChannel?.();
    }
  }, [initialChannelId, onClearInitialChannel]);

  // Sync my online visibility from loaded profiles
  useEffect(() => {
    if (!myEmail) return;
    const mine = profiles.find((p) => p.email.toLowerCase() === myEmail);
    if (mine && typeof mine.onlineStatusVisible === "boolean") {
      setOnlineVisible(mine.onlineStatusVisible);
    }
  }, [profiles, myEmail]);

  const loadDmConversations = useCallback(async () => {
    if (!currentUser) {
      setDmConversations([]);
      return;
    }
    try {
      const res = await secureApiFetch("/api/dm/conversations");
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.conversations)) {
        setDmConversations(data.conversations);
        if (!activeDmId && data.conversations.length > 0) {
          setActiveDmId(data.conversations[0].id);
        }
      }
    } catch {
      // ignore offline
    }
  }, [currentUser, activeDmId]);

  useEffect(() => {
    loadDmConversations();
  }, [loadDmConversations]);

  const startOrOpenDm = useCallback(
    async (peerEmail: string, peerName?: string) => {
      if (!currentUser) {
        onLogIn();
        return;
      }
      const cleanEmail = peerEmail.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes("@")) {
        onTriggerToast("Enter a valid member email address to message privately.");
        return;
      }
      try {
        const res = await secureApiFetch("/api/dm/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ peerEmail: cleanEmail, peerName: peerName || cleanEmail }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          onTriggerToast(data?.error || "Could not open private conversation.");
          return;
        }
        const conv: DmConversation = data.conversation;
        setMessengerMode("private_dm");
        setDmConversations((prev) => {
          const without = prev.filter((c) => c.id !== conv.id);
          return [conv, ...without];
        });
        setActiveDmId(conv.id);
        setShowSidebarMobile(false);
        setShowNewDmModal(false);
        setNewDmEmail("");
        setNewDmName("");
      } catch {
        onTriggerToast("Unable to connect to messaging service.");
      }
    },
    [currentUser, onLogIn, onTriggerToast]
  );

  // Handle incoming DM handoff (e.g. from Professional Hub or Friends directory)
  useEffect(() => {
    if (initialDmTarget && initialDmTarget.email) {
      setMessengerMode("private_dm");
      startOrOpenDm(initialDmTarget.email, initialDmTarget.name).finally(() => {
        onClearDmTarget?.();
      });
    }
  }, [initialDmTarget, startOrOpenDm, onClearDmTarget]);

  const loadDmMessages = useCallback(async () => {
    if (!currentUser || !activeDmId || messengerMode !== "private_dm") return;
    try {
      const res = await secureApiFetch(`/api/dm/conversations/${encodeURIComponent(activeDmId)}/messages`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.messages)) {
        setDmMessages(data.messages);
      }
    } catch {
      // ignore
    }
  }, [currentUser, activeDmId, messengerMode]);

  useEffect(() => {
    loadDmMessages();
  }, [loadDmMessages]);

  useEffect(() => {
    if (dmFeedRef.current && messengerMode === "private_dm") {
      dmFeedRef.current.scrollTop = dmFeedRef.current.scrollHeight;
    }
  }, [dmMessages, messengerMode]);

  // Poll incoming call signals when in a DM
  useEffect(() => {
    if (!currentUser || !activeDmId || messengerMode !== "private_dm") return;
    const interval = setInterval(async () => {
      try {
        const res = await secureApiFetch(`/api/dm/call-signal/${encodeURIComponent(activeDmId)}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data?.signals)) {
          const latest = data.signals[data.signals.length - 1];
          if (latest && latest.fromEmail !== myEmail && latest.signalType === "offer" && !activeCall) {
            setActiveCall({
              conversationId: activeDmId,
              peerName: latest.fromEmail,
              callType: latest.callType || "audio",
              statusText: `Incoming ${latest.callType} call signal from ${latest.fromEmail}`,
            });
          } else if (latest && latest.signalType === "end" && activeCall) {
            stopWebRtcCall(false);
          }
        }
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser, activeDmId, messengerMode, myEmail, activeCall]);

  const getPeerDisplay = (conv: DmConversation) => {
    const otherEmail = conv.participants.find((p) => p.toLowerCase() !== myEmail) || conv.participants[0] || "";
    const prof = profiles.find((p) => p.email.toLowerCase() === otherEmail.toLowerCase());
    const dir = peers.find((p) => p.email?.toLowerCase() === otherEmail.toLowerCase());
    return {
      email: otherEmail,
      name: prof?.name || dir?.name || otherEmail.split("@")[0] || "Zion Member",
      avatar: prof?.avatar || dir?.avatar || zionLogo,
      headline: prof?.headline || dir?.title || "Private 1-to-1 Participant",
      skills: prof?.skills || dir?.skills || ["Fellowship"],
      onlineVisible: prof?.onlineStatusVisible ?? true,
      lastSeenAt: prof?.lastSeenAt,
    };
  };

  const activeDmConv = dmConversations.find((c) => c.id === activeDmId) || null;
  const activeDmPeer = activeDmConv ? getPeerDisplay(activeDmConv) : null;

  const visibleDmConversations = useMemo(() => {
    return dmConversations.filter((c) => {
      const archived = c.archivedBy.includes(myEmail);
      return showArchivedDms ? archived : !archived;
    });
  }, [dmConversations, myEmail, showArchivedDms]);

  const visibleDmMessages = useMemo(() => {
    const q = dmSearchQuery.toLowerCase().trim();
    if (!q) return dmMessages;
    return dmMessages.filter(
      (m) =>
        m.text.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        (m.attachments || []).some((a) => a.name.toLowerCase().includes(q))
    );
  }, [dmMessages, dmSearchQuery]);

  // ---------------- DM FILE & VOICE HANDLERS ----------------
  const handleDmFilePick = (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "image" | "video" | "audio" | "document"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setDmAttachment({
        kind,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl: reader.result as string,
        sizeBytes: file.size,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startDmVoiceRecord = async () => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    setDmRecording(true);
    setDmRecordSeconds(0);
    dmAudioChunksRef.current = [];
    dmTimerRef.current = setInterval(() => {
      setDmRecordSeconds((s) => s + 1);
    }, 1000);

    try {
      if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        dmMediaRecorderRef.current = rec;
        rec.ondataavailable = (ev) => {
          if (ev.data.size > 0) dmAudioChunksRef.current.push(ev.data);
        };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
        };
        rec.start();
      }
    } catch {
      // Fallback: continue timer for voice memo duration marker if mic blocked
    }
  };

  const stopDmVoiceAndSend = async () => {
    if (dmTimerRef.current) clearInterval(dmTimerRef.current);
    const secs = Math.max(1, dmRecordSeconds);
    setDmRecording(false);
    setDmRecordSeconds(0);

    const rec = dmMediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      await new Promise<void>((resolve) => {
        rec.addEventListener(
          "stop",
          () => {
            const blob = new Blob(dmAudioChunksRef.current, { type: "audio/webm" });
            const reader = new FileReader();
            reader.onload = async () => {
              await sendDmPayload(`Voice Note (0:${String(secs).padStart(2, "0")})`, [
                {
                  kind: "audio",
                  name: `voice-note-${Date.now()}.webm`,
                  mimeType: "audio/webm",
                  dataUrl: reader.result as string,
                  sizeBytes: blob.size,
                },
              ]);
              resolve();
            };
            reader.readAsDataURL(blob);
          },
          { once: true }
        );
        rec.stop();
      });
      dmMediaRecorderRef.current = null;
      return;
    }

    await sendDmPayload(`Voice Memo (${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")})`, []);
  };

  const cancelDmVoiceRecord = () => {
    if (dmTimerRef.current) clearInterval(dmTimerRef.current);
    if (dmMediaRecorderRef.current && dmMediaRecorderRef.current.state !== "inactive") {
      dmMediaRecorderRef.current.stop();
    }
    dmMediaRecorderRef.current = null;
    setDmRecording(false);
    setDmRecordSeconds(0);
  };

  const sendDmPayload = async (
    textVal: string,
    atts?: {
      kind: "image" | "video" | "audio" | "document";
      name: string;
      mimeType: string;
      dataUrl: string;
      sizeBytes: number;
    }[]
  ) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!activeDmId) return;
    const attachmentsToSend = atts ?? (dmAttachment ? [dmAttachment] : []);
    if (!textVal.trim() && attachmentsToSend.length === 0) return;

    try {
      const res = await secureApiFetch(
        `/api/dm/conversations/${encodeURIComponent(activeDmId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: textVal.trim(),
            replyToId: dmReplyTo?.id,
            attachments: attachmentsToSend,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onTriggerToast(data?.error || "Message could not be delivered.");
        return;
      }
      setDmMessages((prev) => [...prev, data.message]);
      setDmInput("");
      setDmReplyTo(null);
      setDmAttachment(null);
      loadDmConversations();
    } catch {
      onTriggerToast("Failed to send private message.");
    }
  };

  const handleUpdateDmSettings = async (patch: {
    disappearingTimer?: "off" | "24h" | "7d";
    archived?: boolean;
  }) => {
    if (!activeDmId) return;
    try {
      const res = await secureApiFetch(
        `/api/dm/conversations/${encodeURIComponent(activeDmId)}/settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.conversation) {
        setDmConversations((prev) =>
          prev.map((c) => (c.id === activeDmId ? data.conversation : c))
        );
        if (patch.disappearingTimer) {
          onTriggerToast(
            patch.disappearingTimer === "off"
              ? "Disappearing messages turned off."
              : `Messages set to auto-expire after ${patch.disappearingTimer}.`
          );
        } else if (typeof patch.archived === "boolean") {
          onTriggerToast(patch.archived ? "Conversation archived." : "Conversation unarchived.");
        }
      }
    } catch {
      onTriggerToast("Could not update conversation settings.");
    }
  };

  const handleSaveDmEdit = async (msgId: string) => {
    if (!dmEditingText.trim()) return;
    try {
      const res = await secureApiFetch(`/api/dm/messages/${encodeURIComponent(msgId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: dmEditingText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.message) {
        setDmMessages((prev) => prev.map((m) => (m.id === msgId ? data.message : m)));
        setDmEditingId(null);
      }
    } catch {
      onTriggerToast("Failed to edit message.");
    }
  };

  const handleDeleteDmMessage = async (msgId: string) => {
    try {
      const res = await secureApiFetch(`/api/dm/messages/${encodeURIComponent(msgId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDmMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } catch {
      onTriggerToast("Failed to delete message.");
    }
  };

  const handleReactDmMessage = async (msgId: string, emoji: string) => {
    try {
      const res = await secureApiFetch(`/api/dm/messages/${encodeURIComponent(msgId)}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.reactions) {
        setDmMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, reactions: data.reactions } : m))
        );
      }
    } catch {
      // ignore
    }
  };

  const handleToggleBlockPeer = async (peerEmail: string) => {
    try {
      const res = await secureApiFetch("/api/connect/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: peerEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onRefreshProfiles();
        onTriggerToast(data.isBlocked ? `Blocked ${peerEmail}.` : `Unblocked ${peerEmail}.`);
      }
    } catch {
      onTriggerToast("Could not update block status.");
    }
  };

  const handleReportPeer = async (targetId: string) => {
    try {
      const res = await secureApiFetch("/api/connect/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "direct_conversation",
          targetId,
          reason: "Reported by conversation participant for safety review.",
        }),
      });
      if (res.ok) {
        onTriggerToast("Safety report submitted to moderation desk.");
      }
    } catch {
      onTriggerToast("Unable to file report.");
    }
  };

  const handleToggleOnlineStatus = async () => {
    if (!currentUser) return;
    const nextVal = !onlineVisible;
    setOnlineVisible(nextVal);
    try {
      await secureApiFetch("/api/connect/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlineStatusVisible: nextVal }),
      });
      onRefreshProfiles();
      onTriggerToast(nextVal ? "Online status is visible." : "Online status hidden.");
    } catch {
      // ignore
    }
  };

  // ---------------- WEBRTC CALL HANDLERS ----------------
  const startWebRtcCall = async (callType: "audio" | "video") => {
    if (!currentUser || !activeDmId || !activeDmPeer) {
      onLogIn();
      return;
    }

    let mediaWarning: string | undefined;
    let statusText = `Connecting ${callType} call with ${activeDmPeer.name}...`;

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video",
        });
        localStreamRef.current = stream;
        setTimeout(() => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        }, 80);

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peerConnRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        pc.ontrack = (ev) => {
          if (remoteVideoRef.current && ev.streams[0]) {
            remoteVideoRef.current.srcObject = ev.streams[0];
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await secureApiFetch("/api/dm/call-signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeDmId,
            callType,
            signalType: "offer",
            payload: offer,
          }),
        });
        statusText = `Signaling active — awaiting ${activeDmPeer.name}`;
      } else {
        mediaWarning = "Browser WebRTC media devices unavailable in this context.";
        statusText = "Signaling unavailable without media devices.";
      }
    } catch {
      mediaWarning = "Microphone/camera permission unavailable or declined. Signaling sent without local media.";
      await secureApiFetch("/api/dm/call-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeDmId,
          callType,
          signalType: "offer",
          payload: { fallback: true },
        }),
      }).catch(() => {});
      statusText = `Signaling sent — awaiting ${activeDmPeer.name}`;
    }

    setActiveCall({
      conversationId: activeDmId,
      peerName: activeDmPeer.name,
      callType,
      statusText,
      mediaWarning,
    });
  };

  const stopWebRtcCall = async (notifyPeer = true) => {
    const convId = activeCall?.conversationId || activeDmId;
    const callType = activeCall?.callType || "audio";
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnRef.current) {
      peerConnRef.current.close();
      peerConnRef.current = null;
    }
    setActiveCall(null);
    if (notifyPeer && convId) {
      await secureApiFetch("/api/dm/call-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          callType,
          signalType: "end",
          payload: null,
        }),
      }).catch(() => {});
    }
  };

  // ---------------- LEGACY / PUBLIC COMMUNITY CHANNELS LOGIC ----------------
  useEffect(() => {
    if (messengerMode !== "channels") return;
    let active = true;
    setChannelAccessError(null);
    secureApiFetch(`/api/community/messages?channel=${encodeURIComponent(activeChannel)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.status === 403) {
          setChannelAccessError(
            data?.error ||
              "Restricted room: Only verified tutors, managers, and administrators may view #workers."
          );
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
  }, [activeChannel, currentUser?.email, currentUser?.role, messengerMode]);

  useEffect(() => {
    if (chatFeedRef.current && messengerMode === "channels") {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messages, serverChannelMessages, activeChannel, messengerMode]);

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

  const mergedChannelMessages = useMemo(() => {
    const map = new Map<string, CommunityMessage>();
    for (const m of messages) map.set(m.id, m);
    for (const m of serverChannelMessages) map.set(m.id, m);
    return Array.from(map.values());
  }, [messages, serverChannelMessages]);

  const publicChannels = useMemo(
    () => channels.filter((c) => c.kind === "group" && (c.id !== "#workers" || isWorker)),
    [channels, isWorker]
  );

  const activeChannelDef =
    publicChannels.find((c) => c.id === activeChannel) || publicChannels[0] || channels[0];

  const filteredChannelMessages = mergedChannelMessages.filter((m) => {
    const msgChan = normalizeChannel(m.channel);
    if (msgChan === "#workers" && !isWorker) return false;
    const isChannelMatch = msgChan === activeChannel;
    const q = messageSearchQuery.toLowerCase();
    const isSearchMatch =
      !q || m.text.toLowerCase().includes(q) || m.userName.toLowerCase().includes(q);
    return isChannelMatch && isSearchMatch;
  });
  const rootChannelMessages = filteredChannelMessages.filter((m) => !m.parentId);

  const startChannelRecording = () => {
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

  const stopChannelRecordingAndSend = () => {
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    setIsRecording(false);
    const formattedTime = `${Math.floor(recordTimer / 60)}:${(recordTimer % 60)
      .toString()
      .padStart(2, "0")}`;
    const textToSend = `Simulated Voice Note (${formattedTime})`;
    onSendMessage(textToSend, replyToMessage?.id, activeChannel);
    secureApiFetch("/api/community/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: activeChannel,
        text: textToSend,
        parentId: replyToMessage?.id,
      }),
    }).catch(() => {});
    setRecordTimer(0);
  };

  const cancelChannelRecording = () => {
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    setIsRecording(false);
    setRecordTimer(0);
  };

  const handleNativeFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "photo" | "doc"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + " MB";
    const reader = new FileReader();
    reader.onload = () => {
      setRealAttachedFile({
        name: file.name,
        type: fileType,
        dataUrl: reader.result as string,
        sizeStr,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitChannelMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!chatInput.trim() && !realAttachedFile) return;

    let extras: any = {};
    let textToSend = chatInput.trim();
    if (realAttachedFile) {
      if (realAttachedFile.type === "photo") {
        extras = { imageContent: realAttachedFile.dataUrl };
        textToSend = textToSend || "Shared a workspace image";
      } else {
        extras = {
          attachedFile: {
            name: realAttachedFile.name,
            type: realAttachedFile.type,
            dataUrl: realAttachedFile.dataUrl,
            sizeStr: realAttachedFile.sizeStr,
          },
        };
        textToSend = textToSend || `Shared file: ${realAttachedFile.name}`;
      }
      setRealAttachedFile(null);
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

  const handleSendStickerMsg = (stickerEmoji: string, label: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    onSendMessage(label, replyToMessage?.id, activeChannel, { stickerEmoji });
    setReplyToMessage(null);
    setShowStickerPicker(false);
    setShowEmojiPicker(false);
  };

  const isPeerBlocked = Boolean(activeDmPeer && blockedEmails.includes(activeDmPeer.email.toLowerCase()));

  return (
    <div className="space-y-3">
      {/* Hidden native inputs */}
      <input type="file" accept="image/*" ref={dmPhotoRef} className="hidden" onChange={(e) => handleDmFilePick(e, "image")} />
      <input type="file" accept="video/*" ref={dmVideoRef} className="hidden" onChange={(e) => handleDmFilePick(e, "video")} />
      <input type="file" accept="audio/*" ref={dmAudioRef} className="hidden" onChange={(e) => handleDmFilePick(e, "audio")} />
      <input type="file" accept=".pdf,.doc,.docx,.txt" ref={dmDocRef} className="hidden" onChange={(e) => handleDmFilePick(e, "document")} />
      <input type="file" accept="image/*" ref={photoInputRef} className="hidden" onChange={(e) => handleNativeFileSelected(e, "photo")} />
      <input type="file" accept=".pdf,.doc,.docx,.txt" ref={docInputRef} className="hidden" onChange={(e) => handleNativeFileSelected(e, "doc")} />

      {/* Top Messenger Mode Switcher Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMessengerMode("private_dm")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              messengerMode === "private_dm"
                ? "bg-[#0B254D] text-[#F5B82E]"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Private 1-to-1 DMs</span>
          </button>
          <button
            type="button"
            onClick={() => setMessengerMode("channels")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
              messengerMode === "channels"
                ? "bg-[#155EEF] text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Community Channels</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
            <Lock className="h-3 w-3" />
            <span>Participant-Locked Private Messaging</span>
          </span>
          {currentUser && (
            <button
              type="button"
              onClick={handleToggleOnlineStatus}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              title="Toggle your online/last-seen visibility"
            >
              {onlineVisible ? <Eye className="h-3 w-3 text-emerald-600" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
              <span>{onlineVisible ? "Online Visible" : "Status Hidden"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================== MODE 1: PRIVATE 1-TO-1 DMs ===================== */}
      {messengerMode === "private_dm" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          {/* Left DM Thread List */}
          <div
            className={`lg:col-span-4 xl:col-span-3 border-r border-slate-200 dark:border-slate-800 flex flex-col ${
              showSidebarMobile ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="bg-[#0B254D] text-white px-3.5 py-3 flex items-center justify-between gap-2">
              <span className="font-display text-sm font-bold tracking-tight">Private DMs</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowArchivedDms((p) => !p)}
                  className={`h-7 px-2 rounded-lg text-[10px] font-semibold cursor-pointer ${
                    showArchivedDms ? "bg-[#F5B82E] text-[#0B254D]" : "bg-white/10 text-white"
                  }`}
                  title="Toggle archived chats"
                >
                  <Archive className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser) {
                      onLogIn();
                      return;
                    }
                    setShowNewDmModal(true);
                  }}
                  className="h-7 w-7 rounded-lg bg-[#155EEF] hover:bg-blue-500 flex items-center justify-center text-white transition cursor-pointer"
                  title="New private chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={dmSearchQuery}
                  onChange={(e) => setDmSearchQuery(e.target.value)}
                  placeholder="Search messages inside thread..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-[#155EEF]"
                />
              </div>
            </div>

            {!currentUser ? (
              <div className="p-5 text-center space-y-3">
                <Lock className="h-7 w-7 text-[#155EEF] mx-auto" />
                <p className="text-xs text-slate-500">Sign in to access your private 1-to-1 conversations.</p>
                <button
                  type="button"
                  onClick={onLogIn}
                  className="w-full rounded-xl bg-[#155EEF] text-white py-2 text-xs font-semibold cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            ) : visibleDmConversations.length === 0 ? (
              <div className="p-5 text-center space-y-2.5 text-xs text-slate-500">
                <p>{showArchivedDms ? "No archived chats." : "No private conversations yet."}</p>
                {!showArchivedDms && (
                  <button
                    type="button"
                    onClick={() => setShowNewDmModal(true)}
                    className="rounded-xl bg-[#155EEF] text-white px-3.5 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Start Private Chat
                  </button>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {visibleDmConversations.map((conv) => {
                  const peer = getPeerDisplay(conv);
                  const isActive = activeDmId === conv.id;
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        setActiveDmId(conv.id);
                        setDmReplyTo(null);
                        setShowSidebarMobile(false);
                      }}
                      className={`w-full p-3 flex items-center gap-3 text-left transition cursor-pointer ${
                        isActive ? "bg-[#EFF6FF] dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={peer.avatar}
                          alt={peer.name}
                          className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                        />
                        {peer.onlineVisible && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-[#0B254D] dark:text-white truncate">
                            {peer.name}
                          </span>
                          {conv.disappearingTimer !== "off" && (
                            <span className="text-[9px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              {conv.disappearingTimer}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {conv.lastMessagePreview || peer.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Middle Active Private DM Thread */}
          <div
            className={`flex flex-col min-w-0 ${
              showProfileDrawer ? "lg:col-span-8 xl:col-span-6" : "lg:col-span-8 xl:col-span-9"
            } ${!showSidebarMobile ? "flex" : "hidden lg:flex"}`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowSidebarMobile(true)}
                  className="lg:hidden p-1 text-[#155EEF] cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <img
                  src={activeDmPeer?.avatar || zionLogo}
                  alt={activeDmPeer?.name || "Private Chat"}
                  className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-[#0B254D] dark:text-white truncate">
                    {activeDmPeer ? activeDmPeer.name : "Select or Start a Private DM"}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {activeDmPeer
                      ? activeDmPeer.onlineVisible
                        ? "Online · Participant-locked"
                        : "Participant-locked 1-to-1"
                      : "Strictly private to participants"}
                  </p>
                </div>
              </div>

              {activeDmConv && activeDmPeer && (
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <label className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200">
                    <Clock className="h-3 w-3 text-[#155EEF]" />
                    <select
                      value={activeDmConv.disappearingTimer}
                      onChange={(e) =>
                        handleUpdateDmSettings({
                          disappearingTimer: e.target.value as "off" | "24h" | "7d",
                        })
                      }
                      className="bg-transparent outline-none font-semibold cursor-pointer"
                      title="Disappearing messages timer"
                    >
                      <option value="off">Timer: Off</option>
                      <option value="24h">24 Hours</option>
                      <option value="7d">7 Days</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => startWebRtcCall("audio")}
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                    title="Start voice call"
                  >
                    <Phone className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startWebRtcCall("video")}
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                    title="Start video call"
                  >
                    <Video className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateDmSettings({
                        archived: !activeDmConv.archivedBy.includes(myEmail),
                      })
                    }
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                    title={activeDmConv.archivedBy.includes(myEmail) ? "Unarchive" : "Archive"}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleBlockPeer(activeDmPeer.email)}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer ${
                      isPeerBlocked
                        ? "bg-rose-100 text-rose-700"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                    title={isPeerBlocked ? "Unblock user" : "Block user"}
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReportPeer(activeDmConv.id)}
                    className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                    title="Report safety issue"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Message Feed */}
            <div
              ref={dmFeedRef}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-50/70 dark:bg-slate-950/50 max-h-[460px]"
            >
              {!activeDmConv ? (
                <div className="text-center py-16 space-y-3 text-slate-500">
                  <Lock className="h-9 w-9 mx-auto text-[#155EEF]/60" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Your 1-to-1 messages stay strictly between you and the recipient.
                  </p>
                  <button
                    type="button"
                    onClick={() => (currentUser ? setShowNewDmModal(true) : onLogIn())}
                    className="rounded-xl bg-[#155EEF] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    {currentUser ? "+ Start Private Conversation" : "Sign In to Message"}
                  </button>
                </div>
              ) : visibleDmMessages.length === 0 ? (
                <div className="text-center py-14 text-xs text-slate-500 space-y-1.5">
                  <MessageSquare className="h-7 w-7 mx-auto text-slate-300" />
                  <p>Send a message, voice memo, photo, video, or study document to {activeDmPeer?.name}.</p>
                </div>
              ) : (
                visibleDmMessages.map((m) => {
                  const isMe = m.senderEmail.toLowerCase() === myEmail;
                  const parentMsg = m.replyToId ? dmMessages.find((x) => x.id === m.replyToId) : null;
                  const unlockedHere = Boolean(unlockedMediaIds[m.id]);

                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${
                        isMe ? "ml-auto flex-row-reverse text-right" : "mr-auto text-left"
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-left space-y-1.5 shadow-2xs ${
                          isMe
                            ? "bg-[#155EEF] text-white rounded-br-xs"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs"
                        }`}
                      >
                        {parentMsg && (
                          <div
                            className={`rounded-lg px-2 py-1 text-[10px] border-l-2 ${
                              isMe
                                ? "bg-white/15 border-[#F5B82E] text-blue-50"
                                : "bg-slate-100 dark:bg-slate-900 border-[#155EEF] text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            <span className="font-bold">{parentMsg.senderName}: </span>
                            <span className="truncate">{parentMsg.text}</span>
                          </div>
                        )}

                        {m.attachments && m.attachments.length > 0 && (
                          <div className="space-y-1.5">
                            {m.attachments.map((att) => {
                              if (att.kind === "image") {
                                return freeMode && !unlockedHere ? (
                                  <button
                                    key={att.id}
                                    type="button"
                                    onClick={() => setUnlockedMediaIds((p) => ({ ...p, [m.id]: true }))}
                                    className="rounded-xl border border-dashed border-current px-3 py-2 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Free Mode: Tap to load image ({att.name})
                                  </button>
                                ) : (
                                  <img
                                    key={att.id}
                                    src={att.dataUrl}
                                    alt={att.name}
                                    className="rounded-xl max-h-52 object-cover"
                                  />
                                );
                              }
                              if (att.kind === "video") {
                                return freeMode && !unlockedHere ? (
                                  <button
                                    key={att.id}
                                    type="button"
                                    onClick={() => setUnlockedMediaIds((p) => ({ ...p, [m.id]: true }))}
                                    className="rounded-xl border border-dashed border-current px-3 py-2 text-[11px] font-semibold cursor-pointer"
                                  >
                                    Free Mode: Tap to load video ({att.name})
                                  </button>
                                ) : (
                                  <video key={att.id} controls src={att.dataUrl} className="rounded-xl max-h-52 w-full" />
                                );
                              }
                              if (att.kind === "audio") {
                                return (
                                  <audio key={att.id} controls src={att.dataUrl} className="max-w-[230px] h-8" />
                                );
                              }
                              return (
                                <a
                                  key={att.id}
                                  href={att.dataUrl}
                                  download={att.name}
                                  className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 px-3 py-2 text-xs"
                                >
                                  <span className="truncate font-semibold">{att.name}</span>
                                  <span className="text-[10px] font-bold text-[#155EEF]">Save</span>
                                </a>
                              );
                            })}
                          </div>
                        )}

                        {dmEditingId === m.id ? (
                          <div className="space-y-1.5 min-w-[200px]">
                            <textarea
                              value={dmEditingText}
                              onChange={(e) => setDmEditingText(e.target.value)}
                              className="w-full text-xs p-2 rounded-lg bg-white text-slate-900 border border-slate-300"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveDmEdit(m.id)}
                                className="bg-emerald-600 text-white px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setDmEditingId(null)}
                                className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          m.text && (
                            <p className="text-xs leading-relaxed break-words whitespace-pre-wrap">
                              {m.text}
                              {m.edited && <span className="ml-1 text-[9px] opacity-70">(edited)</span>}
                            </p>
                          )
                        )}

                        {/* Emoji reactions strip */}
                        {m.reactions && (Object.values(m.reactions) as string[][]).some((arr) => Array.isArray(arr) && arr.length > 0) && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {(Object.entries(m.reactions) as [string, string[]][])
                              .filter(([, users]) => Array.isArray(users) && users.length > 0)
                              .map(([em, users]) => (
                                <button
                                  key={em}
                                  type="button"
                                  onClick={() => handleReactDmMessage(m.id, em)}
                                  className="rounded-full bg-black/15 px-1.5 py-0.5 text-[10px] cursor-pointer"
                                >
                                  {em} {users.length}
                                </button>
                              ))}
                          </div>
                        )}

                        <div
                          className={`flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[10px] ${
                            isMe ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {isMe && <CheckCheck className="h-3 w-3" />}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {DM_REACTIONS.slice(0, 3).map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => handleReactDmMessage(m.id, em)}
                                className="hover:scale-110 transition cursor-pointer"
                                title={`React ${em}`}
                              >
                                {em}
                              </button>
                            ))}
                            <button type="button" onClick={() => setDmReplyTo(m)} className="hover:underline cursor-pointer">
                              Reply
                            </button>
                            {isMe && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDmEditingId(m.id);
                                    setDmEditingText(m.text);
                                  }}
                                  className="hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDmMessage(m.id)}
                                  className="hover:underline cursor-pointer"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {dmReplyTo && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                <span className="truncate text-[#0B254D] dark:text-blue-200">
                  Replying to <strong>{dmReplyTo.senderName}</strong>: &ldquo;{dmReplyTo.text}&rdquo;
                </span>
                <button type="button" onClick={() => setDmReplyTo(null)} className="cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {dmAttachment && (
              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                  Staged {dmAttachment.kind}: {dmAttachment.name}
                </span>
                <button type="button" onClick={() => setDmAttachment(null)} className="cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* DM Composer */}
            {activeDmConv && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendDmPayload(dmInput);
                }}
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-1.5"
              >
                <button
                  type="button"
                  onClick={() => dmPhotoRef.current?.click()}
                  className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                  title="Attach photo"
                >
                  <ImageIcon className="h-4 w-4 text-[#155EEF]" />
                </button>
                <button
                  type="button"
                  onClick={() => dmVideoRef.current?.click()}
                  className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                  title="Attach video"
                >
                  <Video className="h-4 w-4 text-rose-500" />
                </button>
                <button
                  type="button"
                  onClick={() => dmDocRef.current?.click()}
                  className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                  title="Attach document"
                >
                  <Paperclip className="h-4 w-4 text-amber-600" />
                </button>

                {dmRecording ? (
                  <div className="flex-1 flex items-center justify-between rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 px-3 py-1.5 text-xs">
                    <span className="font-semibold text-rose-700 dark:text-rose-300">
                      Recording voice memo ({dmRecordSeconds}s)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={stopDmVoiceAndSend}
                        className="rounded-lg bg-[#155EEF] text-white px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                      >
                        Send
                      </button>
                      <button
                        type="button"
                        onClick={cancelDmVoiceRecord}
                        className="text-slate-500 text-[11px] font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={dmInput}
                    onChange={(e) => setDmInput(e.target.value)}
                    disabled={isPeerBlocked}
                    placeholder={
                      isPeerBlocked
                        ? "You blocked this user. Unblock to message."
                        : `Message ${activeDmPeer?.name || "privately"}...`
                    }
                    className="flex-1 min-w-[140px] rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs outline-none focus:border-[#155EEF]"
                  />
                )}

                {!dmInput.trim() && !dmAttachment && !dmRecording ? (
                  <button
                    type="button"
                    onClick={startDmVoiceRecord}
                    className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#155EEF] hover:text-white text-slate-600 dark:text-slate-200 flex items-center justify-center shrink-0 transition cursor-pointer"
                    title="Record voice note"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isPeerBlocked}
                    className="h-9 w-9 rounded-full bg-[#155EEF] hover:bg-[#0F49C7] text-white flex items-center justify-center shrink-0 transition cursor-pointer disabled:opacity-40"
                    title="Send private message"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                )}
              </form>
            )}
          </div>

          {/* Right Participant Details Drawer */}
          {showProfileDrawer && (
            <aside className="hidden xl:flex xl:col-span-3 border-l border-slate-200 dark:border-slate-800 flex-col p-4 space-y-5 bg-slate-50/40 dark:bg-slate-900">
              {activeDmPeer ? (
                <>
                  <div className="text-center space-y-2 pt-2">
                    <img
                      src={activeDmPeer.avatar}
                      alt={activeDmPeer.name}
                      className="h-20 w-20 rounded-full object-cover mx-auto border-2 border-[#155EEF]/30 shadow-xs"
                    />
                    <div className="flex items-center justify-center gap-1">
                      <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                        {activeDmPeer.name}
                      </h3>
                      <BadgeCheck className="h-4 w-4 text-[#155EEF]" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{activeDmPeer.headline}</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{activeDmPeer.email}</p>
                  </div>

                  <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                    <h4 className="text-xs font-bold text-[#0B254D] dark:text-white">Privacy Guarantee</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Only {activeDmPeer.name} and you can read or participate in this thread. Administrators cannot view private 1-to-1 messages.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-3 pt-4">
                  <h4 className="text-xs font-bold text-[#0B254D] dark:text-white">Quick Contacts</h4>
                  {peers.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => p.email && startOrOpenDm(p.email, p.name)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-left cursor-pointer"
                    >
                      <img src={p.avatar} alt={p.name} className="h-8 w-8 rounded-full object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#0B254D] dark:text-white truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{p.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>
      )}

      {/* ===================== MODE 2: COMMUNITY CHANNELS ===================== */}
      {messengerMode === "channels" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          <div
            className={`lg:col-span-4 xl:col-span-3 border-r border-slate-200 dark:border-slate-800 flex flex-col ${
              showSidebarMobile ? "flex" : "hidden lg:flex"
            }`}
          >
            <div className="bg-[#0B254D] text-white px-3.5 py-3 flex items-center justify-between gap-2">
              <span className="font-display text-sm font-bold tracking-tight">Fellowship Rooms</span>
              <button
                type="button"
                onClick={() => {
                  setMessageSearchQuery("");
                  setShowSidebarMobile(false);
                  setTimeout(() => chatInputRef.current?.focus(), 60);
                }}
                className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  placeholder="Filter channel messages..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-[#155EEF]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {publicChannels.map((chan) => {
                const isActive = activeChannel === chan.id;
                const chanCount = mergedChannelMessages.filter(
                  (m) => normalizeChannel(m.channel) === chan.id
                ).length;
                return (
                  <button
                    key={chan.id}
                    type="button"
                    onClick={() => {
                      setActiveChannel(chan.id);
                      setReplyToMessage(null);
                      setShowSidebarMobile(false);
                    }}
                    className={`w-full p-3 flex items-center gap-3 text-left transition cursor-pointer ${
                      isActive ? "bg-[#EFF6FF] dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <img
                      src={chan.avatar || zionLogo}
                      alt={chan.name}
                      className="h-10 w-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-[#0B254D] dark:text-white truncate">
                          {chan.name}
                        </span>
                        {chanCount > 0 && (
                          <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                            {chanCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{chan.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`flex flex-col min-w-0 ${
              showProfileDrawer ? "lg:col-span-8 xl:col-span-6" : "lg:col-span-8 xl:col-span-9"
            } ${!showSidebarMobile ? "flex" : "hidden lg:flex"}`}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowSidebarMobile(true)}
                  className="lg:hidden p-1 text-[#155EEF] cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <img
                  src={activeChannelDef?.avatar || zionLogo}
                  alt={activeChannelDef?.name}
                  className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-[#0B254D] dark:text-white truncate">
                    {activeChannelDef?.name}
                  </h2>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {activeChannelDef?.desc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileDrawer((p) => !p)}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-[#EFF6FF] text-[#155EEF] cursor-pointer"
              >
                Directory
              </button>
            </div>

            <div
              ref={chatFeedRef}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/70 dark:bg-slate-950/50 max-h-[460px]"
            >
              {channelAccessError ? (
                <div className="max-w-md mx-auto my-10 p-5 rounded-2xl border border-rose-200 bg-rose-50 text-center space-y-2">
                  <ShieldAlert className="h-6 w-6 text-rose-600 mx-auto" />
                  <h4 className="font-bold text-xs text-rose-800">Restricted Staff Room</h4>
                  <p className="text-xs text-rose-700">{channelAccessError}</p>
                </div>
              ) : isLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 w-56" />
                  ))}
                </div>
              ) : rootChannelMessages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 space-y-2">
                  <MessageSquare className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Start chatting in {activeChannelDef?.name}
                  </p>
                </div>
              ) : (
                rootChannelMessages.map((m) => {
                  const isMe = Boolean(currentUser && m.userId?.toLowerCase() === myEmail);
                  const repliesList = mergedChannelMessages.filter((rep) => rep.parentId === m.id);
                  const canDelete = Boolean(isAdmin || isMe);
                  const isVoiceNote = m.text.includes("Simulated Voice Note");
                  const unlockedHere = Boolean(unlockedMediaIds[m.id]);

                  return (
                    <div key={m.id} className="space-y-2">
                      <div
                        className={`flex items-end gap-2 max-w-[85%] sm:max-w-[75%] ${
                          isMe ? "ml-auto flex-row-reverse text-right" : "mr-auto text-left"
                        }`}
                      >
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-left space-y-1.5 shadow-2xs ${
                            isMe
                              ? "bg-[#155EEF] text-white rounded-br-xs"
                              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs"
                          }`}
                        >
                          {!isMe && (
                            <p className="text-[11px] font-bold text-[#0B254D] dark:text-blue-300">
                              {m.userName}
                            </p>
                          )}
                          {m.stickerEmoji && (
                            <div className="p-2 rounded-xl bg-white/15 text-center">
                              <div className="text-3xl">{m.stickerEmoji}</div>
                              <span className="text-[10px] font-semibold">{m.text}</span>
                            </div>
                          )}
                          {m.imageContent &&
                            (freeMode && !unlockedHere ? (
                              <button
                                type="button"
                                onClick={() => setUnlockedMediaIds((p) => ({ ...p, [m.id]: true }))}
                                className="rounded-xl border border-dashed border-current px-3 py-2 text-[11px] font-semibold cursor-pointer"
                              >
                                Free Mode: Tap to view photo
                              </button>
                            ) : (
                              <img
                                src={m.imageContent}
                                alt="Shared media"
                                className="rounded-xl max-h-48 object-cover border border-white/20"
                              />
                            ))}
                          {m.attachedFile && (
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 text-xs">
                              <span className="truncate font-semibold">{m.attachedFile.name}</span>
                              <a
                                href={m.attachedFile.url || m.attachedFile.dataUrl}
                                download={m.attachedFile.name}
                                className="rounded-lg bg-[#155EEF] text-white px-2 py-1 text-[10px] font-semibold shrink-0"
                              >
                                Get
                              </a>
                            </div>
                          )}
                          {editingMessageId === m.id ? (
                            <div className="space-y-1.5 min-w-[200px]">
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg bg-white text-slate-900 border border-slate-300"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingText.trim() && onEditMessage) {
                                      onEditMessage(m.id, editingText.trim());
                                    }
                                    setEditingMessageId(null);
                                  }}
                                  className="bg-emerald-600 text-white px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingMessageId(null)}
                                  className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : isVoiceNote ? (
                            <div className="flex items-center gap-2 py-0.5">
                              <button
                                type="button"
                                onClick={() => setPlayingVoiceId((p) => (p === m.id ? null : m.id))}
                                className="h-7 w-7 rounded-full bg-white text-[#155EEF] flex items-center justify-center cursor-pointer"
                              >
                                {playingVoiceId === m.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                              </button>
                              <span className="text-[11px] font-mono">{m.text}</span>
                            </div>
                          ) : (
                            (!m.stickerEmoji || m.imageContent || m.attachedFile) &&
                            m.text.trim() && (
                              <p className="text-xs leading-relaxed break-words whitespace-pre-wrap">{m.text}</p>
                            )
                          )}
                          <div className={`flex items-center justify-between gap-3 pt-0.5 text-[10px] ${isMe ? "text-blue-100" : "text-slate-400"}`}>
                            <span>{m.time}</span>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setReplyToMessage(m)} className="hover:underline cursor-pointer">
                                <Reply className="h-3 w-3 inline" />
                              </button>
                              {isMe && onEditMessage && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessageId(m.id);
                                    setEditingText(m.text);
                                  }}
                                  className="hover:underline cursor-pointer"
                                >
                                  Edit
                                </button>
                              )}
                              {canDelete && (
                                <button type="button" onClick={() => onDeleteMessage(m.id)} className="hover:underline cursor-pointer">
                                  <Trash2 className="h-3 w-3 inline" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {repliesList.length > 0 && (
                        <div className="pl-8 space-y-1.5">
                          {repliesList.map((rep) => (
                            <div
                              key={rep.id}
                              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs max-w-[85%]"
                            >
                              <span className="font-bold text-[#155EEF] mr-1.5">{rep.userName}:</span>
                              <span>{rep.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {replyToMessage && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-t border-blue-200 flex items-center justify-between text-xs">
                <span className="truncate">
                  Replying to <strong>{replyToMessage.userName}</strong>: &ldquo;{replyToMessage.text}&rdquo;
                </span>
                <button type="button" onClick={() => setReplyToMessage(null)} className="cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {realAttachedFile && (
              <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-800 truncate">
                  Attached: {realAttachedFile.name} ({realAttachedFile.sizeStr})
                </span>
                <button type="button" onClick={() => setRealAttachedFile(null)} className="cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {showEmojiPicker && (
              <div className="p-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
                {QUICK_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setChatInput((p) => p + em)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-base cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            {showStickerPicker && (
              <div className="p-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 gap-1.5">
                {STUDY_STICKERS.map((st) => (
                  <button
                    key={st.emoji}
                    type="button"
                    onClick={() => handleSendStickerMsg(st.emoji, st.label)}
                    className="p-1.5 rounded-lg border border-slate-200 text-center cursor-pointer"
                  >
                    <div className="text-xl">{st.emoji}</div>
                    <span className="text-[9px] text-slate-500 block truncate">{st.label}</span>
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSubmitChannelMessage}
              className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 relative"
            >
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker((p) => !p);
                  setShowStickerPicker(false);
                  setIsAttachmentOpen(false);
                }}
                className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Smile className="h-4 w-4" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachmentOpen((p) => !p);
                    setShowEmojiPicker(false);
                    setShowStickerPicker(false);
                  }}
                  className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                {isAttachmentOpen && (
                  <div className="absolute bottom-11 left-0 w-48 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 z-30">
                    <button
                      type="button"
                      onClick={() => {
                        photoInputRef.current?.click();
                        setIsAttachmentOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                    >
                      <ImageIcon className="h-4 w-4 text-[#155EEF]" />
                      <span>Upload Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        docInputRef.current?.click();
                        setIsAttachmentOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                    >
                      <FileText className="h-4 w-4 text-amber-600" />
                      <span>Upload Document</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAttachmentOpen(false);
                        setShowStickerPicker(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <span>Study Stickers</span>
                    </button>
                  </div>
                )}
              </div>

              {isRecording ? (
                <div className="flex-1 flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs">
                  <span className="font-semibold text-rose-700">Recording voice memo ({recordTimer}s)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={stopChannelRecordingAndSend}
                      className="rounded-lg bg-[#155EEF] text-white px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
                    >
                      Send
                    </button>
                    <button
                      type="button"
                      onClick={cancelChannelRecording}
                      className="text-slate-500 text-[11px] font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={!currentUser || Boolean(channelAccessError)}
                  placeholder={currentUser ? `Message ${activeChannelDef?.name}...` : "Sign in to chat..."}
                  className="flex-1 min-w-0 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs outline-none focus:border-[#155EEF]"
                />
              )}

              {!chatInput.trim() && !realAttachedFile && !isRecording ? (
                <button
                  type="button"
                  onClick={startChannelRecording}
                  className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-[#155EEF] hover:text-white flex items-center justify-center shrink-0 transition cursor-pointer"
                >
                  <Mic className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="h-9 w-9 rounded-full bg-[#155EEF] hover:bg-[#0F49C7] text-white flex items-center justify-center shrink-0 transition cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>

          {showProfileDrawer && (
            <aside className="hidden xl:flex xl:col-span-3 border-l border-slate-200 dark:border-slate-800 flex-col p-4 space-y-4 bg-slate-50/40 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#0B254D] dark:text-white">
                  Fellowship Peers ({peers.length})
                </h4>
                <button type="button" onClick={onOpenFriends} className="text-[11px] font-semibold text-[#155EEF] hover:underline cursor-pointer">
                  Directory &gt;
                </button>
              </div>
              <div className="space-y-2.5">
                {peers.map((peer) => {
                  const isConnected = connectedPeerIds.includes(peer.id);
                  return (
                    <div key={peer.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <img src={peer.avatar} alt={peer.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0B254D] dark:text-white truncate">{peer.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{peer.title}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => onToggleConnectPeer(peer.id, peer.name)}
                          className={`flex-1 rounded-lg py-1 text-[10px] font-semibold cursor-pointer ${
                            isConnected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-[#155EEF] text-white"
                          }`}
                        >
                          {isConnected ? "Connected" : "Connect"}
                        </button>
                        <button
                          type="button"
                          onClick={() => peer.email && startOrOpenDm(peer.email, peer.name)}
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 py-1 text-[10px] font-semibold cursor-pointer"
                        >
                          Private DM
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}
        </div>
      )}

      {/* NEW PRIVATE DM MODAL */}
      {showNewDmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                New Participant-Locked Private DM
              </h3>
              <button type="button" onClick={() => setShowNewDmModal(false)} className="cursor-pointer">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase">Quick Select Peer</p>
              <div className="flex flex-wrap gap-1.5">
                {peers
                  .filter((p) => p.email && p.email.toLowerCase() !== myEmail)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => p.email && startOrOpenDm(p.email, p.name)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-[#EFF6FF] cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                startOrOpenDm(newDmEmail, newDmName);
              }}
              className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={newDmEmail}
                  onChange={(e) => setNewDmEmail(e.target.value)}
                  placeholder="member@ziondigital.co.ke"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Display Name</label>
                <input
                  type="text"
                  value={newDmName}
                  onChange={(e) => setNewDmName(e.target.value)}
                  placeholder="Optional name"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-[#155EEF] text-white font-semibold py-2.5 text-xs cursor-pointer"
              >
                Open Private Chat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WEBRTC VOICE & VIDEO CALL MODAL */}
      {activeCall && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B254D] text-white border border-white/15 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#F5B82E]">
                  {activeCall.callType === "video" ? "WebRTC Video Call" : "WebRTC Voice Call"}
                </span>
                <h3 className="font-display text-base font-bold">{activeCall.peerName}</h3>
                <p className="text-xs text-blue-200">{activeCall.statusText}</p>
              </div>
              <button type="button" onClick={() => stopWebRtcCall(true)} className="cursor-pointer">
                <X className="h-5 w-5 text-white/70" />
              </button>
            </div>

            {activeCall.mediaWarning && (
              <div className="rounded-xl bg-amber-500/20 border border-amber-400/40 p-3 text-xs text-amber-100 flex items-start gap-2">
                <VideoOff className="h-4 w-4 shrink-0 mt-0.5 text-[#F5B82E]" />
                <span>{activeCall.mediaWarning}</span>
              </div>
            )}

            {activeCall.callType === "video" && !activeCall.mediaWarning && (
              <div className="grid grid-cols-2 gap-2">
                <video ref={localVideoRef} autoPlay muted playsInline className="rounded-xl bg-black aspect-video w-full object-cover" />
                <video ref={remoteVideoRef} autoPlay playsInline className="rounded-xl bg-black aspect-video w-full object-cover" />
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => stopWebRtcCall(true)}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 text-xs font-bold cursor-pointer"
              >
                <PhoneOff className="h-4 w-4" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
