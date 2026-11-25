import React, { useState, useEffect, useRef } from "react";
import {
  Video, VideoOff, Mic, MicOff, MonitorUp, PhoneOff, MessageSquare,
  Users, Hand, Shield, Settings, Sparkles, Send, PenTool, Eraser,
  RotateCcw, Download, CheckCircle2, AlertCircle, Clock, Globe,
  ExternalLink, Calendar, Maximize2, Share2
} from "lucide-react";
import { User } from "../types";

interface ZionVirtualClassroomProps {
  currentUser: User | null;
  classTitle?: string;
  courseCode?: string;
  tutorName?: string;
  onLeaveClass?: () => void;
  onAttendanceMarked?: (studentEmail: string) => void;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderRole: string;
  text: string;
  time: string;
  isTutor?: boolean;
}

interface Participant {
  id: string;
  name: string;
  role: "Tutor" | "Student" | "Observer";
  email: string;
  isMuted: boolean;
  isVideoOff: boolean;
  handRaised: boolean;
}

export default function ZionVirtualClassroom({
  currentUser,
  classTitle = "Christian Leadership & Systematic Exegesis Lecture",
  courseCode = "BIB01/001/26",
  tutorName = "Dr. Kelvin Opara Wafula",
  onLeaveClass,
  onAttendanceMarked,
}: ZionVirtualClassroomProps) {
  // Media device states
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasMediaError, setHasMediaError] = useState<string | null>(null);

  // Active view & tools
  const [activeTab, setActiveTab] = useState<"chat" | "participants" | "whiteboard">("chat");
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  // Video streams
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Whiteboard canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [boardColor, setBoardColor] = useState("#F5B82E");
  const [boardTool, setBoardTool] = useState<"pen" | "eraser">("pen");
  const [lineWidth, setLineWidth] = useState(3);

  // Class chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg_1",
      senderName: tutorName,
      senderRole: "Tutor",
      text: "Welcome scholars to today's live lecture. Please check your notes in the academic repository and have your question ready for the Q&A segment.",
      time: "10:00 AM",
      isTutor: true,
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Participants
  const isHost = Boolean(
    currentUser && (currentUser.role === "main_admin" || currentUser.role === "admin" || currentUser.role === "tutor" || currentUser.role === "manager")
  );

  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: "part_tutor",
      name: tutorName,
      role: "Tutor",
      email: "wafulak435@gmail.com",
      isMuted: false,
      isVideoOff: false,
      handRaised: false,
    },
    {
      id: "part_self",
      name: currentUser?.name || currentUser?.email?.split("@")[0] || "Scholar Participant",
      role: isHost ? "Tutor" : "Student",
      email: currentUser?.email || "scholar@ziondigital.co.ke",
      isMuted: false,
      isVideoOff: false,
      handRaised: false,
    },
    {
      id: "part_3",
      name: "Mary Achieng (Form 4 Candidate)",
      role: "Student",
      email: "mary.achieng@ziondigital.co.ke",
      isMuted: true,
      isVideoOff: false,
      handRaised: false,
    },
    {
      id: "part_4",
      name: "Pastor Samuel Barasa",
      role: "Student",
      email: "samuel.barasa@theology.zion.co.ke",
      isMuted: true,
      isVideoOff: true,
      handRaised: false,
    },
  ]);

  // Google Meet fallback option
  const [googleMeetUrl, setGoogleMeetUrl] = useState(
    `https://meet.google.com/new?authuser=0&hs=179`
  );

  // 1. Initialize WebRTC Camera & Microphone
  useEffect(() => {
    let mounted = true;

    async function initMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 360 } },
            audio: true,
          });
          if (mounted) {
            localStreamRef.current = stream;
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
            setHasMediaError(null);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setHasMediaError(
            err.name === "NotAllowedError"
              ? "Camera & microphone permissions were denied. You can still participate in audio/chat mode or use Google Meet."
              : "Camera device not detected or currently in use by another program."
          );
        }
      }
    }

    initMedia();

    // Mark attendance
    if (currentUser?.email && onAttendanceMarked) {
      onAttendanceMarked(currentUser.email);
    }

    // Timer
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      mounted = false;
      clearInterval(timer);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [currentUser?.email, onAttendanceMarked]);

  // Toggle Camera Track
  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    } else {
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Toggle Microphone Track
  const handleToggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    } else {
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Screen Sharing WebRTC DisplayMedia
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = stream;
          if (screenShareVideoRef.current) {
            screenShareVideoRef.current.srcObject = stream;
          }
          setIsScreenSharing(true);
          stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            screenStreamRef.current = null;
          };
        }
      } catch (err) {
        console.warn("Screen share cancelled or not supported:", err);
      }
    }
  };

  // Hand Raising
  const handleToggleHand = () => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    setParticipants((prev) =>
      prev.map((p) => (p.id === "part_self" ? { ...p, handRaised: next } : p))
    );
    if (next) {
      const newMsg: ChatMessage = {
        id: `sys_${Date.now()}`,
        senderName: "Class System",
        senderRole: "Observer",
        text: `✋ ${currentUser?.name || "A scholar"} raised their hand with a question for the instructor.`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, newMsg]);
    }
  };

  // Send In-Class Chat Message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg: ChatMessage = {
      id: `chat_${Date.now()}`,
      senderName: currentUser?.name || currentUser?.email?.split("@")[0] || "Scholar",
      senderRole: isHost ? "Tutor" : "Student",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isTutor: isHost,
    };
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");
  };

  // Interactive Whiteboard drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = boardTool === "eraser" ? 20 : lineWidth;
    ctx.strokeStyle = boardTool === "eraser" ? "#0F172A" : boardColor;
    ctx.lineCap = "round";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-full min-h-[600px] w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#07142B] text-white shadow-2xl">
      {/* 1. Classroom Top Header Bar */}
      <header className="px-4 py-3 bg-[#0B254D] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#F5B82E] text-[#0B254D] flex items-center justify-center font-bold shrink-0">
            <Video className="h-5 w-5" />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold text-[#F5B82E] tracking-wider px-2 py-0.5 rounded bg-black/30">
                {courseCode} · Live
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{formatTime(elapsedSeconds)}</span>
              </span>
              {isRecording && (
                <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold font-mono animate-pulse">
                  REC
                </span>
              )}
            </div>
            <h2 className="font-display text-sm sm:text-base font-bold text-white truncate max-w-md">
              {classTitle}
            </h2>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Google Meet Alternate Link */}
          <a
            href={googleMeetUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-blue-100 text-xs font-semibold border border-white/15 transition"
            title="Launch in Google Meet"
          >
            <Globe className="h-3.5 w-3.5 text-blue-300" />
            <span>Google Meet Room</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>

          {isHost && (
            <button
              type="button"
              onClick={() => setIsRecording(!isRecording)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isRecording
                  ? "bg-rose-600 text-white"
                  : "bg-white/10 hover:bg-white/20 text-blue-200 border border-white/10"
              }`}
            >
              <span>{isRecording ? "Stop Recording" : "Record Class"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLeaveClass}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <PhoneOff className="h-3.5 w-3.5" />
            <span>Leave Class</span>
          </button>
        </div>
      </header>

      {/* 2. Media Warning if Camera Permission Denied */}
      {hasMediaError && (
        <div className="bg-amber-950/80 border-b border-amber-900/50 px-4 py-2 text-xs text-amber-200 flex items-center justify-between gap-2 text-left">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{hasMediaError}</span>
          </div>
          <a
            href={googleMeetUrl}
            target="_blank"
            rel="noreferrer"
            className="underline font-bold text-white shrink-0"
          >
            Open in Google Meet &rarr;
          </a>
        </div>
      )}

      {/* 3. Main Stage: Stage Display + Sidebar (Chat / Participants / Whiteboard) */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT / CENTER: Video Viewport & Shared Screen */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 bg-slate-950 min-h-0 overflow-y-auto">
          {activeTab === "whiteboard" ? (
            /* Interactive Tutor Whiteboard */
            <div className="flex-1 flex flex-col rounded-2xl border border-slate-800 bg-[#0F172A] p-3 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <div className="flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-[#F5B82E]" />
                  <span className="font-bold text-xs">Instructor Interactive Blackboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {["#F5B82E", "#38BDF8", "#34D399", "#FFFFFF", "#F87171"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setBoardColor(c);
                          setBoardTool("pen");
                        }}
                        className={`h-5 w-5 rounded-full border border-white/20 transition ${
                          boardColor === c && boardTool === "pen" ? "ring-2 ring-white scale-110" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setBoardTool(boardTool === "pen" ? "eraser" : "pen")}
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                      boardTool === "eraser"
                        ? "bg-[#155EEF] text-white border-blue-400"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                    title="Toggle Eraser"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={clearWhiteboard}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer"
                    title="Clear Board"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 relative rounded-xl overflow-hidden bg-[#0F172A] border border-slate-800 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={450}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-full cursor-crosshair"
                />
              </div>
            </div>
          ) : (
            /* Video Conference Grid */
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-[300px]">
              {/* Instructor Podium Stream */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner group">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${!isVideoEnabled ? "hidden" : ""}`}
                />
                {!isVideoEnabled && (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <div className="h-16 w-16 rounded-full bg-[#0B254D] border border-[#F5B82E] flex items-center justify-center text-[#F5B82E] font-bold text-xl">
                      KO
                    </div>
                    <p className="text-xs font-bold text-white">{tutorName}</p>
                    <span className="text-[10px] text-slate-400 font-mono">Camera Paused</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Instructor: {tutorName}</span>
                </div>
              </div>

              {/* Screen Share or Classmate View */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
                {isScreenSharing ? (
                  <video
                    ref={screenShareVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-contain bg-black"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <div className="h-14 w-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-300 font-bold text-lg">
                      {currentUser?.name?.[0] || "S"}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {currentUser?.name || "You (Scholar)"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {isHandRaised ? "✋ Hand Raised" : "Audio Active · Ready for Q&A"}
                      </p>
                    </div>
                    {!isScreenSharing && (
                      <button
                        type="button"
                        onClick={handleToggleScreenShare}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold border border-slate-700 cursor-pointer"
                      >
                        <MonitorUp className="h-3.5 w-3.5" />
                        <span>Present Your Screen</span>
                      </button>
                    )}
                  </div>
                )}
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 border border-white/10">
                  <span>{isScreenSharing ? "Screen Presentation" : "Scholar Feed"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Floating Control Bar */}
          <div className="mt-3 p-2 bg-[#0B254D] border border-white/10 rounded-2xl flex items-center justify-center gap-2 sm:gap-4 shrink-0 shadow-lg">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`p-3 rounded-xl transition cursor-pointer ${
                isAudioEnabled
                  ? "bg-white/15 hover:bg-white/20 text-white"
                  : "bg-rose-600 text-white"
              }`}
              title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            {/* Video Toggle */}
            <button
              type="button"
              onClick={handleToggleVideo}
              className={`p-3 rounded-xl transition cursor-pointer ${
                isVideoEnabled
                  ? "bg-white/15 hover:bg-white/20 text-white"
                  : "bg-rose-600 text-white"
              }`}
              title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            {/* Screen Share */}
            <button
              type="button"
              onClick={handleToggleScreenShare}
              className={`p-3 rounded-xl transition cursor-pointer ${
                isScreenSharing
                  ? "bg-[#155EEF] text-white"
                  : "bg-white/15 hover:bg-white/20 text-white"
              }`}
              title="Share Screen"
            >
              <MonitorUp className="h-5 w-5" />
            </button>

            {/* Hand Raising */}
            <button
              type="button"
              onClick={handleToggleHand}
              className={`p-3 rounded-xl transition cursor-pointer ${
                isHandRaised
                  ? "bg-[#F5B82E] text-[#0B254D] font-bold"
                  : "bg-white/15 hover:bg-white/20 text-white"
              }`}
              title={isHandRaised ? "Lower Hand" : "Raise Hand"}
            >
              <Hand className="h-5 w-5" />
            </button>

            {/* Blackboard Switcher */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "whiteboard" ? "chat" : "whiteboard")}
              className={`p-3 rounded-xl transition cursor-pointer ${
                activeTab === "whiteboard"
                  ? "bg-[#F5B82E] text-[#0B254D]"
                  : "bg-white/15 hover:bg-white/20 text-white"
              }`}
              title="Interactive Whiteboard"
            >
              <PenTool className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* RIGHT: Tabbed Drawer (Chat / Participants) */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#07142B] flex flex-col shrink-0">
          {/* Drawer Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === "chat"
                  ? "bg-[#155EEF] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>In-Class Chat</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("participants")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === "participants"
                  ? "bg-[#155EEF] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Classmates ({participants.length})</span>
            </button>
          </div>

          {/* Chat Panel */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-[300px]">
              <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[340px] lg:max-h-none text-left">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-2.5 space-y-1 text-xs ${
                      msg.isTutor
                        ? "bg-[#0B254D] border border-[#155EEF]/50 text-blue-100"
                        : "bg-slate-900 border border-slate-800 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-white flex items-center gap-1">
                        {msg.isTutor && <span className="text-[#F5B82E]">★ Tutor</span>}
                        <span>{msg.senderName}</span>
                      </span>
                      <span className="text-slate-500 font-mono">{msg.time}</span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={handleSendChat}
                className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question in class..."
                  className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-[#155EEF]"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white text-xs font-bold transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          )}

          {/* Participants Panel */}
          {activeTab === "participants" && (
            <div className="flex-1 p-3 space-y-2 overflow-y-auto text-left">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold pb-1 border-b border-slate-800">
                Attendance Roster &middot; {participants.length} Active
              </p>
              {participants.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800"
                >
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{part.name}</span>
                      {part.handRaised && <span className="text-amber-400">✋</span>}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{part.email}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      part.role === "Tutor"
                        ? "bg-[#F5B82E] text-[#0B254D]"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {part.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
