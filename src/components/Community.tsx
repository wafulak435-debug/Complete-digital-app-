import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  MessageSquare,
  Trash2,
  Search,
  Image as ImageIcon,
  X,
  Megaphone,
  Pin,
  Home,
  User as UserIcon,
  Users,
  Film,
  ShoppingBag,
  Calendar,
  Bot,
  Plus,
  ThumbsUp,
  Share2,
  MapPin,
  BadgeCheck,
  Play,
  UserPlus,
  Smile,
  ChevronRight,
  Wifi,
  WifiOff,
  Repeat2,
  Flag,
  Bookmark,
  Send,
  Shield,
  Lock,
  Globe,
  Upload,
  Hash,
  Sparkles,
  Copy,
} from "lucide-react";
import { CommunityMessage, User } from "../types";
import { secureApiFetch } from "../lib/aiClient";
import ZionConnectMessages, {
  ChannelDef,
  PeerDirectoryItem,
  SocialProfileEntry,
} from "./ZionConnectMessages";
import zionLogo from "../assets/images/zion_digital_logo_1781070536038.png";
import seminarImg from "../assets/images/slide_leadership_seminar_1795421934895.jpg";
import bibleImg from "../assets/images/slide_bible_school_1795421934851.jpg";
import sermonImg from "../assets/images/slide_sermon_media_1795421934360.jpg";
import bookstoreImg from "../assets/images/slide_bookstore_volumes_1795421934714.jpg";
import academyImg from "../assets/images/slide_computer_academy_1795421934691.jpg";

export function isUserWorker(user: User | null): boolean {
  if (!user) return false;
  return ["main_admin", "admin", "sub_admin", "manager", "tutor"].includes(user.role);
}

interface CommunityProps {
  currentUser: User | null;
  onLogIn: () => void;
  onLogOut?: () => void;
  messages: CommunityMessage[];
  onSendMessage: (text: string, parentId?: string, channelName?: string, extras?: any) => void;
  onDeleteMessage: (id: string) => void;
  onEditMessage?: (id: string, text: string) => void;
  broadcastAnnouncement: string;
  onUpdateBroadcastAnnouncement?: (msg: string) => void;
  isLoading?: boolean;
  onNavigate?: (view: string) => void;
  initialDmTarget?: { email: string; name: string } | null;
  onClearDmTarget?: () => void;
}

type ConnectSection =
  | "feed"
  | "messages"
  | "profile"
  | "friends"
  | "groups"
  | "reels"
  | "events"
  | "ai";

const CHANNELS_AND_CHATS: ChannelDef[] = [
  {
    id: "#General",
    name: "AUCU Family",
    desc: "Welcome lounge, daily reflections & fellowship",
    kind: "group",
    avatar: seminarImg,
    roleTitle: "Community Fellowship Hall",
    online: true,
    skills: ["Fellowship", "Prayer", "Devotions", "Events"],
  },
  {
    id: "#Bible Study",
    name: "Bible Study Group",
    desc: "Scripture reflections across all 66 NIV books",
    kind: "group",
    avatar: sermonImg,
    roleTitle: "Weekly Scripture Study",
    online: true,
    skills: ["Theology", "Scripture", "Apologetics", "Discipleship"],
  },
  {
    id: "#Book Talks",
    name: "Book Talks",
    desc: "Discuss chapters, highlights & reading notes",
    kind: "group",
    avatar: bookstoreImg,
    roleTitle: "Bookstore Readers Circle",
    online: true,
    skills: ["Literature", "Reviews", "Summaries", "Quotes"],
  },
  {
    id: "#Leadership",
    name: "Leadership Forum",
    desc: "Cohort strategy, ethics & stewardship",
    kind: "group",
    avatar: seminarImg,
    roleTitle: "Zion School Cohort",
    online: true,
    skills: ["Leadership", "Governance", "Ethics", "Stewardship"],
  },
  {
    id: "#Publishing",
    name: "Publishing Desk",
    desc: "Manuscript drafting & editorial peer review",
    kind: "group",
    avatar: bookstoreImg,
    roleTitle: "Authors & Editors",
    online: false,
    skills: ["Writing", "Editing", "Publishing", "Research"],
  },
  {
    id: "#Computing",
    name: "Computing Lab",
    desc: "Programming, ICT & digital systems study",
    kind: "group",
    avatar: academyImg,
    roleTitle: "ICT & Web Engineering",
    online: true,
    skills: ["ICT", "TypeScript", "Security", "Cloud"],
  },
  {
    id: "#workers",
    name: "Staff & Faculty Room",
    desc: "Verified room for tutors, managers & admins",
    kind: "group",
    avatar: zionLogo,
    roleTitle: "Restricted Faculty Channel",
    online: true,
    skills: ["Administration", "Moderation", "Finance", "Faculty"],
  },
];

interface AnnouncementNotice {
  id: string;
  text: string;
  date: string;
  author: string;
}

interface FeedPost {
  id: string;
  userName: string;
  userEmail?: string;
  roleLabel?: string;
  verified?: boolean;
  avatar?: string;
  timeLabel: string;
  text: string;
  imageUrl?: string;
  feeling?: string;
  location?: string;
  likes: number;
  reactions?: Record<string, number>;
  repostOf?: string;
}

interface StoryItem {
  id: string;
  name: string;
  avatar: string;
  caption: string;
  time: string;
}

interface ServerReel {
  id: string;
  title: string;
  authorName: string;
  authorEmail: string;
  description: string;
  hashtags: string[];
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  views: number;
  likes: string[];
  comments: { id: string; userName: string; userEmail: string; text: string; createdAt: string }[];
  createdAt: string;
}

interface ServerPlaylist {
  id: string;
  ownerEmail: string;
  name: string;
  reelIds: string[];
  updatedAt: string;
}

interface ServerGroup {
  id: string;
  name: string;
  category: string;
  description: string;
  privacy: "public" | "private";
  coverUrl: string;
  creatorEmail: string;
  admins: string[];
  moderators: string[];
  members: string[];
  invitedEmails: string[];
  events: { id: string; title: string; date: string; location: string; rsvps: string[] }[];
  discussions: { id: string; userName: string; userEmail: string; text: string; createdAt: string }[];
  createdAt: string;
}

const DEFAULT_STORIES: StoryItem[] = [
  {
    id: "st_1",
    name: "Faith",
    avatar: bibleImg,
    caption: "Morning devotion from Psalm 23 before today's leadership lecture.",
    time: "1h ago",
  },
  {
    id: "st_2",
    name: "Grace",
    avatar: sermonImg,
    caption: "Preparing choir worship set for Sunday Fellowship in Bungoma.",
    time: "2h ago",
  },
  {
    id: "st_3",
    name: "Kelvin",
    avatar: seminarImg,
    caption: "New books and 8-4-4 / CBC academic portal updates are live!",
    time: "3h ago",
  },
  {
    id: "st_4",
    name: "Mary",
    avatar: bookstoreImg,
    caption: "Halfway through 'Rising Beyond Limitations' — powerful chapters.",
    time: "5h ago",
  },
  {
    id: "st_5",
    name: "John",
    avatar: academyImg,
    caption: "ICT lab session: building faith-driven digital communities.",
    time: "6h ago",
  },
];

const PEER_DIRECTORY: PeerDirectoryItem[] = [
  {
    id: "peer_kelvin",
    name: "Kelvin Wafula",
    email: "wafulak435@gmail.com",
    title: "Teacher | Leader | Servant of God",
    avatar: zionLogo,
    verified: true,
    skills: ["Leadership", "Teaching", "ICT", "Education", "Ministry"],
    channelId: "#Leadership",
  },
  {
    id: "peer_grace",
    name: "Grace Achieng",
    email: "grace.achieng@ziondigital.co.ke",
    title: "Bible Study Coordinator · Bungoma",
    avatar: bibleImg,
    verified: true,
    skills: ["Bible Study", "Worship", "Counseling", "Choir"],
    channelId: "#Bible Study",
  },
  {
    id: "peer_david",
    name: "David Ochieng",
    email: "david.ochieng@ziondigital.co.ke",
    title: "Youth Leader · Computing Track",
    avatar: academyImg,
    verified: true,
    skills: ["ICT", "TypeScript", "Audio Media", "Youth"],
    channelId: "#Computing",
  },
  {
    id: "peer_mary",
    name: "Mary Wanjiku",
    email: "mary.wanjiku@ziondigital.co.ke",
    title: "Book Club Editor · Nairobi",
    avatar: bookstoreImg,
    verified: false,
    skills: ["Publishing", "Proofreading", "Book Reviews"],
    channelId: "#Book Talks",
  },
  {
    id: "peer_john",
    name: "John Mwangi",
    email: "john.mwangi@ziondigital.co.ke",
    title: "Theology Scholar · Cohort 2026",
    avatar: sermonImg,
    verified: false,
    skills: ["Theology", "Ethics", "Public Speaking"],
    channelId: "#Bible Study",
  },
];

