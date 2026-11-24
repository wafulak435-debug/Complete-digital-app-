import React, { useState, useEffect, useRef } from "react";
import { 
  Video, Play, Pause, Plus, Trash2, Clock, User, Heart, Eye, 
  Search, Sparkles, UploadCloud, X, MessageSquare, Calendar, ChevronRight,
  Tv, HeartHandshake, Film, HelpCircle, ShieldAlert
} from "lucide-react";
import { User as AuthUser, SermonVideo, Comment } from "../types";
import { db } from "../lib/firebase";
import { 
  collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc, increment
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";

interface SermonsMotivationProps {
  currentUser: AuthUser | null;
}

const PRESET_THUMBNAILS = [
  "https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?q=80&w=800&auto=format&fit=crop", // Congregation
  "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=800&auto=format&fit=crop", // Study sermon
  "https://images.unsplash.com/photo-1504051771394-dd2e66b2e08f?q=80&w=800&auto=format&fit=crop", // Altar Bible
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop", // Sunrise path
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop"  // Mentorship
];

const PRESEEDED_VIDEOS: SermonVideo[] = [
  {
    id: "evangelism_1",
    title: "Evangelism 1: The Great Commission in Bungoma",
    speaker: "Chancellor Kelvin Wafula",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?q=80&w=800&auto=format&fit=crop",
    description: "Part 1 of the foundational Evangelism & Outreach training series. Aligning our local ministries with the supreme global mandate to share gospel truth.",
    category: "Evangelism",
    duration: "12:30",
    date: "2026-06-01",
    likesCount: 145,
    viewsCount: 420
  },
  {
    id: "evangelism_2",
    title: "Evangelism 2: Dynamic Open-Air Crusades & Outreach",
    speaker: "Chancellor Kelvin Wafula",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=800&auto=format&fit=crop",
    description: "Part 2 of our training series. Practical strategies for preparing outdoor crusades, organizing community support, and managing municipal logistics in Bungoma.",
    category: "Evangelism",
    duration: "14:15",
    date: "2026-06-05",
    likesCount: 112,
    viewsCount: 310
  },
  {
    id: "evangelism_3",
    title: "Evangelism 3: Strategic Civic Mobilization & Growth",
    speaker: "Chancellor Kelvin Wafula",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1504051771394-dd2e66b2e08f?q=80&w=800&auto=format&fit=crop",
    description: "Part 3 of our training series. Consolidating leadership networks, structuring small bible groups, and integrating new converts into local covenant trust cells.",
    category: "Evangelism",
    duration: "11:50",
    date: "2026-06-10",
    likesCount: 130,
    viewsCount: 355
  },
  {
    id: "sermon_1",
    title: "Sovereign Grace & Steadfast Leadership",
    speaker: "Pastor Kelvin Wafula",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?q=80&w=800&auto=format&fit=crop",
    description: "An inspiring expository sermon on sovereign grace, building an unshakable family foundation, and developing spiritual leadership within our local community.",
    category: "Sermon",
    duration: "15:02",
    date: "2026-06-15",
    likesCount: 124,
    viewsCount: 382
  },
  {
    id: "motivation_1",
    title: "The Power of Grit & Unshakable Purpose",
    speaker: "Chancellor Kelvin Wafula",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop",
    description: "A high-impact motivational address on self-discipline, persistent study, and breaking mental barriers to lay a solid educational and civic foundation.",
    category: "Motivation",
    duration: "12:45",
    date: "2026-06-20",
    likesCount: 98,
    viewsCount: 247
  },
  {
    id: "sermon_2",
    title: "Walking in Divine Light: Study & Faith",
    speaker: "Brother Opara",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-milky-way-galaxy-in-the-night-sky-40432-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1504051771394-dd2e66b2e08f?q=80&w=800&auto=format&fit=crop",
    description: "An exploration of combining deep biblical studies with scientific literacy to elevate the mind, honoring the Creator through diligent academic pursuits.",
    category: "Sermon",
    duration: "08:15",
    date: "2026-06-28",
    likesCount: 86,
    viewsCount: 194
  },
  {
    id: "worship_1",
    title: "Glorious Praise & Deep Worship Session",
    speaker: "Zion Worship Team",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop",
    description: "An uplifting worship session featuring anointed praise songs, acoustic worship, and spiritual renewal for the body of Christ.",
    category: "Worship Songs",
    duration: "18:40",
    date: "2026-07-01",
    likesCount: 189,
    viewsCount: 512
  },
  {
    id: "worship_2",
    title: "Acoustic Hymns of Faith & Restoration",
    speaker: "Zion Praise Choir",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackBranding.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=800&auto=format&fit=crop",
    description: "Heartfelt acoustic worship and traditional Christian hymns bringing peace, spiritual encouragement, and adoration to God.",
    category: "Worship Songs",
    duration: "16:20",
    date: "2026-07-10",
    likesCount: 156,
    viewsCount: 410
  }
];

export default function SermonsMotivation({ currentUser }: SermonsMotivationProps) {
  const [videos, setVideos] = useState<SermonVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<SermonVideo | null>(null);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Sermon' | 'Motivation' | 'Evangelism' | 'Worship Songs'>('All');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Comments states
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");

  // Admin upload states
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSpeaker, setNewSpeaker] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newThumbnailUrl, setNewThumbnailUrl] = useState(PRESET_THUMBNAILS[0]);
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState<'Sermon' | 'Motivation' | 'Evangelism' | 'Worship Songs'>('Sermon');
  const [newDuration, setNewDuration] = useState("10:00");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Video playback reference
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Authenticate Admin level dynamically
  useEffect(() => {
    if (currentUser) {
      const isUserAdmin = ["main_admin", "admin", "sub_admin"].includes(currentUser.role);
      setIsAdmin(isUserAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [currentUser]);

  // Synchronize videos from Firestore
  useEffect(() => {
    const q = query(collection(db, "sermonVideos"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: SermonVideo[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as SermonVideo);
      });
      
      if (items.length === 0) {
        // If Firestore is empty, seed it with initial videos or load from state
        setVideos(PRESEEDED_VIDEOS);
      } else {
        // Sort by date descending
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setVideos(items);
      }
    }, (err) => {
      console.warn("Firestore sermonVideos subscription failed, falling back to preseeded data:", err);
      setVideos(PRESEEDED_VIDEOS);
    });

    return () => unsubscribe();
  }, []);

  // Update selected video if the videos list updates (to keep views/likes synchronized)
  useEffect(() => {
    if (selectedVideo) {
      const updated = videos.find(v => v.id === selectedVideo.id);
      if (updated) {
        setSelectedVideo(updated);
      }
    } else if (videos.length > 0 && !selectedVideo) {
      setSelectedVideo(videos[0]);
    }
  }, [videos, selectedVideo]);

  // Load comments for selected video
  useEffect(() => {
    if (!selectedVideo) return;
    
    // Query comments with targetId matching selectedVideo.id
    const q = query(collection(db, "comments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Comment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.targetId === selectedVideo.id) {
          items.push({ id: doc.id, ...data } as Comment);
        }
      });
      // Sort by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setComments(items);
    }, (err) => {
      console.error("Failed to load comments:", err);
      // Fallback local storage comments
      const saved = localStorage.getItem(`WAFULA_VIDEO_COMMENTS_${selectedVideo.id}`);
      if (saved) {
        setComments(JSON.parse(saved));
      } else {
        setComments([]);
      }
    });

    return () => unsubscribe();
  }, [selectedVideo?.id]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo) return;
    if (!newCommentText.trim()) return;

    const authorName = currentUser?.name || currentUser?.email?.split("@")[0] || "Guest Scholar";
    const authorId = currentUser?.id || "guest";

    const commentData = {
      targetId: selectedVideo.id,
      userId: authorId,
      userName: authorName,
      text: newCommentText.trim(),
      date: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "comments"), commentData);
      setNewCommentText("");
    } catch (err) {
      console.warn("Could not post to Firestore comments, saving locally instead:", err);
      // Local fallback
      const localComments: Comment[] = [
        {
          id: "local_" + Date.now(),
          ...commentData
        },
        ...comments
      ];
      setComments(localComments);
      localStorage.setItem(`WAFULA_VIDEO_COMMENTS_${selectedVideo.id}`, JSON.stringify(localComments));
      setNewCommentText("");
    }
  };

  const handleLikeVideo = async (video: SermonVideo) => {
    try {
      const docRef = doc(db, "sermonVideos", video.id);
      await updateDoc(docRef, {
        likesCount: increment(1)
      });
    } catch (err) {
      // Local state update fallback
      setVideos(prev => prev.map(v => {
        if (v.id === video.id) {
          return { ...v, likesCount: (v.likesCount || 0) + 1 };
        }
        return v;
      }));
    }
  };

  const handleIncrementView = async (video: SermonVideo) => {
    try {
      const docRef = doc(db, "sermonVideos", video.id);
      await updateDoc(docRef, {
        viewsCount: increment(1)
      });
    } catch (err) {
      // Local fallback
      setVideos(prev => prev.map(v => {
        if (v.id === video.id) {
          return { ...v, viewsCount: (v.viewsCount || 0) + 1 };
        }
        return v;
      }));
    }
  };

  const handleSelectVideo = (video: SermonVideo) => {
    setSelectedVideo(video);
    handleIncrementView(video);
    // Scroll player into view
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");

    if (!newTitle.trim()) {
      setUploadError("Video Title is required.");
      return;
    }
    if (!newSpeaker.trim()) {
      setUploadError("Speaker / Author name is required.");
      return;
    }
    if (!newVideoUrl.trim()) {
      setUploadError("Direct Video Stream URL or MP4 source link is required.");
      return;
    }

    setIsUploading(true);
    const id = "vid_" + Date.now();
    const videoData: Omit<SermonVideo, "id"> = {
      title: newTitle.trim(),
      speaker: newSpeaker.trim(),
      videoUrl: newVideoUrl.trim(),
      thumbnailUrl: newThumbnailUrl,
      description: newDescription.trim() || "No description provided.",
      category: newCategory,
      duration: newDuration.trim() || "10:00",
      date: new Date().toISOString().split("T")[0],
      likesCount: 0,
      viewsCount: 0
    };

    try {
      await addDoc(collection(db, "sermonVideos"), videoData);
      
      // Clean up inputs
      setNewTitle("");
      setNewSpeaker("");
      setNewVideoUrl("");
      setNewDescription("");
      setNewDuration("10:00");
      setShowUploadForm(false);
      setIsUploading(false);
      alert("🎉 Video Sermon successfully published and synchronized with the cloud registry!");
    } catch (err: any) {
      console.warn("Could not write video sermon to Firestore, saving to local list representation:", err);
      // Local state append fallback
      const localCreated: SermonVideo = {
        id,
        ...videoData
      };
      setVideos(prev => [localCreated, ...prev]);
      setShowUploadForm(false);
      setIsUploading(false);
      alert("Published video locally! Note: Firestore permissions or network restrictions applied.");
    }
  };

  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const isMainAdmin = currentUser?.role === "main_admin";

    if (!isMainAdmin) {
      if (!window.confirm("Video deletion requires Main Admin clearance. Submit deletion approval request to Main Admin?")) {
        return;
      }
      const pendingRequests = JSON.parse(localStorage.getItem("WAFULA_PENDING_VIDEO_DELETIONS") || "[]");
      const targetVideo = videos.find(v => v.id === videoId);
      const newReq = {
        id: "del_vid_" + Date.now(),
        videoId,
        videoTitle: targetVideo?.title || "Video",
        requestedBy: currentUser?.name || currentUser?.email || "Secondary Admin",
        requestedEmail: currentUser?.email || "",
        date: new Date().toLocaleString()
      };
      pendingRequests.push(newReq);
      localStorage.setItem("WAFULA_PENDING_VIDEO_DELETIONS", JSON.stringify(pendingRequests));
      alert("🔒 Deletion approval request submitted to Main Admin. Video remains published until Main Admin authorizes removal.");
      return;
    }

    if (!window.confirm("Are you sure you want to permanently delete this video sermon from the sanctuary catalog?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "sermonVideos", videoId));
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }
      alert("✅ Video successfully removed from the index by Main Admin.");
    } catch (err) {
      console.error("Failed to delete video from Firestore:", err);
      setVideos(prev => prev.filter(v => v.id !== videoId));
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }
      alert("Video removed from active view.");
    }
  };

  // Filter and search videos
  const filteredVideos = videos.filter(v => {
    const matchesCategory = activeFilter === 'All' || v.category === activeFilter;
    const matchesSearch = 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.speaker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="sermons_motivation_section" className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6 font-sans">
      
      {/* 1. SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 dark:border-stone-850 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold text-xs tracking-wider uppercase font-mono">
            <Tv className="h-4 w-4" />
            <span>Digital Media Sanctuary</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-50 mt-1">
            Sermons & Motivation
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 max-w-2xl mt-1">
            Watch premium outreach recordings, theological studies, and uplifting leadership motivation uploaded directly by Kelvin Opara Wafula's ministerial team.
          </p>
        </div>

        {/* ADMIN UPLOAD BUTTON */}
        {isAdmin && (
          <button
            id="admin_upload_toggle"
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs tracking-wider uppercase px-4 py-2.5 rounded-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            {showUploadForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{showUploadForm ? "Close Video Panel" : "Upload Sermon/Motivation"}</span>
          </button>
        )}
      </div>

      {/* 2. ADMIN UPLOAD FORM OVERLAY PANEL */}
      <AnimatePresence>
        {showUploadForm && isAdmin && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            id="admin_upload_form_container"
            className="p-5 sm:p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4 text-left"
          >
            <div className="flex items-center space-x-2 text-amber-500 font-bold text-xs uppercase tracking-wider font-mono">
              <ShieldAlert className="h-4 w-4" />
              <span>Wafula Admin Media Center</span>
            </div>
            <h3 className="text-lg font-black text-white">Publish New Video</h3>

            {uploadError && (
              <div className="p-3 bg-red-900/30 border border-red-500/40 text-red-200 rounded-lg text-xs font-semibold">
                ⚠️ {uploadError}
              </div>
            )}

            <form onSubmit={handleAddVideoSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Video Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Integrity & Grace in Leadership"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:border-blue-500 focus:outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Speaker / presenter</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pastor Kelvin Wafula"
                  value={newSpeaker}
                  onChange={(e) => setNewSpeaker(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:border-blue-500 focus:outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Direct MP4 Video stream link</label>
                <input
                  type="url"
                  required
                  placeholder="e.g. https://commondatastorage.googleapis.com/...mp4"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Duration badge</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 14:20"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:border-blue-500 focus:outline-none font-bold"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Select Category</label>
                <div className="flex flex-wrap gap-4 mt-1">
                  <label className="flex items-center space-x-2 text-xs text-white font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={newCategory === "Sermon"}
                      onChange={() => setNewCategory("Sermon")}
                      className="accent-blue-500 h-4 w-4"
                    />
                    <span>Sermon & Bible Study</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-white font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={newCategory === "Motivation"}
                      onChange={() => setNewCategory("Motivation")}
                      className="accent-blue-500 h-4 w-4"
                    />
                    <span>Motivation & Leadership</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-white font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={newCategory === "Evangelism"}
                      onChange={() => setNewCategory("Evangelism")}
                      className="accent-blue-500 h-4 w-4"
                    />
                    <span>Evangelism</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-white font-bold cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={newCategory === "Worship Songs"}
                      onChange={() => setNewCategory("Worship Songs")}
                      className="accent-blue-500 h-4 w-4"
                    />
                    <span>Worship Songs</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Choose Thumbnail cover Image</label>
                <div className="grid grid-cols-5 gap-2 mt-1">
                  {PRESET_THUMBNAILS.map((url, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setNewThumbnailUrl(url)}
                      className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                        newThumbnailUrl === url ? "border-blue-500 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt="Preset cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Video description</label>
                <textarea
                  placeholder="Summarize key talking points or bible verses mentioned..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 text-white text-xs border border-slate-800 rounded-lg p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2 flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="bg-slate-800 text-slate-300 font-bold text-xs uppercase px-4 py-2 rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="bg-blue-600 text-white font-bold text-xs uppercase px-5 py-2 rounded-lg hover:bg-blue-500 flex items-center space-x-2 shadow-lg cursor-pointer"
                >
                  {isUploading ? (
                    <span className="inline-block h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4" />
                  )}
                  <span>{isUploading ? "Publishing..." : "Publish Video"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. ACTIVE CINEMATIC VIDEO THEATRE PLAYER SECTION */}
      {selectedVideo && (
        <div id="active_theatre_player" className="w-full bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-850 shadow-xl flex flex-col lg:flex-row text-left">
          
          {/* Main Player Core */}
          <div className="flex-grow bg-black relative aspect-video lg:max-w-4xl flex items-center justify-center">
            <video
              ref={videoRef}
              key={selectedVideo.id}
              src={selectedVideo.videoUrl}
              controls
              className="w-full h-full object-contain"
              poster={selectedVideo.thumbnailUrl}
              playsInline
            />
          </div>

          {/* Details & Live Thread Sidebar */}
          <div className="lg:w-[380px] p-4 sm:p-5 flex flex-col justify-between bg-[#fbfbf9] dark:bg-stone-900 border-t lg:border-t-0 lg:border-l border-stone-200 dark:border-stone-850 h-[480px] lg:h-auto overflow-y-auto">
            <div className="space-y-4">
              
              {/* Category, Speaker and Title */}
              <div className="space-y-1">
                <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  selectedVideo.category === "Sermon" 
                    ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400" 
                    : selectedVideo.category === "Motivation"
                    ? "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400"
                    : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-850 dark:text-emerald-400"
                }`}>
                  {selectedVideo.category}
                </span>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-50 leading-snug">
                  {selectedVideo.title}
                </h3>
                <div className="flex items-center space-x-1.5 text-xs text-stone-500 dark:text-stone-400">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-bold">{selectedVideo.speaker}</span>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex items-center justify-between text-[11px] text-stone-400 border-y border-stone-200 dark:border-stone-800 py-2">
                <span className="flex items-center space-x-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{selectedVideo.date}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{selectedVideo.viewsCount || 0} views</span>
                </span>
                <button 
                  onClick={() => handleLikeVideo(selectedVideo)}
                  className="flex items-center space-x-1 text-rose-500 font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Heart className="h-3.5 w-3.5 fill-rose-500" />
                  <span>{selectedVideo.likesCount || 0}</span>
                </button>
              </div>

              {/* Description */}
              <div className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-sans max-h-24 overflow-y-auto">
                {selectedVideo.description}
              </div>

              {/* Comments Thread */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-stone-850 dark:text-stone-200 uppercase tracking-wider flex items-center space-x-1.5 border-b border-stone-200 dark:border-stone-800 pb-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                  <span>Sanctuary Discussion ({comments.length})</span>
                </h4>

                <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <p className="text-[10px] text-stone-400 italic text-center py-2">No notes posted yet. Start the study conversation!</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="p-2 bg-stone-100 dark:bg-stone-950/40 rounded-lg space-y-0.5">
                        <div className="flex justify-between items-center text-[9px] font-mono font-bold text-stone-500">
                          <span className="text-blue-600 dark:text-blue-400">{c.userName}</span>
                          <span>{new Date(c.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[10px] text-stone-700 dark:text-stone-300 leading-normal">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Post Comment Input */}
            <form onSubmit={handlePostComment} className="mt-4 flex space-x-2 border-t border-stone-200 dark:border-stone-800 pt-3">
              <input
                type="text"
                placeholder="Share your reflection or ask a question..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="flex-1 bg-stone-100 dark:bg-stone-950/80 border border-stone-200 dark:border-stone-800 rounded-lg px-2.5 py-1.5 text-[10px] text-stone-900 dark:text-stone-100 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] uppercase px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Send
              </button>
            </form>

          </div>
        </div>
      )}

      {/* 4. GRID SELECTION CORE */}
      <div className="space-y-4">
        
        {/* Navigation Filters & Instant Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#fbfbf9] dark:bg-stone-900/60 border border-stone-200 dark:border-stone-850 p-3 rounded-xl">
          
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {(['All', 'Sermon', 'Motivation', 'Evangelism', 'Worship Songs'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-150 cursor-pointer ${
                  activeFilter === filter 
                    ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-md" 
                    : "text-stone-550 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-850"
                }`}
              >
                {filter === "All" ? "All Media" : filter === "Sermon" ? "Sermons" : filter === "Motivation" ? "Motivational Videos" : filter === "Evangelism" ? "Evangelism" : "Worship Songs"}
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-64 flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search sermons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-stone-850 dark:text-stone-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 text-stone-400 hover:text-stone-600">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-[#fbfbf9] dark:bg-stone-900/40 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800">
              <Film className="h-8 w-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500 dark:text-stone-400 font-bold">No videos found matching your filters</p>
              <button 
                onClick={() => { setSearchQuery(""); setActiveFilter("All"); }}
                className="text-[10px] text-blue-500 font-black mt-1 hover:underline"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            filteredVideos.map(video => {
              const isSelected = selectedVideo?.id === video.id;
              return (
                <div
                  key={video.id}
                  onClick={() => handleSelectVideo(video)}
                  className={`group relative bg-white dark:bg-stone-900 border rounded-2xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between ${
                    isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-stone-200 dark:border-stone-850 hover:border-stone-300 dark:hover:border-stone-750"
                  }`}
                >
                  <div>
                    {/* Thumbnail Preview Banner */}
                    <div className="relative aspect-video w-full overflow-hidden bg-black">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      
                      {/* Hover Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <div className="h-10 w-10 bg-white/90 rounded-full flex items-center justify-center text-stone-900 shadow-lg scale-95 group-hover:scale-100 transition-all">
                          <Play className="h-5 w-5 fill-stone-900 translate-x-0.5" />
                        </div>
                      </div>

                      {/* Duration Indicator */}
                      <span className="absolute bottom-2 right-2 bg-stone-950/80 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded">
                        {video.duration}
                      </span>

                      {/* Category Badge */}
                      <span className={`absolute top-2 left-2 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        video.category === "Sermon" 
                          ? "bg-amber-500 text-white" 
                          : video.category === "Motivation"
                          ? "bg-blue-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}>
                        {video.category}
                      </span>
                    </div>

                    {/* Meta detail description body */}
                    <div className="p-4 space-y-1 text-left">
                      <h4 className="font-extrabold text-xs sm:text-sm text-stone-850 dark:text-stone-50 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {video.title}
                      </h4>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 font-mono font-bold flex items-center space-x-1">
                        <User className="h-3 w-3 inline shrink-0" />
                        <span>{video.speaker}</span>
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 pt-1">
                        {video.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Stats Bottom Bar */}
                  <div className="p-3.5 border-t border-stone-100 dark:border-stone-850/60 flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                    <span className="flex items-center space-x-1">
                      <Eye className="h-3 w-3" />
                      <span>{video.viewsCount || 0}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                      <span>{video.likesCount || 0}</span>
                    </span>

                    {isAdmin && (
                      <button
                        onClick={(e) => handleDeleteVideo(video.id, e)}
                        className="p-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete video sermon"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
}