const INITIAL_FEED_POSTS: FeedPost[] = [
  {
    id: "seed_post_1",
    userName: "Pastor Kelvin Wafula",
    userEmail: "wafulak435@gmail.com",
    roleLabel: "Chancellor & Lead Educator",
    verified: true,
    avatar: zionLogo,
    timeLabel: "2h ago · Public",
    text: "The Lord is good all the time! Welcome to #ZionConnect — tag friends like @grace or explore #PraiseGod and #Leadership for fellowship and study insights.",
    imageUrl: seminarImg,
    location: "Zion Digital Hall, Bungoma",
    likes: 48,
    reactions: { "🙏": 18, "❤️": 14, "🔥": 9 },
  },
  {
    id: "seed_post_2",
    userName: "Grace Achieng",
    userEmail: "grace.achieng@ziondigital.co.ke",
    roleLabel: "Fellowship Coordinator",
    verified: true,
    avatar: bibleImg,
    timeLabel: "5h ago · Bible Study",
    text: "Tonight's #BibleStudy covers Proverbs 4:7 — 'Wisdom is the principal thing; therefore get wisdom.' Join us with @kelvin in the #Fellowship room at 7:00 PM EAT!",
    imageUrl: bibleImg,
    feeling: "Blessed",
    likes: 31,
    reactions: { "🙏": 12, "❤️": 8 },
  },
];

const REACTION_CHOICES = [
  { emoji: "🙏", label: "Amen" },
  { emoji: "❤️", label: "Love" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "👍", label: "Like" },
];

export default function Community({
  currentUser,
  onLogIn,
  onLogOut,
  messages,
  onSendMessage,
  onDeleteMessage,
  onEditMessage,
  broadcastAnnouncement,
  onUpdateBroadcastAnnouncement,
  isLoading = false,
  onNavigate,
  initialDmTarget,
  onClearDmTarget,
}: CommunityProps) {
  const [section, setSection] = useState<ConnectSection>(initialDmTarget ? "messages" : "feed");
  const [globalSearch, setGlobalSearch] = useState("");
  const [activeHashtag, setActiveHashtag] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Free Mode vs Data Mode (honest bandwidth saver — pauses heavy autoplay / images until tapped)
  const [freeMode, setFreeMode] = useState<boolean>(() => {
    return localStorage.getItem("ZION_CONNECT_FREE_MODE") === "true";
  });
  const [loadedPostImages, setLoadedPostImages] = useState<Record<string, boolean>>({});
  const [loadedReelVideos, setLoadedReelVideos] = useState<Record<string, boolean>>({});

  // Connected Social Backend State
  const [profiles, setProfiles] = useState<SocialProfileEntry[]>([]);
  const [followingEmails, setFollowingEmails] = useState<string[]>([]);
  const [blockedEmails, setBlockedEmails] = useState<string[]>([]);

  // Stories & Reels state
  const [stories, setStories] = useState<StoryItem[]>(DEFAULT_STORIES);
  const [activeStory, setActiveStory] = useState<StoryItem | null>(null);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [newStoryCaption, setNewStoryCaption] = useState("");

  const [reels, setReels] = useState<ServerReel[]>([]);
  const [playlists, setPlaylists] = useState<ServerPlaylist[]>([]);
  const [activeReel, setActiveReel] = useState<ServerReel | null>(null);
  const [reelCommentDraft, setReelCommentDraft] = useState("");
  const [showUploadReelModal, setShowUploadReelModal] = useState(false);
  const [reelTitle, setReelTitle] = useState("");
  const [reelDesc, setReelDesc] = useState("");
  const [reelHashtags, setReelHashtags] = useState("#ChristianReels #ZionConnect");
  const [reelVideoUrl, setReelVideoUrl] = useState("");
  const [reelThumbUrl, setReelThumbUrl] = useState("");
  const [isUploadingReel, setIsUploadingReel] = useState(false);

  // Groups backend state
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("Fellowship");
  const [newGroupPrivacy, setNewGroupPrivacy] = useState<"public" | "private">("public");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [groupDiscussionDraft, setGroupDiscussionDraft] = useState("");
  const [groupInviteEmail, setGroupInviteEmail] = useState("");
  const [groupEventTitle, setGroupEventTitle] = useState("");
  const [groupEventDate, setGroupEventDate] = useState("");
  const [groupEventLocation, setGroupEventLocation] = useState("Online Fellowship");

  // Feed posts & composer
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(INITIAL_FEED_POSTS);
  const [likedPostIds, setLikedPostIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ZION_LIKED_POSTS") || "[]");
    } catch {
      return [];
    }
  });
  const [myPostReactions, setMyPostReactions] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<
    Record<string, { id: string; userName: string; text: string; date: string }[]>
  >({});
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [sharePost, setSharePost] = useState<FeedPost | null>(null);

  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postFeeling, setPostFeeling] = useState<string>("");
  const [postLocation, setPostLocation] = useState<string>("");
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const feedPhotoInputRef = useRef<HTMLInputElement>(null);

  // Profile editor state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profName, setProfName] = useState(currentUser?.name || "");
  const [profHeadline, setProfHeadline] = useState("");
  const [profBio, setProfBio] = useState("");
  const [profLocation, setProfLocation] = useState("Bungoma, Kenya");
  const [profSkills, setProfSkills] = useState("Leadership, Fellowship, Study");
  const [profAvatar, setProfAvatar] = useState("");
  const [profCover, setProfCover] = useState("");
  const [profOnlineVisible, setProfOnlineVisible] = useState(true);

  // Connected Peers (legacy local + backend follow sync)
  const [connectedPeerIds, setConnectedPeerIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ZION_CONNECTED_PEERS") || '["peer_kelvin","peer_grace"]');
    } catch {
      return ["peer_kelvin", "peer_grace"];
    }
  });

  // Channel & Peer DM redirect
  const [pendingChannelId, setPendingChannelId] = useState<string | null>(null);
  const [pendingPeerTarget, setPendingPeerTarget] = useState<{ email: string; name: string } | null>(null);

  // Zion Connect AI Assistant state
  const [aiMode, setAiMode] = useState<"fellowship" | "caption" | "summarize">("fellowship");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiHistory, setAiHistory] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<{ dayCount: number; dayLimit: number } | null>(null);

  // Announcements state (Events & Bulletin)
  const [announcements, setAnnouncements] = useState<AnnouncementNotice[]>(() => {
    const saved = localStorage.getItem("WAFULA_ANNOUNCEMENTS_LIST");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      {
        id: "announce_1",
        text: "Welcome to the 2026 Academic Cohort! Access study lectures, peer uploads, and books in Zion Digital safely.",
        date: "2026-05-24",
        author: "Kelvin Opara Wafula",
      },
      {
        id: "announce_2",
        text: "Zero-Charge Guarantee: Core learning lectures are 100% free globally. Accredited diplomas require verified checkout.",
        date: "2026-05-23",
        author: "Executive Admin Team",
      },
      {
        id: "announce_3",
        text: "Diplomas Open: Complete your Leadership Placement Exam under the School portal and claim your verified credentials.",
        date: "2026-05-22",
        author: "Kelvin Opara Wafula",
      },
    ];
  });
  const [announcementInput, setAnnouncementInput] = useState("");
  const [showAnnouncementMaker, setShowAnnouncementMaker] = useState(false);

  const isAdmin = Boolean(
    currentUser &&
      (["main_admin", "admin"].includes(currentUser.role) ||
        (currentUser.role === "sub_admin" && currentUser.permissions?.allowModeration))
  );

  const triggerToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3200);
    return () => clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    localStorage.setItem("ZION_CONNECT_FREE_MODE", String(freeMode));
  }, [freeMode]);

  useEffect(() => {
    localStorage.setItem("WAFULA_ANNOUNCEMENTS_LIST", JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    if (broadcastAnnouncement && !announcements.some((a) => a.text === broadcastAnnouncement)) {
      const next: AnnouncementNotice = {
        id: "announce_sync_" + Date.now(),
        text: broadcastAnnouncement,
        date: new Date().toISOString().split("T")[0],
        author: "Chancellor Kelvin",
      };
      setAnnouncements((prev) => [next, ...prev.filter((x) => !x.id.startsWith("announce_sync_"))]);
    }
  }, [broadcastAnnouncement, announcements]);

  // Switch to messages immediately if initialDmTarget arrives
  useEffect(() => {
    if (initialDmTarget?.email) {
      setSection("messages");
    }
  }, [initialDmTarget]);

  const loadProfilesAndSocial = useCallback(async () => {
    try {
      const res = await secureApiFetch("/api/connect/profiles");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setProfiles(data.profiles || []);
        setFollowingEmails(data.following || []);
        setBlockedEmails(data.blocked || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadReelsAndPlaylists = useCallback(async () => {
    try {
      const rRes = await fetch("/api/reels").then((r) => r.json()).catch(() => null);
      if (rRes?.success && Array.isArray(rRes.reels)) {
        setReels(rRes.reels);
      }
      if (currentUser) {
        const pRes = await secureApiFetch("/api/reels/playlists").then((r) => r.json()).catch(() => null);
        if (pRes?.success && Array.isArray(pRes.playlists)) {
          setPlaylists(pRes.playlists);
        }
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  const loadGroups = useCallback(async () => {
    try {
      const res = await secureApiFetch("/api/groups");
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.groups)) {
        setGroups(data.groups);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadAiUsage = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await secureApiFetch("/api/ai/usage");
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.usage) {
        setAiUsage({ dayCount: data.usage.dayCount, dayLimit: data.usage.dayLimit });
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    loadProfilesAndSocial();
    loadReelsAndPlaylists();
    loadGroups();
  }, [loadProfilesAndSocial, loadReelsAndPlaylists, loadGroups, currentUser?.email]);

  useEffect(() => {
    if (section === "ai") loadAiUsage();
  }, [section, loadAiUsage]);

  // Populate profile editor from current user's stored social profile
  useEffect(() => {
    if (!currentUser) return;
    const mine = profiles.find((p) => p.email.toLowerCase() === currentUser.email.toLowerCase());
    setProfName(mine?.name || currentUser.name);
    setProfHeadline(mine?.headline || "Zion Digital Scholar & Fellow");
    setProfBio(mine?.bio || "");
    setProfLocation(mine?.location || "Bungoma, Kenya");
    setProfSkills((mine?.skills && mine.skills.length > 0 ? mine.skills : ["Leadership", "Bible Study"]).join(", "));
    setProfAvatar(mine?.avatar || "");
    setProfCover(mine?.coverImage || "");
    setProfOnlineVisible(mine?.onlineStatusVisible ?? true);
  }, [profiles, currentUser]);

  // Fetch social posts for Zion Connect feed
  useEffect(() => {
    let alive = true;
    fetch("/api/social/posts")
      .then((r) => r.json())
      .then((data) => {
        if (!alive || !Array.isArray(data?.posts)) return;
        const serverPosts = (data.posts as any[]).filter((p) => p.kind === "post" && !p.parentId);
        const mapped: FeedPost[] = serverPosts
          .map((p) => ({
            id: p.id,
            userName: p.userName || "Zion Scholar",
            userEmail: p.userEmail,
            roleLabel: p.targetId && p.targetId !== "general" ? p.targetId : "Community Member",
            verified: Boolean(p.userEmail === "wafulak435@gmail.com"),
            timeLabel: p.date || "Recent",
            text: String(p.text || ""),
            likes: 12,
          }))
          .reverse();

        const commentsMap: Record<string, { id: string; userName: string; text: string; date: string }[]> = {};
        for (const p of data.posts as any[]) {
          if (p.parentId) {
            if (!commentsMap[p.parentId]) commentsMap[p.parentId] = [];
            commentsMap[p.parentId].push({
              id: p.id,
              userName: p.userName || "Scholar",
              text: String(p.text || ""),
              date: p.date || "Recent",
            });
          }
        }
        setPostComments(commentsMap);
        setFeedPosts([...mapped, ...INITIAL_FEED_POSTS]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Rich text renderer for @mentions and #hashtags
  const renderPostText = (text: string) => {
    const tokens = text.split(/([@#][A-Za-z0-9_]+)/g);
    return tokens.map((tok, i) => {
      if (tok.startsWith("#") && tok.length > 1) {
        return (
          <button
            key={i}
            type="button"
            onClick={() => setActiveHashtag((prev) => (prev === tok ? "" : tok))}
            className="text-[#155EEF] dark:text-blue-400 font-semibold hover:underline cursor-pointer"
          >
            {tok}
          </button>
        );
      }
      if (tok.startsWith("@") && tok.length > 1) {
        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              setGlobalSearch(tok.slice(1));
              setSection("friends");
            }}
            className="text-[#0B254D] dark:text-[#F5B82E] font-bold hover:underline cursor-pointer"
          >
            {tok}
          </button>
        );
      }
      return <React.Fragment key={i}>{tok}</React.Fragment>;
    });
  };

  // Trending Hashtags extracted dynamically
  const trendingHashtags = useMemo(() => {
    const counts: Record<string, number> = {};
    const collect = (str: string) => {
      const matches = str.match(/#[A-Za-z0-9_]+/g) || [];
      for (const m of matches) {
        counts[m] = (counts[m] || 0) + 1;
      }
    };
    feedPosts.forEach((p) => collect(p.text));
    reels.forEach((r) => r.hashtags.forEach((h) => collect(h.startsWith("#") ? h : `#${h}`)));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [feedPosts, reels]);

  // Feed actions
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!postText.trim() && !postImage) return;

    setIsPublishingPost(true);
    const newPost: FeedPost = {
      id: `post_local_${Date.now()}`,
      userName: currentUser.name,
      userEmail: currentUser.email,
      roleLabel: currentUser.role.replace("_", " "),
      verified: Boolean(currentUser.isMainAdmin || currentUser.role === "main_admin"),
      timeLabel: "Just now · Public",
      text: postText.trim() || "Shared a moment",
      imageUrl: postImage || undefined,
      feeling: postFeeling || undefined,
      location: postLocation || undefined,
      likes: 1,
      reactions: {},
    };

    try {
      const res = await secureApiFetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: postLocation || "zion_connect",
          kind: "post",
          text: newPost.text,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.post?.id) {
        newPost.id = data.post.id;
      }
    } catch {
      // keep optimistic
    } finally {
      setFeedPosts((prev) => [newPost, ...prev]);
      setPostText("");
      setPostImage(null);
      setPostFeeling("");
      setPostLocation("");
      setShowFeelingPicker(false);
      setShowLocationPicker(false);
      setIsPublishingPost(false);
      triggerToast("Your post is live on Zion Connect.");
    }
  };

  const handleRepost = async (post: FeedPost) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    const repostText = `Reposted from @${post.userName.replace(/\s+/g, "")}: ${post.text}`;
    const optimistic: FeedPost = {
      id: `repost_${Date.now()}`,
      userName: currentUser.name,
      userEmail: currentUser.email,
      roleLabel: "Repost",
      timeLabel: "Just now · Repost",
      text: repostText,
      imageUrl: post.imageUrl,
      likes: 1,
      repostOf: post.userName,
    };
    setFeedPosts((prev) => [optimistic, ...prev]);
    secureApiFetch("/api/social/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: "zion_connect", kind: "post", text: repostText }),
    }).catch(() => {});
    triggerToast(`Reposted ${post.userName}'s post.`);
  };

  const handleToggleLikePost = (postId: string) => {
    setLikedPostIds((prev) => {
      const exists = prev.includes(postId);
      const next = exists ? prev.filter((id) => id !== postId) : [...prev, postId];
      localStorage.setItem("ZION_LIKED_POSTS", JSON.stringify(next));
      return next;
    });
  };

  const handleReactPost = (postId: string, emoji: string) => {
    setMyPostReactions((prev) => {
      const current = prev[postId];
      const next = { ...prev };
      if (current === emoji) {
        delete next[postId];
      } else {
        next[postId] = emoji;
      }
      return next;
    });
  };

  const handleAddPostComment = async (postId: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!commentDraft.trim()) return;
    const text = commentDraft.trim();
    const newComment = {
      id: `cmt_${Date.now()}`,
      userName: currentUser.name,
      text,
      date: new Date().toISOString().slice(0, 10),
    };
    setPostComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment],
    }));
    setCommentDraft("");
    secureApiFetch("/api/social/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: "zion_connect",
        kind: "comment",
        parentId: postId,
        text,
      }),
    }).catch(() => {});
  };

  const handleDeletePost = async (postId: string) => {
    setFeedPosts((prev) => prev.filter((p) => p.id !== postId));
    if (!postId.startsWith("seed_")) {
      secureApiFetch(`/api/social/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    triggerToast("Post removed from feed.");
  };

  const handleReportContent = async (targetType: string, targetId: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    try {
      const res = await secureApiFetch("/api/connect/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: `User reported ${targetType} for moderation review.`,
        }),
      });
      if (res.ok) triggerToast("Submitted to Zion Connect moderation team.");
    } catch {
      triggerToast("Could not submit report.");
    }
  };

  const handleFollowTarget = async (targetEmail: string, targetName: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    try {
      const res = await secureApiFetch("/api/connect/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFollowingEmails(data.following || []);
        triggerToast(data.isFollowing ? `Following ${targetName}` : `Unfollowed ${targetName}`);
      }
    } catch {
      triggerToast("Unable to update follow state.");
    }
  };

  const handleToggleConnectPeer = (peerId: string, peerName: string) => {
    setConnectedPeerIds((prev) => {
      const connected = prev.includes(peerId);
      const next = connected ? prev.filter((id) => id !== peerId) : [...prev, peerId];
      localStorage.setItem("ZION_CONNECTED_PEERS", JSON.stringify(next));
      triggerToast(connected ? `Disconnected from ${peerName}` : `Connected with ${peerName}!`);
      return next;
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    try {
      const res = await secureApiFetch("/api/connect/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profName,
          headline: profHeadline,
          bio: profBio,
          location: profLocation,
          avatar: profAvatar,
          coverImage: profCover,
          onlineStatusVisible: profOnlineVisible,
          skills: profSkills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        triggerToast(data?.error || "Failed to save profile.");
        return;
      }
      await loadProfilesAndSocial();
      setEditProfileOpen(false);
      triggerToast("Profile & cover updated.");
    } catch {
      triggerToast("Unable to save profile.");
    }
  };

  // ---------------- REELS ACTIONS ----------------
  const handleUploadReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!reelTitle.trim()) return;
    setIsUploadingReel(true);
    try {
      const res = await secureApiFetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reelTitle.trim(),
          description: reelDesc.trim(),
          hashtags: reelHashtags.split(/\s+/).filter(Boolean),
          videoUrl: reelVideoUrl.trim(),
          thumbnailUrl: reelThumbUrl.trim() || sermonImg,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        triggerToast(data?.error || "Could not upload reel.");
        return;
      }
      setReels((prev) => [data.reel, ...prev]);
      setReelTitle("");
      setReelDesc("");
      setReelVideoUrl("");
      setReelThumbUrl("");
      setShowUploadReelModal(false);
      triggerToast("Christian Reel published!");
    } catch {
      triggerToast("Failed to publish reel.");
    } finally {
      setIsUploadingReel(false);
    }
  };

  const handleOpenReel = async (reel: ServerReel) => {
    setActiveReel(reel);
    fetch(`/api/reels/${encodeURIComponent(reel.id)}/view`, { method: "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.views) {
          setReels((prev) => prev.map((x) => (x.id === reel.id ? { ...x, views: d.views } : x)));
        }
      })
      .catch(() => {});
  };

  const handleLikeReel = async (reelId: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    const res = await secureApiFetch(`/api/reels/${encodeURIComponent(reelId)}/like`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.reel) {
      setReels((prev) => prev.map((r) => (r.id === reelId ? data.reel : r)));
      if (activeReel?.id === reelId) setActiveReel(data.reel);
    }
  };

  const handleCommentReel = async (reelId: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!reelCommentDraft.trim()) return;
    const res = await secureApiFetch(`/api/reels/${encodeURIComponent(reelId)}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: reelCommentDraft.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.reel) {
      setReels((prev) => prev.map((r) => (r.id === reelId ? data.reel : r)));
      setActiveReel(data.reel);
      setReelCommentDraft("");
    }
  };

  const handleSaveReelPlaylist = async (reelId: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    const res = await secureApiFetch("/api/reels/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Saved Christian Reels", reelId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.playlist) {
      setPlaylists((prev) => {
        const rest = prev.filter((p) => p.id !== data.playlist.id);
        return [data.playlist, ...rest];
      });
      triggerToast("Updated Saved Christian Reels playlist.");
    }
  };

  // ---------------- GROUPS ACTIONS ----------------
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    if (!newGroupName.trim()) return;
    const res = await secureApiFetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newGroupName.trim(),
        category: newGroupCategory,
        privacy: newGroupPrivacy,
        description: newGroupDesc.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.group) {
      setGroups((prev) => [data.group, ...prev]);
      setActiveGroupId(data.group.id);
      setNewGroupName("");
      setNewGroupDesc("");
      setShowCreateGroupModal(false);
      triggerToast(`Created ${data.group.privacy} group "${data.group.name}".`);
    } else {
      triggerToast(data?.error || "Could not create group.");
    }
  };

  const handleGroupAction = async (
    groupId: string,
    endpoint: string,
    body?: Record<string, unknown>,
    okMsg?: string
  ) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    const res = await secureApiFetch(`/api/groups/${encodeURIComponent(groupId)}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.group) {
      setGroups((prev) => prev.map((g) => (g.id === groupId ? data.group : g)));
      if (okMsg) triggerToast(okMsg);
      return true;
    }
    triggerToast(data?.error || "Action not permitted.");
    return false;
  };

  // ---------------- AI CHAT ACTIONS ----------------
  const handleSendConnectAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    const q = aiPrompt.trim();
    if (!q || aiLoading) return;
    setAiError(null);
    setAiLoading(true);
    const nextHistory = [...aiHistory, { role: "user" as const, text: q }];
    setAiHistory(nextHistory);
    setAiPrompt("");

    try {
      const res = await secureApiFetch("/api/connect/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: q,
          mode: aiMode,
          history: nextHistory.slice(-8),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.reply) {
        setAiError(data?.error || `AI request returned status ${res.status}.`);
      } else {
        setAiHistory((prev) => [...prev, { role: "assistant", text: data.reply }]);
        loadAiUsage();
      }
    } catch {
      setAiError("Network error communicating with Zion Connect AI.");
    } finally {
      setAiLoading(false);
    }
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementInput.trim()) return;
    const freshNotice: AnnouncementNotice = {
      id: "announce_" + Date.now(),
      text: announcementInput.trim(),
      date: new Date().toISOString().split("T")[0],
      author: currentUser?.name || "Administrator",
    };
    setAnnouncements((prev) => [freshNotice, ...prev]);
    onUpdateBroadcastAnnouncement?.(announcementInput.trim());
    setAnnouncementInput("");
    setShowAnnouncementMaker(false);
    triggerToast("Campus bulletin notice published.");
  };

  const visibleFeedPosts = useMemo(() => {
    const q = globalSearch.toLowerCase().trim();
    return feedPosts.filter((p) => {
      if (p.userEmail && blockedEmails.includes(p.userEmail.toLowerCase())) return false;
      if (activeHashtag && !p.text.toLowerCase().includes(activeHashtag.toLowerCase())) return false;
      if (!q) return true;
      return (
        p.text.toLowerCase().includes(q) ||
        p.userName.toLowerCase().includes(q) ||
        (p.location || "").toLowerCase().includes(q)
      );
    });
  }, [feedPosts, globalSearch, activeHashtag, blockedEmails]);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0] || null;
  const myEmail = currentUser?.email?.toLowerCase() || "";
  const myProfile = profiles.find((p) => p.email.toLowerCase() === myEmail);

  const navItems: {
    id: ConnectSection | "marketplace";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "feed", label: "Zion Connect", icon: Home },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "profile", label: "My Profile", icon: UserIcon },
    { id: "friends", label: "Friends", icon: Users },
    { id: "groups", label: "Groups", icon: UserPlus },
    { id: "reels", label: "Reels", icon: Film },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
    { id: "events", label: "Events & Bulletin", icon: Calendar },
    { id: "ai", label: "AI Assistant", icon: Bot },
  ];

  return (
    <div id="whatsapp_community_clone" className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 text-left">
      {/* Hidden photo input for composer */}
      <input
        type="file"
        accept="image/*"
        ref={feedPhotoInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => setPostImage(reader.result as string);
          reader.readAsDataURL(file);
        }}
      />

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="fixed bottom-20 lg:bottom-5 right-5 z-50 rounded-xl bg-[#0B254D] text-white px-4 py-2.5 text-xs font-semibold shadow-xl border border-[#F5B82E]/40">
          {toastMsg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT DEEP NAVY RAIL */}
        <aside className="w-full lg:w-60 shrink-0 rounded-2xl bg-[#0B254D] text-white shadow-md overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center gap-3">
            <img
              src={zionLogo}
              alt="Zion Digital"
              className="h-10 w-10 rounded-full object-contain border border-[#F5B82E]/70 bg-slate-950 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className="font-display text-sm font-bold tracking-wide text-white truncate">
                ZION DIGITAL
              </p>
              <p className="text-[11px] text-blue-200/80 truncate">Zion Connect &amp; Chat</p>
            </div>
          </div>

          {/* Mobile Horizontal Nav */}
          <div className="lg:hidden p-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === "marketplace") {
                      onNavigate?.("store");
                    } else {
                      setSection(item.id);
                    }
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                    isActive ? "bg-[#155EEF] text-white" : "bg-white/10 text-blue-100 hover:bg-white/15"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Desktop Vertical Nav */}
          <nav className="hidden lg:block p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === "marketplace") {
                      onNavigate?.("store");
                    } else {
                      setSection(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? "bg-[#155EEF] text-white shadow-xs"
                      : "text-blue-100/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 truncate">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === "reels" && reels.length > 0 && (
                    <span className="text-[10px] font-mono bg-white/15 px-1.5 py-0.5 rounded text-blue-100 tabular-nums">
                      {reels.length}
                    </span>
                  )}
                  {item.id === "groups" && groups.length > 0 && (
                    <span className="text-[10px] font-mono bg-white/15 px-1.5 py-0.5 rounded text-blue-100 tabular-nums">
                      {groups.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom User Status & Logout */}
          <div className="hidden lg:block p-3.5 border-t border-white/10 bg-black/15 space-y-2.5">
            {currentUser ? (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-[#155EEF] flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                    {myProfile?.avatar ? (
                      <img src={myProfile.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{myProfile?.name || currentUser.name}</p>
                    <p className="text-[10px] text-blue-200/75 uppercase truncate">{currentUser.role}</p>
                  </div>
                </div>
                {onLogOut && (
                  <button
                    type="button"
                    onClick={onLogOut}
                    className="w-full rounded-xl bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] font-bold py-2 text-xs transition cursor-pointer"
                  >
                    Logout
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onLogIn}
                className="w-full rounded-xl bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] font-bold py-2 text-xs transition cursor-pointer"
              >
                Sign In to Connect
              </button>
            )}
          </div>
        </aside>

        {/* MAIN RIGHT CANVAS */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Top Navy Header Bar with Free Mode vs Data Mode switch */}
          <header className="rounded-2xl bg-[#0B254D] px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h1 className="font-display text-sm sm:text-base font-bold text-white shrink-0">
                Zion Connect
              </h1>
              <div className="flex-1 min-w-0 relative max-w-md">
                <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search people, @tags, #topics, groups..."
                  className="w-full rounded-xl bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#F5B82E]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const next = !freeMode;
                  setFreeMode(next);
                  triggerToast(
                    next
                      ? "Free Mode active: heavy media paused to save mobile data."
                      : "Data Mode active: full photos & video reels enabled."
                  );
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer border ${
                  freeMode
                    ? "bg-[#F5B82E] text-[#0B254D] border-[#F5B82E]"
                    : "bg-white/10 hover:bg-white/20 text-white border-white/15"
                }`}
                title="Switch between Low-Data Preview Mode and Full Media Data Mode"
              >
                {freeMode ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
                <span>{freeMode ? "Free Mode (Low Data)" : "Data Mode"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSection("messages")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                  section === "messages"
                    ? "bg-[#155EEF] text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Messages</span>
              </button>

              <button
                type="button"
                onClick={() => setSection("ai")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                  section === "ai"
                    ? "bg-[#155EEF] text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                <span>AI Chat</span>
              </button>
            </div>
          </header>

          {freeMode && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
              <span>
                <strong>Low-Data Preview Mode:</strong> Photos and video reels pause until you tap to load them, saving your bandwidth. (Does not bypass mobile carrier billing.)
              </span>
              <button
                type="button"
                onClick={() => setFreeMode(false)}
                className="font-bold underline shrink-0 cursor-pointer"
              >
                Switch to Data Mode
              </button>
            </div>
          )}

          {/* 1. ZION CONNECT SOCIAL FEED */}
          {section === "feed" && (
            <div className="space-y-5">
              {/* Stories Row */}
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center gap-4 overflow-x-auto scrollbar-none pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        onLogIn();
                        return;
                      }
                      setShowAddStoryModal(true);
                    }}
                    className="shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group"
                  >
                    <div className="h-14 w-14 rounded-full border-2 border-dashed border-[#155EEF] bg-[#EFF6FF] dark:bg-blue-950/50 flex items-center justify-center text-[#155EEF] group-hover:scale-105 transition">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Add Story
                    </span>
                  </button>

                  {stories.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setActiveStory(st)}
                      className="shrink-0 flex flex-col items-center gap-1.5 cursor-pointer group"
                    >
                      <div className="h-14 w-14 rounded-full p-0.5 bg-gradient-to-tr from-[#155EEF] to-[#F5B82E] group-hover:scale-105 transition">
                        <img
                          src={st.avatar}
                          alt={st.name}
                          className="h-full w-full rounded-full object-cover border-2 border-white dark:border-slate-900"
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 max-w-[60px] truncate">
                        {st.name}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {activeHashtag && (
                <div className="flex items-center justify-between rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-4 py-2 text-xs">
                  <span>
                    Filtering feed by hashtag: <strong className="text-[#155EEF]">{activeHashtag}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveHashtag("")}
                    className="font-bold text-[#155EEF] hover:underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                {/* Center Column: Composer + Feed */}
                <div className="xl:col-span-8 space-y-5 min-w-0">
                  <form
                    onSubmit={handleCreatePost}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#0B254D] text-white flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden">
                        {myProfile?.avatar ? (
                          <img src={myProfile.avatar} alt={currentUser?.name} className="h-full w-full object-cover" />
                        ) : (
                          currentUser?.name?.charAt(0).toUpperCase() || "Z"
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          type="text"
                          value={postText}
                          onChange={(e) => setPostText(e.target.value)}
                          placeholder={
                            currentUser
                              ? `Share a testimony, @mention someone, or add #hashtags...`
                              : "Sign in to share on Zion Connect..."
                          }
                          className="w-full rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-[#155EEF]"
                        />

                        {(postFeeling || postLocation) && (
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#155EEF] dark:text-blue-300">
                            {postFeeling && <span>Feeling {postFeeling}</span>}
                            {postFeeling && postLocation && <span className="text-slate-300">&middot;</span>}
                            {postLocation && <span>At {postLocation}</span>}
                          </div>
                        )}

                        {postImage && (
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56">
                            <img src={postImage} alt="Upload preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setPostImage(null)}
                              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {showFeelingPicker && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {["Blessed", "Grateful", "Inspired", "Studying", "Praying"].map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => {
                              setPostFeeling(f);
                              setShowFeelingPicker(false);
                            }}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}

                    {showLocationPicker && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {["Bungoma Campus", "Zion Digital Library", "Leadership Hall", "Online Fellowship"].map(
                          (loc) => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => {
                                setPostLocation(loc);
                                setShowLocationPicker(false);
                              }}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              {loc}
                            </button>
                          )
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => feedPhotoInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <ImageIcon className="h-4 w-4 text-emerald-600" />
                          <span>Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSection("reels")}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Film className="h-4 w-4 text-rose-500" />
                          <span>Reel</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowFeelingPicker((p) => !p);
                            setShowLocationPicker(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Smile className="h-4 w-4 text-amber-500" />
                          <span>Feeling</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowLocationPicker((p) => !p);
                            setShowFeelingPicker(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <MapPin className="h-4 w-4 text-[#155EEF]" />
                          <span>Check in</span>
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isPublishingPost}
                        className="rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-semibold px-4 py-2 text-xs transition cursor-pointer disabled:opacity-60"
                      >
                        {isPublishingPost ? "Posting..." : "Post"}
                      </button>
                    </div>
                  </form>

                  {/* Feed Posts List */}
                  <div className="space-y-4">
                    {visibleFeedPosts.map((post) => {
                      const isLiked = likedPostIds.includes(post.id);
                      const myReact = myPostReactions[post.id];
                      const displayLikes = post.likes + (isLiked ? 1 : 0);
                      const comments = postComments[post.id] || [];
                      const canDelete = Boolean(
                        isAdmin ||
                          (currentUser &&
                            post.userEmail &&
                            post.userEmail.toLowerCase() === currentUser.email.toLowerCase())
                      );
                      const isFollowingAuthor = Boolean(
                        post.userEmail && followingEmails.includes(post.userEmail.toLowerCase())
                      );
                      const imageUnlocked = !freeMode || loadedPostImages[post.id];

                      return (
                        <article
                          key={post.id}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
                        >
                          <div className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-full bg-[#0B254D] text-white flex items-center justify-center text-sm font-bold overflow-hidden shrink-0">
                                  {post.avatar ? (
                                    <img src={post.avatar} alt={post.userName} className="h-full w-full object-cover" />
                                  ) : (
                                    post.userName.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h3 className="text-xs sm:text-sm font-bold text-[#0B254D] dark:text-white truncate">
                                      {post.userName}
                                    </h3>
                                    {post.verified && <BadgeCheck className="h-4 w-4 text-[#155EEF] shrink-0" />}
                                    {post.userEmail && post.userEmail.toLowerCase() !== myEmail && (
                                      <button
                                        type="button"
                                        onClick={() => handleFollowTarget(post.userEmail!, post.userName)}
                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md cursor-pointer ${
                                          isFollowingAuthor
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-[#EFF6FF] text-[#155EEF]"
                                        }`}
                                      >
                                        {isFollowingAuthor ? "Following" : "+ Follow"}
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {post.timeLabel}
                                    {post.feeling ? ` · Feeling ${post.feeling}` : ""}
                                    {post.location ? ` · ${post.location}` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleReportContent("post", post.id)}
                                  className="text-slate-400 hover:text-amber-600 p-1 cursor-pointer"
                                  title="Report post"
                                >
                                  <Flag className="h-3.5 w-3.5" />
                                </button>
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePost(post.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                    title="Delete post"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                              {renderPostText(post.text)}
                            </p>
                          </div>

                          {post.imageUrl &&
                            (imageUnlocked ? (
                              <div className="max-h-72 overflow-hidden bg-slate-100 dark:bg-slate-800">
                                <img src={post.imageUrl} alt={post.userName} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="mx-4 mb-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setLoadedPostImages((p) => ({ ...p, [post.id]: true }))}
                                  className="rounded-lg bg-[#0B254D] text-white px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                                >
                                  Free Mode: Tap to Load Photo
                                </button>
                              </div>
                            ))}

                          {/* Reaction strip */}
                          <div className="px-4 py-1.5 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-[11px]">
                            {REACTION_CHOICES.map((rx) => {
                              const baseCount = post.reactions?.[rx.emoji] || 0;
                              const activeRx = myReact === rx.emoji;
                              return (
                                <button
                                  key={rx.emoji}
                                  type="button"
                                  onClick={() => handleReactPost(post.id, rx.emoji)}
                                  className={`rounded-lg px-2 py-0.5 font-medium transition cursor-pointer ${
                                    activeRx
                                      ? "bg-[#EFF6FF] text-[#155EEF] border border-[#155EEF]/30"
                                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  {rx.emoji} {rx.label}
                                  {baseCount + (activeRx ? 1 : 0) > 0 ? ` (${baseCount + (activeRx ? 1 : 0)})` : ""}
                                </button>
                              );
                            })}
                          </div>

                          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleToggleLikePost(post.id)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition cursor-pointer ${
                                isLiked
                                  ? "text-[#155EEF] bg-[#EFF6FF] dark:bg-blue-950/50"
                                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              <span className="tabular-nums">Like ({displayLikes})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setOpenCommentsPostId((prev) => (prev === post.id ? null : post.id))
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span className="tabular-nums">Comment ({comments.length})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRepost(post)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <Repeat2 className="h-3.5 w-3.5" />
                              <span>Repost</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSharePost(post)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              <span>Share</span>
                            </button>
                          </div>

                          {openCommentsPostId === post.id && (
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 space-y-3">
                              {comments.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {comments.map((cmt) => (
                                    <div
                                      key={cmt.id}
                                      className="rounded-xl bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-700 text-xs"
                                    >
                                      <div className="flex justify-between items-center mb-0.5">
                                        <span className="font-bold text-[#0B254D] dark:text-white">{cmt.userName}</span>
                                        <span className="text-[10px] text-slate-400 tabular-nums">{cmt.date}</span>
                                      </div>
                                      <p className="text-slate-700 dark:text-slate-300">{cmt.text}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={commentDraft}
                                  onChange={(e) => setCommentDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddPostComment(post.id);
                                    }
                                  }}
                                  placeholder="Write a reply..."
                                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-[#155EEF]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddPostComment(post.id)}
                                  className="rounded-xl bg-[#155EEF] text-white px-3 py-1.5 text-xs font-semibold cursor-pointer"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>

                {/* Right Rail: Trending Hashtags, Short Reels & Groups */}
                <div className="xl:col-span-4 space-y-5 min-w-0">
                  {/* Trending Christian Hashtags */}
                  <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-sm font-bold text-[#0B254D] dark:text-white flex items-center gap-1.5">
                        <Hash className="h-4 w-4 text-[#F5B82E]" />
                        <span>Trending Topics</span>
                      </h2>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {trendingHashtags.map(([tag, count]) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setActiveHashtag((prev) => (prev === tag ? "" : tag))}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            activeHashtag === tag
                              ? "bg-[#155EEF] text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-[#0B254D] dark:text-blue-200 hover:bg-[#EFF6FF]"
                          }`}
                        >
                          {tag} ({count})
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Short Reels Card */}
                  <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                        Christian Reels
                      </h2>
                      <button
                        type="button"
                        onClick={() => setSection("reels")}
                        className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#155EEF] hover:underline cursor-pointer"
                      >
                        <span>See All</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {reels.slice(0, 2).map((reel) => (
                        <button
                          key={reel.id}
                          type="button"
                          onClick={() => handleOpenReel(reel)}
                          className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-900 text-left cursor-pointer"
                        >
                          <img
                            src={reel.thumbnailUrl || sermonImg}
                            alt={reel.title}
                            className="h-full w-full object-cover opacity-85 group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="h-9 w-9 rounded-full bg-white/25 text-white flex items-center justify-center group-hover:bg-[#155EEF] transition">
                              <Play className="h-4 w-4 fill-current" />
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 text-white">
                            <p className="text-[11px] font-bold line-clamp-1">{reel.title}</p>
                            <p className="text-[10px] text-white/80 tabular-nums">{reel.views} views</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Groups Card */}
                  <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                        Fellowship Groups
                      </h2>
                      <button
                        type="button"
                        onClick={() => setSection("groups")}
                        className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#155EEF] hover:underline cursor-pointer"
                      >
                        <span>See All</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {groups.slice(0, 3).map((grp) => {
                        const isJoined = grp.members.includes(myEmail);
                        return (
                          <div
                            key={grp.id}
                            className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-100 dark:border-slate-800 p-2.5"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setActiveGroupId(grp.id);
                                setSection("groups");
                              }}
                              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                            >
                              <img
                                src={grp.coverUrl || bibleImg}
                                alt={grp.name}
                                className="h-10 w-10 rounded-full object-cover shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#0B254D] dark:text-white truncate">
                                  {grp.name}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {grp.members.length} members &middot; {grp.privacy}
                                </p>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleGroupAction(
                                  grp.id,
                                  "join",
                                  undefined,
                                  isJoined ? `Left ${grp.name}` : `Joined ${grp.name}!`
                                )
                              }
                              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                                isJoined
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-[#155EEF] hover:bg-[#0F49C7] text-white"
                              }`}
                            >
                              {isJoined ? "Joined" : "Join"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          {/* 2. MESSAGES (Participant-Locked 1-to-1 DMs + Community Channels) */}
          {section === "messages" && (
            <ZionConnectMessages
              currentUser={currentUser}
              onLogIn={onLogIn}
              freeMode={freeMode}
              messages={messages}
              onSendMessage={onSendMessage}
              onDeleteMessage={onDeleteMessage}
              onEditMessage={onEditMessage}
              isLoading={isLoading}
              channels={CHANNELS_AND_CHATS}
              peers={PEER_DIRECTORY}
              profiles={profiles}
              blockedEmails={blockedEmails}
              connectedPeerIds={connectedPeerIds}
              onToggleConnectPeer={handleToggleConnectPeer}
              onRefreshProfiles={loadProfilesAndSocial}
              initialDmTarget={pendingPeerTarget || initialDmTarget}
              onClearDmTarget={() => {
                setPendingPeerTarget(null);
                onClearDmTarget?.();
              }}
              initialChannelId={pendingChannelId}
              onClearInitialChannel={() => setPendingChannelId(null)}
              onTriggerToast={triggerToast}
              onOpenFriends={() => setSection("friends")}
              isAdmin={isAdmin}
              isWorker={isUserWorker(currentUser)}
            />
          )}

          {/* 3. MY PROFILE WITH COVER & AVATAR EDITOR */}
          {section === "profile" && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              {/* Cover Photo Banner */}
              <div className="h-44 sm:h-52 relative bg-gradient-to-r from-[#0B254D] via-[#123A78] to-[#155EEF]">
                {(profCover || myProfile?.coverImage) && (
                  <img
                    src={profCover || myProfile?.coverImage}
                    alt="Cover Banner"
                    className="h-full w-full object-cover opacity-80"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B254D]/80 to-transparent" />
              </div>

              <div className="p-6 -mt-12 relative z-10 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="flex items-end gap-4">
                    <div className="h-24 w-24 rounded-full bg-[#0B254D] text-white flex items-center justify-center text-3xl font-bold shrink-0 border-4 border-white dark:border-slate-900 shadow-md overflow-hidden">
                      {profAvatar || myProfile?.avatar ? (
                        <img src={profAvatar || myProfile?.avatar} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        currentUser?.name?.charAt(0).toUpperCase() || "Z"
                      )}
                    </div>
                    <div className="pb-1">
                      <div className="flex items-center gap-1.5">
                        <h2 className="font-display text-xl font-bold text-[#0B254D] dark:text-white">
                          {myProfile?.name || currentUser?.name || "Guest Scholar"}
                        </h2>
                        <BadgeCheck className="h-5 w-5 text-[#155EEF]" />
                      </div>
                      <p className="text-xs font-medium text-[#155EEF] dark:text-blue-300">
                        {myProfile?.headline || "Zion Digital Community Member"}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {myProfile?.location || "Bungoma, Kenya"} &middot; {currentUser?.email || "Not signed in"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => (currentUser ? setEditProfileOpen((p) => !p) : onLogIn())}
                      className="rounded-xl bg-[#0B254D] hover:bg-[#155EEF] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                    >
                      {editProfileOpen ? "Close Editor" : "Edit Profile & Cover"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSection("messages")}
                      className="rounded-xl bg-[#155EEF] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                    >
                      Open Private DMs
                    </button>
                  </div>
                </div>

                {editProfileOpen && (
                  <form onSubmit={handleSaveProfile} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3 text-xs">
                    <h3 className="font-bold text-[#0B254D] dark:text-white">Customize Social Profile</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={profName}
                        onChange={(e) => setProfName(e.target.value)}
                        placeholder="Display Name"
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                      />
                      <input
                        type="text"
                        value={profHeadline}
                        onChange={(e) => setProfHeadline(e.target.value)}
                        placeholder="Headline (e.g. Theology Scholar · Educator)"
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                      />
                      <input
                        type="text"
                        value={profLocation}
                        onChange={(e) => setProfLocation(e.target.value)}
                        placeholder="Location"
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                      />
                      <input
                        type="text"
                        value={profSkills}
                        onChange={(e) => setProfSkills(e.target.value)}
                        placeholder="Skills (comma-separated)"
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={profBio}
                      onChange={(e) => setProfBio(e.target.value)}
                      placeholder="Short fellowship & ministry bio..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2"
                    />
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="cursor-pointer font-semibold text-[#155EEF]">
                        Upload Profile Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const r = new FileReader();
                            r.onload = () => setProfAvatar(r.result as string);
                            r.readAsDataURL(f);
                          }}
                        />
                      </label>
                      <label className="cursor-pointer font-semibold text-[#155EEF]">
                        Upload Cover Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const r = new FileReader();
                            r.onload = () => setProfCover(r.result as string);
                            r.readAsDataURL(f);
                          }}
                        />
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profOnlineVisible}
                          onChange={(e) => setProfOnlineVisible(e.target.checked)}
                        />
                        <span>Show Online Status</span>
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="rounded-xl bg-[#155EEF] text-white font-semibold px-4 py-2 cursor-pointer"
                    >
                      Save Profile Changes
                    </button>
                  </form>
                )}

                {myProfile?.bio && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{myProfile.bio}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 space-y-1">
                    <p className="text-slate-500">Following</p>
                    <p className="text-2xl font-bold text-[#0B254D] dark:text-white tabular-nums">
                      {followingEmails.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 space-y-1">
                    <p className="text-slate-500">Fellowship Groups</p>
                    <p className="text-2xl font-bold text-[#0B254D] dark:text-white tabular-nums">
                      {groups.filter((g) => g.members.includes(myEmail)).length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 space-y-1">
                    <p className="text-slate-500">Connections</p>
                    <p className="text-2xl font-bold text-[#0B254D] dark:text-white tabular-nums">
                      {connectedPeerIds.length}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 4. FRIENDS & FOLLOW DIRECTORY */}
          {section === "friends" && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                  Fellowship Directory &amp; Connections
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Follow members, build your fellowship circle, or start a participant-locked Private DM.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PEER_DIRECTORY.map((peer) => {
                  const isConnected = connectedPeerIds.includes(peer.id);
                  const isFollowed = Boolean(peer.email && followingEmails.includes(peer.email.toLowerCase()));
                  return (
                    <div
                      key={peer.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <img src={peer.avatar} alt={peer.name} className="h-12 w-12 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <h3 className="text-sm font-bold text-[#0B254D] dark:text-white truncate">{peer.name}</h3>
                            {peer.verified && <BadgeCheck className="h-4 w-4 text-[#155EEF] shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{peer.title}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {peer.skills.map((s) => (
                          <span key={s} className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            peer.email
                              ? handleFollowTarget(peer.email, peer.name)
                              : handleToggleConnectPeer(peer.id, peer.name)
                          }
                          className={`flex-1 rounded-xl py-2 text-xs font-semibold cursor-pointer ${
                            isFollowed || isConnected
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-[#155EEF] text-white"
                          }`}
                        >
                          {isFollowed ? "Following" : isConnected ? "Connected" : "Follow"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (peer.email) {
                              setPendingPeerTarget({ email: peer.email, name: peer.name });
                              setSection("messages");
                            } else {
                              setPendingChannelId(peer.channelId);
                              setSection("messages");
                            }
                          }}
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold cursor-pointer"
                        >
                          Private DM
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 5. GROUPS, MODERATORS, INVITES & EVENTS */}
          {section === "groups" && (
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                      Fellowship &amp; Study Groups
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Create public or private Christian groups, assign moderators, host events, and discuss live.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (currentUser ? setShowCreateGroupModal(true) : onLogIn())}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Group</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groups.map((grp) => {
                    const isJoined = grp.members.includes(myEmail);
                    const isSelected = activeGroup?.id === grp.id;
                    return (
                      <div
                        key={grp.id}
                        className={`rounded-xl border p-4 space-y-3 transition ${
                          isSelected
                            ? "border-[#155EEF] bg-[#EFF6FF]/40 dark:bg-blue-950/20"
                            : "border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#155EEF]">
                                {grp.category}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500">
                                {grp.privacy === "private" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                {grp.privacy}
                              </span>
                            </div>
                            <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                              {grp.name}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-2">{grp.description}</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {grp.members.length} members &middot; {grp.events.length} events
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleGroupAction(
                                grp.id,
                                "join",
                                undefined,
                                isJoined ? `Left ${grp.name}` : `Joined ${grp.name}!`
                              )
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                              isJoined
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-[#155EEF] text-white"
                            }`}
                          >
                            {isJoined ? "Joined" : "Join Group"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveGroupId(grp.id)}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                          >
                            Open Group Space
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Selected Group Workspace */}
              {activeGroup && (
                <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                        {activeGroup.name} Workspace
                      </h3>
                      <p className="text-xs text-slate-500">
                        Admins: {activeGroup.admins.join(", ")}
                        {activeGroup.moderators.length > 0 && ` · Moderators: ${activeGroup.moderators.join(", ")}`}
                      </p>
                    </div>
                  </div>

                  {/* Admin / Mod controls */}
                  {(activeGroup.admins.includes(myEmail) || activeGroup.moderators.includes(myEmail) || isAdmin) && (
                    <div className="grid sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={groupInviteEmail}
                          onChange={(e) => setGroupInviteEmail(e.target.value)}
                          placeholder="Invite member by email..."
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!groupInviteEmail.trim()) return;
                            const ok = await handleGroupAction(
                              activeGroup.id,
                              "invite",
                              { email: groupInviteEmail.trim() },
                              `Invited ${groupInviteEmail.trim()}`
                            );
                            if (ok) setGroupInviteEmail("");
                          }}
                          className="rounded-lg bg-[#0B254D] text-white px-3 py-1.5 font-semibold cursor-pointer"
                        >
                          Invite
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!groupInviteEmail.trim()) {
                              triggerToast("Enter member email on the left to toggle moderator role.");
                              return;
                            }
                            await handleGroupAction(
                              activeGroup.id,
                              "moderators",
                              { email: groupInviteEmail.trim() },
                              "Updated moderator role."
                            );
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-semibold cursor-pointer"
                        >
                          <Shield className="h-3.5 w-3.5 text-[#155EEF]" />
                          <span>Toggle Moderator</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid lg:grid-cols-2 gap-5">
                    {/* Group Events & RSVP */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B254D] dark:text-white">
                        Group Events &amp; RSVP
                      </h4>
                      {activeGroup.events.map((ev) => {
                        const rsvped = ev.rsvps.includes(myEmail);
                        return (
                          <div key={ev.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2 text-xs">
                            <div>
                              <p className="font-bold text-[#0B254D] dark:text-white">{ev.title}</p>
                              <p className="text-[11px] text-slate-500">
                                {ev.date} &middot; {ev.location} &middot; {ev.rsvps.length} going
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleGroupAction(
                                  activeGroup.id,
                                  `events/${encodeURIComponent(ev.id)}/rsvp`,
                                  undefined,
                                  rsvped ? "Cancelled RSVP" : "RSVP confirmed!"
                                )
                              }
                              className={`rounded-lg px-3 py-1.5 font-semibold cursor-pointer ${
                                rsvped ? "bg-emerald-100 text-emerald-800" : "bg-[#155EEF] text-white"
                              }`}
                            >
                              {rsvped ? "Going" : "RSVP"}
                            </button>
                          </div>
                        );
                      })}

                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 space-y-2 text-xs border border-slate-200 dark:border-slate-800">
                        <p className="font-bold text-[#0B254D] dark:text-white">Schedule Group Event</p>
                        <input
                          type="text"
                          value={groupEventTitle}
                          onChange={(e) => setGroupEventTitle(e.target.value)}
                          placeholder="Event title (e.g. Friday Prayer Night)"
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={groupEventDate}
                            onChange={(e) => setGroupEventDate(e.target.value)}
                            placeholder="Date (e.g. Fri 7:00 PM)"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                          />
                          <input
                            type="text"
                            value={groupEventLocation}
                            onChange={(e) => setGroupEventLocation(e.target.value)}
                            placeholder="Location"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!groupEventTitle.trim() || !groupEventDate.trim()) return;
                            const ok = await handleGroupAction(
                              activeGroup.id,
                              "events",
                              { title: groupEventTitle, date: groupEventDate, location: groupEventLocation },
                              "Group event added!"
                            );
                            if (ok) {
                              setGroupEventTitle("");
                              setGroupEventDate("");
                            }
                          }}
                          className="rounded-lg bg-[#0B254D] text-white px-3 py-1.5 font-semibold cursor-pointer"
                        >
                          + Add Event
                        </button>
                      </div>
                    </div>

                    {/* Group Discussions */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B254D] dark:text-white">
                        Live Group Discussions
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {activeGroup.discussions.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-4 text-center">
                            No discussion posts yet. Share an insight below!
                          </p>
                        ) : (
                          activeGroup.discussions.map((d) => (
                            <div key={d.id} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="font-bold text-[#0B254D] dark:text-white">{d.userName}</span>
                                <span className="text-slate-400">{d.createdAt.slice(0, 10)}</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-200">{d.text}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2 text-xs">
                        <input
                          type="text"
                          value={groupDiscussionDraft}
                          onChange={(e) => setGroupDiscussionDraft(e.target.value)}
                          placeholder="Share a reflection in this group..."
                          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 outline-none"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!groupDiscussionDraft.trim()) return;
                            const ok = await handleGroupAction(
                              activeGroup.id,
                              "discussions",
                              { text: groupDiscussionDraft.trim() },
                              "Posted to group discussion!"
                            );
                            if (ok) setGroupDiscussionDraft("");
                          }}
                          className="rounded-xl bg-[#155EEF] text-white px-4 py-2 font-semibold cursor-pointer"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* 6. SHORT VIDEOS & CHRISTIAN REELS + PLAYLISTS */}
          {section === "reels" && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                    Christian Reels &amp; Video Playlists
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Upload short inspirational clips, build saved playlists, like, comment, and share.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (currentUser ? setShowUploadReelModal(true) : onLogIn())}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Reel</span>
                </button>
              </div>

              {playlists.length > 0 && (
                <div className="rounded-xl bg-[#EFF6FF] dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 flex flex-wrap items-center gap-2 text-xs">
                  <Bookmark className="h-4 w-4 text-[#155EEF]" />
                  <span className="font-bold text-[#0B254D] dark:text-white">Your Playlists:</span>
                  {playlists.map((pl) => (
                    <span key={pl.id} className="rounded-lg bg-white dark:bg-slate-900 px-2.5 py-1 border border-blue-200 dark:border-blue-800 font-semibold">
                      {pl.name} ({pl.reelIds.length})
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {reels.map((reel) => (
                  <div
                    key={reel.id}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenReel(reel)}
                      className="w-full h-full text-left cursor-pointer"
                    >
                      <img
                        src={reel.thumbnailUrl || sermonImg}
                        alt={reel.title}
                        className="h-full w-full object-cover opacity-85 group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="h-11 w-11 rounded-full bg-white/25 text-white flex items-center justify-center group-hover:bg-[#155EEF] transition">
                          <Play className="h-5 w-5 fill-current" />
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5">
                        <p className="text-xs font-bold line-clamp-2">{reel.title}</p>
                        <p className="text-[10px] text-white/80">
                          {reel.authorName} &middot; {reel.views} views &middot; {reel.likes.length} likes
                        </p>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 7. EVENTS & CAMPUS BULLETIN */}
          {section === "events" && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                    Campus Bulletin &amp; Upcoming Events
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Official fellowship notices and academy dates across Zion Digital.
                  </p>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAnnouncementMaker((p) => !p)}
                    className="rounded-xl bg-[#155EEF] text-white px-3.5 py-2 text-xs font-semibold cursor-pointer"
                  >
                    {showAnnouncementMaker ? "Cancel" : "+ Post Notice"}
                  </button>
                )}
              </div>

              {showAnnouncementMaker && isAdmin && (
                <form
                  onSubmit={handlePostAnnouncement}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="text"
                    required
                    value={announcementInput}
                    onChange={(e) => setAnnouncementInput(e.target.value)}
                    placeholder="Share a cohort update or schedule notice..."
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0B254D] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Publish Notice
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0B254D] dark:text-white inline-flex items-center gap-1.5">
                        <Pin className="h-3.5 w-3.5 text-[#155EEF]" />
                        {item.author}
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums">{item.date}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 8. ZION CONNECT AI ASSISTANT */}
          {section === "ai" && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#F5B82E]" />
                    <span>Zion Connect AI Assistant</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Scripture Q&amp;A, post caption crafting, and sermon/discussion summarization powered by Gemini.
                  </p>
                </div>
                {aiUsage && (
                  <span className="text-[11px] font-mono bg-[#EFF6FF] dark:bg-blue-950/40 text-[#155EEF] dark:text-blue-300 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                    Daily Quota: {aiUsage.dayCount} / {aiUsage.dayLimit}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: "fellowship", label: "Fellowship & Bible Q&A" },
                  { id: "caption", label: "Post Caption Writer" },
                  { id: "summarize", label: "Sermon & Study Summarizer" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAiMode(m.id as any)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                      aiMode === m.id
                        ? "bg-[#0B254D] text-[#F5B82E]"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {aiError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-200">
                  {aiError}
                </div>
              )}

              <div className="space-y-3 max-h-[360px] overflow-y-auto p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800">
                {aiHistory.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500 space-y-2">
                    <Bot className="h-8 w-8 mx-auto text-[#155EEF]/60" />
                    <p>Ask a question about scripture, request a fellowship caption, or paste notes to summarize.</p>
                  </div>
                ) : (
                  aiHistory.map((turn, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap max-w-[85%] ${
                        turn.role === "user"
                          ? "ml-auto bg-[#155EEF] text-white"
                          : "mr-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {turn.text}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendConnectAi} className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={
                    currentUser
                      ? "Ask Zion Connect AI..."
                      : "Sign in to chat with Zion Connect AI..."
                  }
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs outline-none focus:border-[#155EEF]"
                />
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white px-5 py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{aiLoading ? "Thinking..." : "Send"}</span>
                </button>
              </form>
            </section>
          )}
        </div>
      </div>

      {/* STORY VIEWER MODAL */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden bg-[#0B254D] text-white shadow-2xl border border-white/15">
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <img src={activeStory.avatar} alt={activeStory.name} className="h-9 w-9 rounded-full object-cover" />
                <div>
                  <p className="text-xs font-bold">{activeStory.name}</p>
                  <p className="text-[10px] text-blue-200">{activeStory.time}</p>
                </div>
              </div>
              <button type="button" onClick={() => setActiveStory(null)} className="p-1 text-white/80 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <img src={activeStory.avatar} alt={activeStory.name} className="w-full h-72 object-cover" />
            <div className="p-4 text-xs text-blue-50 leading-relaxed">{activeStory.caption}</div>
          </div>
        </div>
      )}

      {/* ADD STORY MODAL */}
      {showAddStoryModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                Share a Fellowship Story
              </h3>
              <button type="button" onClick={() => setShowAddStoryModal(false)} className="cursor-pointer">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <textarea
              rows={3}
              value={newStoryCaption}
              onChange={(e) => setNewStoryCaption(e.target.value)}
              placeholder="Write a brief encouragement, verse, or prayer update..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs outline-none"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddStoryModal(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newStoryCaption.trim()) return;
                  setStories((prev) => [
                    {
                      id: `st_${Date.now()}`,
                      name: currentUser?.name.split(" ")[0] || "Scholar",
                      avatar: seminarImg,
                      caption: newStoryCaption.trim(),
                      time: "Just now",
                    },
                    ...prev,
                  ]);
                  setNewStoryCaption("");
                  setShowAddStoryModal(false);
                  triggerToast("Story added to Zion Connect.");
                }}
                className="rounded-xl bg-[#155EEF] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Publish Story
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD REEL MODAL */}
      {showUploadReelModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUploadReel}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                Upload Christian Reel
              </h3>
              <button type="button" onClick={() => setShowUploadReelModal(false)} className="cursor-pointer">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <input
              type="text"
              required
              value={reelTitle}
              onChange={(e) => setReelTitle(e.target.value)}
              placeholder="Reel Title *"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
            />
            <textarea
              rows={2}
              value={reelDesc}
              onChange={(e) => setReelDesc(e.target.value)}
              placeholder="Description or scripture reflection..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
            />
            <input
              type="text"
              value={reelHashtags}
              onChange={(e) => setReelHashtags(e.target.value)}
              placeholder="Hashtags (#Worship #ZionConnect)"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
            />
            <div className="flex flex-wrap gap-3">
              <label className="cursor-pointer font-semibold text-[#155EEF]">
                Select Video File
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setReelVideoUrl(r.result as string);
                    r.readAsDataURL(f);
                  }}
                />
              </label>
              <label className="cursor-pointer font-semibold text-[#155EEF]">
                Select Cover Thumbnail
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => setReelThumbUrl(r.result as string);
                    r.readAsDataURL(f);
                  }}
                />
              </label>
            </div>
            {reelVideoUrl && <p className="text-emerald-600 font-semibold">Video ready to upload.</p>}
            <button
              type="submit"
              disabled={isUploadingReel}
              className="w-full rounded-xl bg-[#155EEF] text-white font-semibold py-2.5 cursor-pointer disabled:opacity-50"
            >
              {isUploadingReel ? "Publishing Reel..." : "Publish Reel"}
            </button>
          </form>
        </div>
      )}

      {/* REEL PLAYER MODAL */}
      {activeReel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl overflow-hidden bg-[#0B254D] text-white shadow-2xl border border-white/15">
            <div className="relative h-72 bg-black">
              {activeReel.videoUrl && (!freeMode || loadedReelVideos[activeReel.id]) ? (
                <video
                  controls
                  autoPlay={!freeMode}
                  poster={activeReel.thumbnailUrl || sermonImg}
                  src={activeReel.videoUrl}
                  className="w-full h-full object-contain"
                />
              ) : (
                <>
                  <img
                    src={activeReel.thumbnailUrl || sermonImg}
                    alt={activeReel.title}
                    className="w-full h-full object-cover"
                  />
                  {activeReel.videoUrl && freeMode && (
                    <button
                      type="button"
                      onClick={() => setLoadedReelVideos((p) => ({ ...p, [activeReel.id]: true }))}
                      className="absolute inset-0 m-auto h-10 w-44 rounded-xl bg-[#F5B82E] text-[#0B254D] font-bold text-xs cursor-pointer"
                    >
                      Free Mode: Tap to Play Video
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => setActiveReel(null)}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs text-blue-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5B82E]">
                  {activeReel.duration} &middot; {activeReel.views} views
                </span>
                <h3 className="font-display text-base font-bold">{activeReel.title}</h3>
                <p className="text-xs text-blue-200">{activeReel.authorName}</p>
              </div>
              <p className="leading-relaxed">{activeReel.description}</p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleLikeReel(activeReel.id)}
                  className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 font-semibold cursor-pointer"
                >
                  Like ({activeReel.likes.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveReelPlaylist(activeReel.id)}
                  className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 font-semibold cursor-pointer"
                >
                  Save to Playlist
                </button>
                <button
                  type="button"
                  onClick={() => handleReportContent("reel", activeReel.id)}
                  className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 font-semibold cursor-pointer"
                >
                  Report
                </button>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="max-h-28 overflow-y-auto space-y-1.5">
                  {activeReel.comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px]">
                      <span className="font-bold text-[#F5B82E] mr-1">{c.userName}:</span>
                      <span>{c.text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reelCommentDraft}
                    onChange={(e) => setReelCommentDraft(e.target.value)}
                    placeholder="Comment on this reel..."
                    className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-xs text-white placeholder:text-blue-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCommentReel(activeReel.id)}
                    className="rounded-lg bg-[#F5B82E] text-[#0B254D] font-bold px-3 py-1.5 cursor-pointer"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateGroup}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                Create Fellowship or Study Group
              </h3>
              <button type="button" onClick={() => setShowCreateGroupModal(false)} className="cursor-pointer">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <input
              type="text"
              required
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group Name *"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newGroupCategory}
                onChange={(e) => setNewGroupCategory(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
              >
                <option value="Fellowship">Fellowship</option>
                <option value="Scripture">Bible Study</option>
                <option value="Leadership">Leadership</option>
                <option value="Education">Education</option>
                <option value="Youth">Youth</option>
              </select>
              <select
                value={newGroupPrivacy}
                onChange={(e) => setNewGroupPrivacy(e.target.value as any)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
              >
                <option value="public">Public Group</option>
                <option value="private">Private (Invite Only)</option>
              </select>
            </div>
            <textarea
              rows={2}
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Purpose & schedule..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
            />
            <button type="submit" className="w-full rounded-xl bg-[#155EEF] text-white font-semibold py-2.5 cursor-pointer">
              Create Group
            </button>
          </form>
        </div>
      )}

      {/* SHARE DRAWER MODAL (WhatsApp, Facebook & Copy) */}
      {sharePost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                Share Post Outside Zion Connect
              </h3>
              <button type="button" onClick={() => setSharePost(null)} className="cursor-pointer">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl line-clamp-3">
              {sharePost.userName}: &ldquo;{sharePost.text}&rdquo;
            </p>
            <div className="grid grid-cols-1 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${sharePost.userName} on Zion Connect: ${sharePost.text} ${window.location.origin}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5"
              >
                Share on WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(sharePost.text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold py-2.5"
              >
                Share on Facebook
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(`${sharePost.userName}: ${sharePost.text}`);
                  triggerToast("Post copied to clipboard!");
                  setSharePost(null);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 font-semibold cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Post Text</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
