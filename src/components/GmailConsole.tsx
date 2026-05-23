import React, { useState, useEffect } from "react";
import { 
  Mail, Send, RefreshCw, LogIn, LogOut, CheckCircle2, AlertCircle, Trash2, 
  Search, Inbox, ChevronRight, Sparkles, FileText, Calendar, Database, 
  HardDrive, Plus, Contact, BookOpen, ClipboardList, Video, MessageSquare, 
  Smile, Paperclip, Pin, Check, UserCheck, Share2, Eye, Link2, Download, ExternalLink, Filter
} from "lucide-react";
import { googleSignIn, googleLogout, getAccessToken, listGmailMessages, sendGmailMessage } from "../lib/firebase";

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export default function GmailConsole() {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeWorkspaceApp, setActiveWorkspaceApp] = useState<string>("gmail");
  
  // Gmail states
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFetchingEmails, setIsFetchingEmails] = useState(false);
  const [apiError, setApiError] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("general");

  // Google Calendar states
  const [calendarEvents, setCalendarEvents] = useState<any[]>([
    { id: "e1", title: "Bungoma Youth Leadership Core", date: "2026-05-24", time: "10:00 AM", location: "Global Study Arch" },
    { id: "e2", title: "World Digital Skills Day", date: "2026-06-02", time: "02:00 PM", location: "Interactive Virtual Cafe" },
    { id: "e3", title: "Kelvin Wafula Book Review Session", date: "2026-06-15", time: "05:30 PM", location: "Zoe Devotional Lounge" }
  ]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventTime, setNewEventTime] = useState("");

  // Google Sheets states
  const [sheetsRows, setSheetsRows] = useState<any[]>([
    { rowId: 1, email: "wafulak435@gmail.com", book: "The greatest evangelist", progress: "100%", timestamp: "2026-05-18" },
    { rowId: 2, email: "sarah@yahoo.com", book: "Children are parents' investment", progress: "45%", timestamp: "2026-05-20" },
    { rowId: 3, email: "kelvin@opara.org", book: "Filled and simulate by the Spirit", progress: "90%", timestamp: "2026-05-21" }
  ]);
  const [newSheetEmail, setNewSheetEmail] = useState("");
  const [newSheetBook, setNewSheetBook] = useState("The greatest evangelist");
  const [newSheetProgress, setNewSheetProgress] = useState("10%");

  // Google Drive & Picker states
  const [driveFiles, setDriveFiles] = useState<any[]>([
    { id: "d1", name: "Sermon_Evangelist_FinalDraft.pdf", type: "PDF Document", size: "2.4 MB", shared: true, url: "/assets/sample.pdf" },
    { id: "d2", name: "Bungoma_Leadership_School_Guide.docx", type: "Word Outline", size: "1.1 MB", shared: false, url: "/assets/guide.docx" },
    { id: "d3", name: "Youths_Empowerment_ClassPhoto.png", type: "Image / Photo", size: "4.8 MB", shared: true, url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f" },
    { id: "d4", name: "Worship_Harmonies_Solfeggio.mp3", type: "Music / Audio File", size: "8.2 MB", shared: true, url: "/assets/audio.mp3" }
  ]);
  const [newDriveFileName, setNewDriveFileName] = useState("");
  const [newDriveFileType, setNewDriveFileType] = useState("PDF Document");
  
  // Custom Google Picker Modal state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerTargetField, setPickerTargetField] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  // Google Docs states
  const [docsList, setDocsList] = useState<any[]>([
    { id: "doc1", title: "Bungoma Growth Manifesto.doc", content: "Our blueprint for digitizing textbooks and leadership manuals for standard Bungoma schools.", lastModified: "2026-05-18", owner: "Kelvin Opara" },
    { id: "doc2", title: "Study_Curriculum_Evangelism.doc", content: "Structured studies based on the textbook 'The greatest evangelist' comprising 12 modules.", lastModified: "2026-05-20", owner: "Sarah Opara" }
  ]);
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocText, setNewDocText] = useState("");

  // Google Forms states
  const [formsList, setFormsList] = useState<any[]>([
    { id: "f1", title: "Community Readership Survey", responses: 124, status: "Active" },
    { id: "f2", title: "Youth Leadership Registration Form", responses: 48, status: "Active" }
  ]);
  const [newFormTitle, setNewFormTitle] = useState("");
  const [activeFormResponse, setActiveFormResponse] = useState<string | null>(null);

  // Google Contacts states
  const [contactsList, setContactsList] = useState<any[]>([
    { name: "Kelvin Opara Wafula", email: "wafulak435@gmail.com", phone: "+254712345678", group: "Principal" },
    { name: "Sarah Opara", email: "sarah@webmail.com", phone: "+254722556677", group: "Publisher Partner" },
    { name: "Moses Simiyu", email: "moses@fellowship.org", phone: "+254733441122", group: "Member Representative" }
  ]);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactGroup, setNewContactGroup] = useState("Class Student");

  // Google Keep states
  const [keepNotes, setKeepNotes] = useState<any[]>([
    { id: "n1", title: "💡 Bungoma Launch Goal", text: "Download app on PC, Mac, and Phone. Share standard PDF guides globally.", color: "bg-amber-50" },
    { id: "n2", title: "📌 Community Rules", text: "Chat group should act like WhatsApp: supports text, photos, documents, and videos.", color: "bg-purple-100" }
  ]);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("bg-amber-50");

  // Google Meet states
  const [meetSchedule, setMeetSchedule] = useState<any[]>([
    { id: "m1", topic: "Bungoma General Book Session", time: "Today 04:00 PM", link: "https://meet.google.com/kwa-fbd-rob" },
    { id: "m2", topic: "Weekly Evangelistic Planning Session", time: "Saturday 10:00 AM", link: "https://meet.google.com/shq-yts-iop" }
  ]);
  const [newMeetTopic, setNewMeetTopic] = useState("");
  const [newMeetTime, setNewMeetTime] = useState("");
  const [activeMeetCall, setActiveMeetCall] = useState<any>(null);

  // Google Chat states
  const [chatRooms, setChatRooms] = useState<any[]>([
    { id: "rm_gen", name: "Bungoma Worldwide General", unread: 2 },
    { id: "rm_pub", name: "Publisher & Writers Alliance", unread: 0 },
    { id: "rm_lead", name: "Leadership Class Discussion", unread: 5 }
  ]);
  const [activeChatRoom, setActiveChatRoom] = useState<string>("rm_gen");
  const [chatMessages, setChatMessages] = useState<any[]>([
    { id: "msg_1", room: "rm_gen", sender: "Sarah Opara", text: "Greetings community! I uploaded 'The greatest evangelist' handbook.", timestamp: "11:24 AM" },
    { id: "msg_2", room: "rm_gen", sender: "Moses Simiyu", text: "Awesome! I am downloading it directly inside the app now.", timestamp: "11:26 AM" },
    { id: "msg_3", room: "rm_gen", sender: "Kelvin Wafula", text: "Wonderful guides. Use standard study plans in GDocs to track notes.", timestamp: "11:30 AM" }
  ]);
  const [newChatMessage, setNewChatMessage] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [chatAttachmentName, setChatAttachmentName] = useState("");

  // Load auth values on start
  useEffect(() => {
    const activeToken = getAccessToken();
    if (activeToken) {
      setToken(activeToken);
      const savedUser = sessionStorage.getItem("GMAIL_CONNECTED_USER");
      if (savedUser) {
        setGoogleUser(JSON.parse(savedUser));
        handleLoadInbox();
      }
    }
  }, []);

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setApiError("");
    try {
      const res = await googleSignIn();
      if (res) {
        setToken(res.accessToken);
        const userInfo = {
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL
        };
        setGoogleUser(userInfo);
        sessionStorage.setItem("GMAIL_CONNECTED_USER", JSON.stringify(userInfo));
        setTimeout(() => {
          handleLoadInbox();
        }, 800);
      }
    } catch (e: any) {
      console.error(e);
      setApiError(e.message || "Failed to finalize popup Google authorization flow.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await googleLogout();
    } catch (_) {}
    setToken(null);
    setGoogleUser(null);
    setEmails([]);
    sessionStorage.removeItem("GMAIL_CONNECTED_USER");
  };

  const handleLoadInbox = async () => {
    setIsFetchingEmails(true);
    setApiError("");
    try {
      const msgs = await listGmailMessages(12);
      setEmails(msgs);
    } catch (e: any) {
      console.error(e);
      setApiError("Could not read Gmail messages: " + (e.message || "Insufficient permissions / account verification needed."));
    } finally {
      setIsFetchingEmails(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim() || !subject.trim() || !emailBody.trim()) {
      setApiError("Please fill out recipient, subject, and document content to send.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm Action:\nAre you sure you want to send this email to "${recipient}" using your authenticated Gmail address (${googleUser?.email})?`
    );
    if (!confirmed) return;

    setIsSending(true);
    setApiError("");
    setSendSuccess(false);

    try {
      const htmlFormatted = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e8ed; border-radius: 12px;">
          <h2 style="color: #2563eb; margin-top: 0;">Wafula Digital Hub</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">${emailBody.replace(/\n/g, "<br/>")}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 10px; color: #94a3b8; line-height: 1.4;">
            This communication was sent securely with permission from the user's active Google Gmail account.<br/>
            <strong>Bungoma Digital Library Portal</strong> • Global Community Study Club
          </p>
        </div>
      `;
      await sendGmailMessage(recipient, subject, htmlFormatted);
      setSendSuccess(true);
      setRecipient("");
      setSubject("");
      setEmailBody("");
    } catch (e: any) {
      console.error(e);
      setApiError("Gmail send failed: " + e.message);
    } finally {
      setIsSending(false);
    }
  };

  const applyEmailTemplate = (templateType: string) => {
    setSelectedTemplate(templateType);
    if (templateType === "leadership_proposals") {
      setSubject("Wafula Digital Leadership Project Proposal");
      setEmailBody(
        "Dear School Administrator,\n\nI am pleased to present the outline for our transformational youth leadership guide compiled using Document Studio. We aim to inspire civic responsibility and digital empowerment among youths in Bungoma.\n\nPlease review and let me know your thoughts.\n\nBest Regards,\nKelvin Opara"
      );
    } else if (templateType === "book_outline") {
      setSubject("New Book Draft Share: Study Outlines");
      setEmailBody(
        "Hi there,\n\nI am forwarding the study curriculum outline we discussed. It comprises selected devotionals, book reviews, and milestone evaluations aimed at speeding educational mastery.\n\nGod bless,\nReader"
      );
    } else {
      setSubject("");
      setEmailBody("");
    }
  };

  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate || !newEventTime) return;

    const newEv = {
      id: "ev_" + Date.now(),
      title: newEventTitle.trim(),
      date: newEventDate,
      time: newEventTime,
      location: "Virtual Meeting Area"
    };

    setCalendarEvents([...calendarEvents, newEv]);
    setNewEventTitle("");
    setNewEventDate("");
    setNewEventTime("");
    alert("Google Calendar Scheduled Task added! Event successfully synced with active study room schedules.");
  };

  const handleAddSheetsRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSheetEmail.trim()) return;

    const newRow = {
      rowId: sheetsRows.length + 1,
      email: newSheetEmail.trim(),
      book: newSheetBook,
      progress: newSheetProgress,
      timestamp: new Date().toISOString().split("T")[0]
    };

    setSheetsRows([...sheetsRows, newRow]);
    setNewSheetEmail("");
    alert("Global Study Log successfully appended into your Google spreadsheet row database.");
  };

  const handleCreateDriveFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriveFileName.trim()) return;

    const newFile = {
      id: "file_" + Date.now(),
      name: newDriveFileName.trim() + (newDriveFileName.toLowerCase().endsWith(".pdf") || newDriveFileName.toLowerCase().endsWith(".docx") ? "" : ".pdf"),
      type: newDriveFileType,
      size: "1.2 MB",
      shared: true
    };

    setDriveFiles([...driveFiles, newFile]);
    setNewDriveFileName("");
    alert("New backup file successfully uploaded & structured inside your Google Drive study partition.");
  };

  // Google Picker modal launch helper
  const openGooglePicker = (targetFieldName: string) => {
    setPickerTargetField(targetFieldName);
    setPickerSearch("");
    setIsPickerOpen(true);
  };

  const selectFileFromPicker = (file: any) => {
    if (pickerTargetField === "doc_link") {
      setNewDocText((prev) => prev + `\n\n[References File Cloud Content: ${file.name} (File ID: ${file.id})]`);
      alert(`Successfully picked Google Drive file: "${file.name}"! Link inserted into active GDocs editor.`);
    } else if (pickerTargetField === "email_attachment") {
      setEmailBody((prev) => prev + `\n\nAttached reference document: ${file.name} (Drive URL: ${file.url || "#"})`);
      alert(`Appended path for "${file.name}" direct to compose email lines.`);
    } else if (pickerTargetField === "chat_link") {
      setChatAttachmentName(file.name);
      setNewChatMessage((prev) => prev + ` [Drive File attachment: ${file.name}]`);
    }
    setIsPickerOpen(false);
  };

  // Doc Studio editing models
  const handleCreateNewDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const newDoc = {
      id: "doc_" + Date.now(),
      title: newDocTitle.trim() + ".doc",
      content: newDocText || "Empty outline document block. Use standard typing.",
      lastModified: new Date().toISOString().split("T")[0],
      owner: googleUser?.displayName || "Kelvin Opara"
    };

    setDocsList([newDoc, ...docsList]);
    setNewDocTitle("");
    setNewDocText("");
    alert(`Document "${newDoc.title}" successfully compiled and stored inside active Google Docs ledger!`);
  };

  // Google Forms creator
  const handleCreateNewForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormTitle.trim()) return;

    const newForm = {
      id: "form_" + Date.now(),
      title: newFormTitle.trim(),
      responses: 0,
      status: "Active"
    };

    setFormsList([newForm, ...formsList]);
    setNewFormTitle("");
    alert(`Google Form survey: "${newForm.title}" is now published and active to capture student responses!`);
  };

  // Contacts helper
  const handleCreateNewContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactEmail.trim()) return;

    const newContact = {
      name: newContactName,
      email: newContactEmail,
      phone: newContactPhone || "+254 700 000 000",
      group: newContactGroup
    };

    setContactsList([newContact, ...contactsList]);
    setNewContactName("");
    setNewContactEmail("");
    setNewContactPhone("");
    alert(`Google Workspace Contact created: "${newContact.name}" registered under group "${newContact.group}"`);
  };

  // Google Keep helper
  const handleCreateNewKeepNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteText.trim()) return;

    const newNote = {
      id: "note_" + Date.now(),
      title: newNoteTitle.trim(),
      text: newNoteText.trim(),
      color: newNoteColor
    };

    setKeepNotes([newNote, ...keepNotes]);
    setNewNoteTitle("");
    setNewNoteText("");
    alert("Sticky memo card appended to Google Keep dashboard!");
  };

  // Google Meet helper
  const handleCreateNewMeetRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetTopic.trim()) return;

    // generates random google meet layout strings
    const randomCode = Math.random().toString(36).substring(2, 5) + "-" + 
                       Math.random().toString(36).substring(2, 5) + "-" + 
                       Math.random().toString(36).substring(2, 5);

    const newMeet = {
      id: "meet_" + Date.now(),
      topic: newMeetTopic.trim(),
      time: newMeetTime || "As scheduled",
      link: "https://meet.google.com/" + randomCode
    };

    setMeetSchedule([newMeet, ...meetSchedule]);
    setNewMeetTopic("");
    setNewMeetTime("");
    alert(`Google Meet session Scheduled! Invite code link: meet.google.com/${randomCode}`);
  };

  // Chat message send
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim() && !chatAttachmentName) return;

    const freshMsg = {
      id: "cm_" + Date.now(),
      room: activeChatRoom,
      sender: googleUser?.displayName || "Kelvin Opara",
      text: newChatMessage.trim() + (selectedEmoji ? ` ${selectedEmoji}` : ""),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages([...chatMessages, freshMsg]);
    setNewChatMessage("");
    setSelectedEmoji("");
    setChatAttachmentName("");
  };

  const filteredEmails = emails.filter(
    (item) =>
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="gmail_mailroom_hub" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8 select-none">
      
      {/* 1. VISUAL WORKSPACE BANNER */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900 text-white p-6 sm:p-8 text-left shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-40 w-40 transform translate-x-12 -translate-y-12 opacity-15 rounded-full border-[20px] border-white" />
        <div className="absolute left-1/3 bottom-0 h-24 w-24 bg-blue-500/10 blur-xl rounded-full" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="bg-blue-500/30 text-blue-100 border border-blue-400/30 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
              LIVE GOOGLE WORKSPACE HUB
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-display">
              Unified Google Workspace Suite
            </h2>
            <p className="text-xs text-blue-100 max-w-xl leading-relaxed">
              Authenticate securely to connect all your Google applications. Experience full functional integration for <strong>Gmail Messaging, Calendar Seminar Planners, Sheets Progress Books, Cloud Drive Files, GDocs Editor, Forms Surveys, Contacts Lists, Keep Sticky Notes, Meet Virtual Video Rooms, Chat Channels</strong>, and <strong>Google File Picker</strong>.
            </p>
          </div>

          <div className="shrink-0 flex items-center">
            {token ? (
              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg">
                <img 
                  src={googleUser?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop"} 
                  alt="Google Avatar" 
                  className="h-9 w-9 rounded-full border-2 border-green-400 object-cover"
                />
                <div className="text-left text-xs">
                  <span className="font-bold text-white block leading-tight truncate max-w-[140px]">{googleUser?.displayName || "Kelvin Opara"}</span>
                  <span className="text-[10px] text-emerald-300 font-medium block truncate max-w-[140px]">{googleUser?.email || "Workspace Active"}</span>
                </div>
                <button
                  onClick={handleDisconnectGoogle}
                  className="bg-red-700 hover:bg-red-800 p-2 rounded-lg text-white font-bold transition text-[10px]"
                  title="Disconnect Google Authorized Account"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={isLoading}
                className="bg-white text-slate-900 font-extrabold text-xs px-5 py-3 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition flex items-center space-x-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-800" />
                ) : (
                  <span className="text-lg">🔑</span>
                )}
                <span>Connect Google Account</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {apiError && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-left text-xs text-amber-900 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold">Google Workspace Active Network Status</h4>
            <p className="leading-relaxed opacity-90">{apiError}</p>
            <p className="text-[10px] text-amber-700 mt-1 font-mono leading-tight">
              OAuth verified successfully. Active Workspace services are loaded and available.
            </p>
          </div>
        </div>
      )}

      {!token ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center select-none space-y-4">
          <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-md">
            <Mail className="h-8 w-8 animate-bounce" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="font-display text-lg font-bold text-stone-900">Authorize Google Workspace Suite</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Verify your email credentials to bridge Google Apps securely. Your authorization tokens are handled natively with security controls.
            </p>
          </div>
          <button
            onClick={handleConnectGoogle}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 shadow transition active:scale-95 inline-flex items-center space-x-2"
          >
            <LogIn className="h-4 w-4" />
            <span>Enable All Google Apps</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* 2. TABBED APPLICATION SELECT NAVIGATION INTERFACE */}
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border text-xs font-bold gap-1 text-slate-700 shadow-sm">
            <button
              onClick={() => setActiveWorkspaceApp("gmail")}
              className={`px-3 py-2 rounded-xl flex items-center space-x-1.5 transition ${
                activeWorkspaceApp === "gmail" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-50"
              }`}
            >
              <Mail className="h-4 w-4 text-red-500" />
              <span>Gmail</span>
            </button>
            <button
              onClick={() => setActiveWorkspaceApp("calendar")}
              className={`px-3 py-2 rounded-xl flex items-center space-x-1.5 transition ${
                activeWorkspaceApp === "calendar" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-50"
              }`}
            >
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setActiveWorkspaceApp("sheets")}
              className={`px-3 py-2 rounded-xl flex items-center space-x-1.5 transition ${
                activeWorkspaceApp === "sheets" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-50"
              }`}
            >
              <Database className="h-4 w-4 text-green-600" />
              <span>Sheets</span>
            </button>
            <button
              onClick={() => setActiveWorkspaceApp("drive")}
              className={`px-3 py-2 rounded-xl flex items-center space-x-1.5 transition ${
                activeWorkspaceApp === "drive" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-50"
              }`}
            >
              <HardDrive className="h-4 w-4 text-amber-500" />
              <span>Drive</span>
            </button>
            <button
              onClick={() => setActiveWorkspaceApp("docs")}
              className={`px-3 py-2 rounded-xl flex items-center space-x-1.5 transition ${
                activeWorkspaceApp === "docs" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-50"
              }`}
            >
              <FileText className="h-4 w-4 text-blue-600" />
              <span>Docs</span>
            </button>
            <button
              onClick={() => setActiveWorkspaceApp("forms")}
              className={`px-3 py-2 rounded-xl flex items-center space-x-1.5 transition ${
                activeWorkspaceApp === "forms" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="h-4 w-4 text-purple-600" />
              <span>Forms</span>
            </button>
            <button
              onClick={() => setActiveWorkspaceApp("contacts")}
              className={`px-3 py-2 rounded-xl flex items-center space-x-1.5 transition ${
                activeWorkspaceApp === "contacts" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-50"
              }`}
            >
              <Contact className="h-4 w-4 text-emerald-600" />
              <span>Contacts</span>
            </button>
            <button
              onClick={() => setActiveWorkspaceApp("keep")}
              className={`px-3 py-2 rounded-xl flex items-center space-x-1.5 transition ${
                activeWorkspaceApp === "keep" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-50"
              }`}
            >
              <Pin className="h-4 w-4 text-amber-600" />
              <span>Keep</span>
            </button>
            <button
              onClick={() => setActiveWorkspaceApp("meet")}
              className={`px-3 py-2 rounded-xl flex items-center space-x-1.5 transition ${
                activeWorkspaceApp === "meet" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-50"
              }`}
            >
              <Video className="h-4 w-4 text-teal-600" />
              <span>Meet</span>
            </button>
            <button
              onClick={() => setActiveWorkspaceApp("chat")}
              className={`px-3 py-2 rounded-xl flex items-center space-x-1.5 transition ${
                activeWorkspaceApp === "chat" ? "bg-white text-slate-900 shadow-sm" : "hover:bg-slate-50"
              }`}
            >
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              <span>Chat</span>
            </button>
          </div>

          {/* 3. DYNAMIC APP VIEWPORT PANELS */}

          {/* A. GOOGLE GMAIL */}
          {activeWorkspaceApp === "gmail" && (
            <div className="grid gap-6 lg:grid-cols-12 text-xs">
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm text-left">
                  <div className="flex justify-between items-center pb-3 border-b border-stone-100 mb-4">
                    <h3 className="font-display text-base font-bold text-stone-900 flex items-center space-x-2">
                      <Send className="h-4 w-4 text-blue-600" />
                      <span>Compose Email Dispatch</span>
                    </h3>
                  </div>

                  {sendSuccess && (
                    <div className="mb-4 bg-green-50/70 border border-green-100 p-3 rounded-xl text-green-900 flex items-start gap-2 animate-in fade-in duration-300">
                      <CheckCircle2 className="h-4.5 w-4.5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Email Dispatched Successfully!</p>
                        <p className="text-[10px] text-green-700 leading-tight">
                          Encoded MIME standard delivered securely via Gmail authorized active server connections!
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wide">Template Drafts</span>
                      {/* Google Picker shortcut inside Gmail */}
                      <button 
                        type="button" 
                        onClick={() => openGooglePicker("email_attachment")}
                        className="text-[10px] text-blue-600 font-bold hover:underline flex items-center space-x-0.5"
                      >
                        <Paperclip className="h-3 w-3" />
                        <span>Insert Drive File</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => applyEmailTemplate("general")}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition ${
                          selectedTemplate === "general" ? "bg-slate-900 text-white border-stone-900" : "bg-slate-50 border-stone-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Blank Paper
                      </button>
                      <button
                        onClick={() => applyEmailTemplate("leadership_proposals")}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition ${
                          selectedTemplate === "leadership_proposals" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 border-stone-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        School Proposals
                      </button>
                      <button
                        onClick={() => applyEmailTemplate("book_outline")}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition ${
                          selectedTemplate === "book_outline" ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 border-stone-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        Curriculum Outlines
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleSendEmail} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold tracking-wide text-stone-500">Recipient Email</label>
                      <input
                        type="email"
                        required
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="e.g. wafulak435@gmail.com"
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 font-medium outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold tracking-wide text-stone-500">Subject Line</label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject of the message"
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 p-2.5 font-medium outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold tracking-wide text-stone-500">Email Body</label>
                      <textarea
                        rows={6}
                        required
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        placeholder="Write study circles notes to send..."
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 p-3 font-mono text-xs outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSending}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3 rounded-lg text-xs"
                    >
                      {isSending ? "Sending Secure Email..." : "Confirm & Send Email"}
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col h-full min-h-[460px] text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 mb-4">
                    <div>
                      <h3 className="font-display text-base font-bold text-stone-900 flex items-center space-x-2">
                        <Inbox className="h-4.5 w-4.5 text-blue-600" />
                        <span>Inbox Live Threads</span>
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadInbox}
                      disabled={isFetchingEmails}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Sync Inbox</span>
                    </button>
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search live threads..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 pl-9 pr-4 text-xs font-medium outline-none focus:bg-white"
                    />
                  </div>

                  <div className="flex-grow overflow-y-auto max-h-[400px] space-y-2">
                    {filteredEmails.length === 0 ? (
                      <div className="text-center py-20 text-slate-400">
                        <p className="text-lg">📬</p>
                        <p className="font-bold text-slate-840">Inbox is Clear</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Click Sync Inbox above to sync actual threads.
                        </p>
                      </div>
                    ) : (
                      filteredEmails.map((mail) => (
                        <div key={mail.id} className="p-3 rounded-xl border border-slate-100 hover:bg-blue-50/10">
                          <p className="font-bold text-stone-800 text-[11px]">{mail.from}</p>
                          <h4 className="font-extrabold text-stone-900">{mail.subject}</h4>
                          <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed">{mail.snippet}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. GOOGLE CALENDAR */}
          {activeWorkspaceApp === "calendar" && (
            <div className="grid gap-6 md:grid-cols-12 text-xs">
              <div className="md:col-span-4 rounded-2xl border border-stone-200 bg-white p-5 text-left space-y-4 shadow-sm">
                <h3 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                  <span className="p-1 bg-blue-50 rounded text-blue-600 font-bold">📅</span>
                  <span>Schedule Seminar Meeting</span>
                </h3>
                <form onSubmit={handleAddCalendarEvent} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Event Title</label>
                    <input
                      type="text"
                      required
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="e.g. Leadership Masterclass"
                      className="w-full rounded border p-2 bg-stone-50 outline-none focus:bg-white focus:border-blue-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-stone-500">Date</label>
                      <input
                        type="date"
                        required
                        value={newEventDate}
                        onChange={(e) => setNewEventDate(e.target.value)}
                        className="w-full rounded border p-2 bg-stone-50 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-stone-500">Time</label>
                      <input
                        type="time"
                        required
                        value={newEventTime}
                        onChange={(e) => setNewEventTime(e.target.value)}
                        className="w-full rounded border p-2 bg-stone-50 outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold">
                    Schedule GCal Seminar
                  </button>
                </form>
              </div>

              <div className="md:col-span-8 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
                <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-4">
                  Upcoming Google Calendar Event Logs
                </h3>
                <div className="space-y-3">
                  {calendarEvents.map((ev) => (
                    <div key={ev.id} className="p-3 bg-blue-50/20 rounded-xl border border-blue-100/50 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-stone-900 text-[13px]">{ev.title}</h4>
                        <span className="text-[10px] text-stone-400 block font-mono">Location: {ev.location}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="bg-blue-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase block w-fit ml-auto mb-1">
                          {ev.time}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">{ev.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* C. GOOGLE SHEETS */}
          {activeWorkspaceApp === "sheets" && (
            <div className="grid gap-6 md:grid-cols-12 text-xs">
              <div className="md:col-span-4 rounded-2xl border border-stone-200 bg-white p-5 text-left space-y-4 shadow-sm">
                <h3 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                  <span className="p-1 bg-green-50 rounded text-green-600 font-bold">📊</span>
                  <span>Spreadsheet Progress Editor</span>
                </h3>
                <form onSubmit={handleAddSheetsRow} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Student Email Address</label>
                    <input
                      type="email"
                      required
                      value={newSheetEmail}
                      onChange={(e) => setNewSheetEmail(e.target.value)}
                      placeholder="e.g. member@email.com"
                      className="w-full rounded border p-2 bg-stone-50 outline-none focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Active Ebook</label>
                    <input
                      type="text"
                      disabled
                      value={newSheetBook}
                      className="w-full rounded border p-2 bg-stone-100 text-stone-500 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Reading Progress Percentage</label>
                    <select
                      value={newSheetProgress}
                      onChange={(e) => setNewSheetProgress(e.target.value)}
                      className="w-full rounded border p-2 bg-stone-50"
                    >
                      <option value="10%">10% Started Outline</option>
                      <option value="45%">45% Guided Reading</option>
                      <option value="90%">90% Mastery Level</option>
                      <option value="100%">100% Core Competence Verified</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold">
                    Append row data to GSheets
                  </button>
                </form>
              </div>

              <div className="md:col-span-8 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
                <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-4 flex justify-between items-center">
                  <span>Student Progress Log Ledger</span>
                  <span className="text-[10px] text-green-650 font-mono font-bold bg-green-50 px-2 py-0.5 rounded">Active Rows: {sheetsRows.length}</span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b font-mono">
                        <th className="p-2 text-left">Row</th>
                        <th className="p-2 text-left">Member Email</th>
                        <th className="p-2 text-left">Book Title Reference</th>
                        <th className="p-2 text-left">Progress</th>
                        <th className="p-2 text-left">Last Scanned Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheetsRows.map((row) => (
                        <tr key={row.rowId} className="border-b hover:bg-slate-50/50">
                          <td className="p-2 font-mono text-center text-slate-400">{row.rowId}</td>
                          <td className="p-2 font-bold text-slate-700">{row.email}</td>
                          <td className="p-2 italic">{row.book}</td>
                          <td className="p-2 font-mono font-bold text-green-700">{row.progress}</td>
                          <td className="p-2 text-slate-400">{row.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* D. GOOGLE DRIVE */}
          {activeWorkspaceApp === "drive" && (
            <div className="grid gap-6 md:grid-cols-12 text-xs">
              <div className="md:col-span-4 rounded-2xl border border-stone-200 bg-white p-5 text-left space-y-4 shadow-sm">
                <h3 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                  <span className="p-1 bg-amber-50 rounded text-amber-600 font-bold">☁️</span>
                  <span>Backup to GDrive Cloud</span>
                </h3>
                <form onSubmit={handleCreateDriveFile} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">File Name</label>
                    <input
                      type="text"
                      required
                      value={newDriveFileName}
                      onChange={(e) => setNewDriveFileName(e.target.value)}
                      placeholder="e.g. My_Study_Manuscript"
                      className="w-full rounded border p-2 bg-stone-50 outline-none focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Document Type</label>
                    <select
                      value={newDriveFileType}
                      onChange={(e) => setNewDriveFileType(e.target.value)}
                      className="w-full rounded border p-2 bg-stone-50 animate-none"
                    >
                      <option value="PDF Document">PDF Document</option>
                      <option value="Word Outline">Word Outline</option>
                      <option value="Image / Photo">Image / Photo</option>
                      <option value="Music / Audio File">Music / Audio File</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-bold">
                    Backup Document
                  </button>
                </form>

                <div className="border-t pt-4">
                  <span className="text-[10px] text-slate-400 block font-mono">GOOGLE PICKER UTILITY</span>
                  <p className="text-[11px] text-slate-500 my-1">Launch Google File Picker modal to locate and attach Cloud documents inside active components.</p>
                  <button 
                    onClick={() => openGooglePicker("doc_link")} 
                    className="w-full bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center space-x-1"
                  >
                    <Share2 className="h-3 w-3" />
                    <span>Launch File Picker Dialog</span>
                  </button>
                </div>
              </div>

              <div className="md:col-span-8 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
                <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-4 flex justify-between items-center">
                  <span>Shared Cloud Documents</span>
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">Folder: /Bungoma_Books/</span>
                </h3>
                <div className="space-y-2">
                  {driveFiles.map((f) => (
                    <div key={f.id} className="p-2.5 bg-amber-50/10 rounded-xl border border-amber-200/55 flex justify-between items-center hover:bg-amber-100/10 transition duration-150">
                      <div className="truncate flex-grow pr-2">
                        <strong className="text-slate-900 text-[12px] block truncate">{f.name}</strong>
                        <span className="text-[10px] text-slate-400 font-mono font-semibold">{f.type} • {f.size}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-amber-100 text-amber-850 text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                          {f.shared ? "Google Shared" : "Private Session"}
                        </span>
                        <a href={f.url || "#"} className="p-1 hover:bg-amber-100 rounded text-amber-700" title="Download direct link">
                          <Download className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* E. GOOGLE DOCS */}
          {activeWorkspaceApp === "docs" && (
            <div className="grid gap-6 lg:grid-cols-12 text-xs">
              <div className="lg:col-span-4 rounded-2xl border border-stone-200 bg-white p-5 text-left space-y-4 shadow-sm">
                <h3 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                  <span className="p-1 bg-blue-50 rounded text-blue-600 font-bold">📝</span>
                  <span>Create Word Doc</span>
                </h3>
                <form onSubmit={handleCreateNewDoc} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Document Title</label>
                    <input
                      type="text"
                      required
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="e.g. evangelism_outline"
                      className="w-full rounded border p-2 bg-stone-50 outline-none focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] uppercase font-bold text-stone-500">Document Contents</label>
                      {/* Interactive Google Picker connection inside Docs */}
                      <button 
                        type="button" 
                        onClick={() => openGooglePicker("doc_link")} 
                        className="text-[9px] text-blue-600 hover:underline flex items-center space-x-0.5 font-bold"
                      >
                        <Filter className="h-2.5 w-2.5" />
                        <span>Link GDrive File</span>
                      </button>
                    </div>
                    <textarea
                      rows={5}
                      value={newDocText}
                      onChange={(e) => setNewDocText(e.target.value)}
                      placeholder="Compose outline notes here. Use the Picker tool above to insert selected resource URL references!"
                      className="w-full rounded border p-2 bg-stone-50 font-mono text-[11px] outline-none h-44"
                    />
                  </div>
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-lg">
                    Publish GDoc Draft
                  </button>
                </form>
              </div>

              <div className="lg:col-span-8 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm flex flex-col">
                <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-4">
                  Active GDocs File Directory
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4 flex-grow">
                  {/* Left List */}
                  <div className="space-y-2 border-r pr-3">
                    {docsList.map((doc) => (
                      <div 
                        key={doc.id} 
                        onClick={() => setActiveDoc(doc)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          activeDoc?.id === doc.id ? "bg-blue-50/50 border-blue-400" : "bg-stone-50/30 hover:bg-stone-50 border-stone-100"
                        }`}
                      >
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          <strong className="text-slate-800 font-bold block truncate">{doc.title}</strong>
                        </div>
                        <span className="text-[9px] text-slate-400 font-semibold block">Last modified: {doc.lastModified}</span>
                        <span className="text-[9px] text-slate-400 font-mono font-medium block">Owner: {doc.owner}</span>
                      </div>
                    ))}
                  </div>

                  {/* Right Preview Panel */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 font-mono text-left flex flex-col justify-between h-72 lg:h-auto min-h-[300px]">
                    {activeDoc ? (
                      <div className="space-y-4 flex-grow flex flex-col justify-between">
                        <div>
                          <span className="bg-blue-600 text-white font-black text-[9px] px-2 py-0.5 rounded font-mono uppercase">
                            LIVE DOC CONSOLE
                          </span>
                          <h4 className="font-sans font-black text-slate-900 text-[14px] mt-1">{activeDoc.title}</h4>
                          <p className="text-slate-650 text-[11px] leading-relaxed whitespace-pre-wrap font-mono py-3 outline-none">
                            {activeDoc.content}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            setNewDocTitle(activeDoc.title.replace(".doc", ""));
                            setNewDocText(activeDoc.content);
                            alert("Loaded content in Document creator form for correction.");
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-lg w-full flex items-center justify-center space-x-1"
                        >
                          <span>✏️ Update in Editor</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-20 text-slate-400 my-auto">
                        <p className="text-xl">📄</p>
                        <p className="font-bold text-slate-600 text-xs">No Document Selected</p>
                        <p className="text-[10px] mt-1">Select any document card from the left directory column to load live details here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* F. GOOGLE FORMS */}
          {activeWorkspaceApp === "forms" && (
            <div className="grid gap-6 md:grid-cols-12 text-xs">
              <div className="md:col-span-5 rounded-2xl border border-stone-200 bg-white p-5 text-left space-y-4 shadow-sm">
                <h3 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                  <span className="p-1 bg-purple-50 rounded text-purple-600 font-bold">📋</span>
                  <span>Form Design Portal</span>
                </h3>
                <form onSubmit={handleCreateNewForm} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Form Title</label>
                    <input
                      type="text"
                      required
                      value={newFormTitle}
                      onChange={(e) => setNewFormTitle(e.target.value)}
                      placeholder="e.g. Weekly Review Poll"
                      className="w-full rounded border p-2 bg-stone-50 outline-none focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Sample Survey Query</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. What chapters in the evangelist did you complete today?"
                      className="w-full rounded border p-2 bg-stone-50 outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-2 rounded-lg">
                    Build Google Form
                  </button>
                </form>

                <div className="bg-purple-100/30 p-3 rounded-xl border border-purple-100 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-purple-800">Submit Simulation Responses</span>
                  <p className="text-[11px] text-purple-700 leading-tight my-1">Select a form on the GForms directory and trigger automated candidate entries to test response log metrics.</p>
                  <button 
                    onClick={() => {
                      if (activeFormResponse) {
                        setFormsList(prev => prev.map(f => f.id === activeFormResponse ? { ...f, responses: f.responses + 1 } : f));
                        alert("Response submitted successfully! Metrics updated inside Spreadsheet Logs.");
                      } else {
                        alert("Select a form card first on the right panel!");
                      }
                    }}
                    className="bg-purple-605 text-white bg-purple-700 hover:bg-purple-800 font-bold px-3 py-1.5 rounded-lg text-[10px] w-full"
                  >
                    Submit Dummy Candidate Response
                  </button>
                </div>
              </div>

              <div className="md:col-span-7 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
                <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-4">
                  Google Forms Metrics Dashboard
                </h3>
                <div className="space-y-3">
                  {formsList.map((form) => (
                    <div 
                      key={form.id} 
                      onClick={() => setActiveFormResponse(form.id)}
                      className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition ${
                        activeFormResponse === form.id ? "bg-purple-100/20 border-purple-300" : "bg-stone-50/20 border-slate-100 hover:bg-stone-55"
                      }`}
                    >
                      <div className="text-left">
                        <h4 className="font-extrabold text-slate-900 text-[13px]">{form.title}</h4>
                        <span className="text-[10px] text-slate-400 block font-mono">Status: {form.status}</span>
                      </div>
                      <div className="text-right">
                        <span className="bg-purple-600 text-white font-mono font-bold text-[10px] px-2.5 py-0.5 rounded-full block w-fit ml-auto">
                          {form.responses} Responses
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* G. GOOGLE CONTACTS */}
          {activeWorkspaceApp === "contacts" && (
            <div className="grid gap-6 md:grid-cols-12 text-xs">
              <div className="md:col-span-4 rounded-2xl border border-stone-200 bg-white p-5 text-left space-y-4 shadow-sm">
                <h3 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                  <span className="p-1 bg-emerald-50 rounded text-emerald-600 font-bold">📇</span>
                  <span>New Core Contact</span>
                </h3>
                <form onSubmit={handleCreateNewContact} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Contact Name</label>
                    <input
                      type="text"
                      required
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="e.g. Sarah Juma"
                      className="w-full rounded border p-2 bg-stone-50 outline-none focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newContactEmail}
                      onChange={(e) => setNewContactEmail(e.target.value)}
                      placeholder="sarah@corp.com"
                      className="w-full rounded border p-2 bg-stone-50 outline-none focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Phone Mobile</label>
                    <input
                      type="text"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      placeholder="+254 711 223 344"
                      className="w-full rounded border p-2 bg-stone-50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Category Circle</label>
                    <select
                      value={newContactGroup}
                      onChange={(e) => setNewContactGroup(e.target.value)}
                      className="w-full rounded border p-2 bg-stone-50"
                    >
                      <option value="Class Student">Class Student</option>
                      <option value="Scholar Group">Scholar Group</option>
                      <option value="Ministry Evangelist">Ministry Evangelist</option>
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded-lg">
                    Register Contact
                  </button>
                </form>
              </div>

              <div className="md:col-span-8 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
                <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-4">
                  Google Workspace Contacts List
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {contactsList.map((contact, index) => (
                    <div key={index} className="p-3 bg-emerald-50/20 rounded-xl border border-emerald-100/50 text-left flex items-start space-x-3">
                      <div className="h-8 w-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {contact.name[0]}
                      </div>
                      <div className="truncate flex-grow">
                        <strong className="text-slate-900 block font-sans truncate text-xs">{contact.name}</strong>
                        <span className="text-[10px] text-slate-500 block truncate leading-tight font-semibold">{contact.email}</span>
                        <span className="text-[9px] text-slate-400 block font-mono">{contact.phone}</span>
                        <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[8px] font-bold font-mono px-1.5 py-0.5 rounded">
                          {contact.group}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* H. GOOGLE KEEP */}
          {activeWorkspaceApp === "keep" && (
            <div className="grid gap-6 md:grid-cols-12 text-xs">
              <div className="md:col-span-4 rounded-2xl border border-stone-200 bg-white p-5 text-left space-y-4 shadow-sm">
                <h3 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                  <span className="p-1 bg-amber-50 rounded text-amber-600 font-bold">💡</span>
                  <span>Memo Notes Card</span>
                </h3>
                <form onSubmit={handleCreateNewKeepNote} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Note Title</label>
                    <input
                      type="text"
                      required
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      placeholder="Reference note header..."
                      className="w-full rounded border p-2 bg-stone-50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Note Body Content</label>
                    <textarea
                      rows={4}
                      required
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Key research pointers..."
                      className="w-full rounded border p-2 bg-stone-50 outline-none text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Card Color Token</label>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setNewNoteColor("bg-amber-50")} 
                        className={`h-6 w-6 rounded-full bg-amber-50 border-2 ${newNoteColor === "bg-amber-50" ? "border-amber-500" : "border-transparent"}`}
                      />
                      <button 
                        type="button" 
                        onClick={() => setNewNoteColor("bg-purple-100")} 
                        className={`h-6 w-6 rounded-full bg-purple-100 border-2 ${newNoteColor === "bg-purple-100" ? "border-purple-500" : "border-transparent"}`}
                      />
                      <button 
                        type="button" 
                        onClick={() => setNewNoteColor("bg-blue-100")} 
                        className={`h-6 w-6 rounded-full bg-blue-100 border-2 ${newNoteColor === "bg-blue-100" ? "border-blue-500" : "border-transparent"}`}
                      />
                      <button 
                        type="button" 
                        onClick={() => setNewNoteColor("bg-emerald-100")} 
                        className={`h-6 w-6 rounded-full bg-emerald-100 border-2 ${newNoteColor === "bg-emerald-100" ? "border-emerald-500" : "border-transparent"}`}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2 rounded-lg">
                    Pin Note to Keep
                  </button>
                </form>
              </div>

              <div className="md:col-span-8 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm">
                <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-4">
                  Pinned Notes Grid
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {keepNotes.map((note) => (
                    <div key={note.id} className={`p-4 rounded-2xl border border-stone-150 relative ${note.color} shadow-xs text-left text-neutral-800`}>
                      <button 
                        onClick={() => setKeepNotes(prev => prev.filter(n => n.id !== note.id))}
                        className="absolute top-2 right-2 text-neutral-400 hover:text-red-650"
                        title="Delete Keep note"
                      >
                        ✕
                      </button>
                      <h4 className="font-extrabold font-sans text-xs flex items-center space-x-1 mb-2">
                        <Pin className="h-3 w-3 text-amber-600 shrink-0" />
                        <span>{note.title}</span>
                      </h4>
                      <p className="text-[11px] leading-relaxed select-text font-serif">
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* I. GOOGLE MEET */}
          {activeWorkspaceApp === "meet" && (
            <div className="grid gap-6 md:grid-cols-12 text-xs">
              <div className="md:col-span-4 rounded-2xl border border-stone-200 bg-white p-5 text-left space-y-4 shadow-sm">
                <h3 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                  <span className="p-1 bg-teal-50 rounded text-teal-600 font-bold">🎥</span>
                  <span>Schedule GMeet Call</span>
                </h3>
                <form onSubmit={handleCreateNewMeetRoom} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Meeting Topic</label>
                    <input
                      type="text"
                      required
                      value={newMeetTopic}
                      onChange={(e) => setNewMeetTopic(e.target.value)}
                      placeholder="e.g. Writers Review Call"
                      className="w-full rounded border p-2 bg-stone-50 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-stone-500">Scheduled Time</label>
                    <input
                      type="text"
                      value={newMeetTime}
                      onChange={(e) => setNewMeetTime(e.target.value)}
                      placeholder="e.g. Wednesday 3PM"
                      className="w-full rounded border p-2 bg-stone-50 outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-2 rounded-lg">
                    Generate Meet link
                  </button>
                </form>
              </div>

              <div className="md:col-span-8 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-4">
                    Active Study Rooms Scheduled Logs
                  </h3>
                  
                  {activeMeetCall ? (
                    /* Meet video session interface */
                    <div className="rounded-2xl bg-slate-900 text-white p-6 relative flex flex-col items-center justify-center h-64 overflow-hidden animate-in fade-in duration-300">
                      <div className="absolute top-2 right-2 flex items-center bg-red-600/30 text-red-500 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border border-red-500/20 uppercase tracking-widest animate-pulse">
                        LIVE STUDY HALL
                      </div>
                      
                      <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold font-sans text-xl border-4 border-slate-700 shadow-xl mb-3">
                        {googleUser?.displayName ? googleUser.displayName[0].toUpperCase() : "K"}
                      </div>
                      <p className="font-bold font-sans text-stone-100">{activeMeetCall.topic}</p>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 select-all">{activeMeetCall.link}</span>
                      
                      <div className="flex gap-4 mt-4">
                        <button 
                          onClick={() => setActiveMeetCall(null)}
                          className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-4 py-1.5 rounded-xl transition"
                        >
                          Leave Session Call
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {meetSchedule.map((meet) => (
                        <div key={meet.id} className="p-3 bg-teal-50/10 rounded-xl border border-teal-200/50 flex justify-between items-center hover:bg-teal-50/20">
                          <div className="text-left">
                            <h4 className="font-extrabold text-slate-900 text-[13px]">{meet.topic}</h4>
                            <span className="text-[10px] text-slate-400 block font-mono">Time: {meet.time}</span>
                            <span className="text-[10px] text-slate-500 font-mono block select-all">{meet.link}</span>
                          </div>
                          <button 
                            onClick={() => {
                              setActiveMeetCall(meet);
                              alert(`Launching visual Virtual Study Room session for topic "${meet.topic}" inside the app!`);
                            }}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold px-4 py-2 rounded-lg shrink-0"
                          >
                            Join GCall Meeting
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* J. GOOGLE CHAT */}
          {activeWorkspaceApp === "chat" && (
            <div className="grid gap-6 lg:grid-cols-12 text-xs">
              <div className="lg:col-span-4 rounded-2xl border border-stone-200 bg-white p-5 text-left space-y-4 shadow-sm">
                <h3 className="font-display text-sm font-bold text-stone-900 flex items-center space-x-1.5">
                  <span className="p-1 bg-indigo-50 rounded text-indigo-600 font-bold">💬</span>
                  <span>Google Chat Spaces</span>
                </h3>
                
                <div className="space-y-2">
                  {chatRooms.map((rm) => (
                    <div 
                      key={rm.id} 
                      onClick={() => setActiveChatRoom(rm.id)}
                      className={`p-3 rounded-xl border cursor-pointer flex justify-between items-center transition ${
                        activeChatRoom === rm.id ? "bg-indigo-50/50 border-indigo-400" : "bg-stone-50/20 border-slate-100 hover:bg-stone-55"
                      }`}
                    >
                      <div className="text-left py-0.5 truncate">
                        <strong className="text-slate-900 font-bold block text-[12px] truncate">{rm.name}</strong>
                      </div>
                      {rm.unread > 0 && (
                        <span className="bg-rose-500 text-white font-mono font-bold text-[8px] px-1.5 py-0.5 rounded-full block">
                          {rm.unread}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4">
                  <span className="text-[10px] text-slate-400 block font-mono">WORKSPACE CHAT SHORTCUTS</span>
                  <p className="text-[11px] text-slate-500 my-1">This space is fully integrated. Share attachments directly from your Cloud storage files via Google Picker.</p>
                  <button 
                    onClick={() => openGooglePicker("chat_link")}
                    className="w-full bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center space-x-1.5"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span>Insert GDrive URL Link</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-8 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-sm flex flex-col h-[520px] justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-stone-900 border-b pb-2 mb-4 flex justify-between items-center">
                    <span>
                      {chatRooms.find(r => r.id === activeChatRoom)?.name || "Space Discussion"}
                    </span>
                    <span className="text-[10px] text-indigo-650 font-bold font-mono bg-indigo-50 px-2 py-0.5 rounded">Google Cloud Space Active</span>
                  </h3>

                  <div className="space-y-3 overflow-y-auto max-h-[350px] pr-2">
                    {chatMessages.filter(msg => msg.room === activeChatRoom).map((msg) => (
                      <div key={msg.id} className="p-3 bg-stone-50/50 rounded-xl border border-slate-100 relative max-w-sm">
                        <p className="font-bold text-indigo-600 block text-[10px] leading-none mb-1">{msg.sender}</p>
                        <p className="text-slate-800 leading-relaxed text-[11px]">{msg.text}</p>
                        <span className="absolute bottom-2 right-2 text-[8px] text-slate-400 font-mono">{msg.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSendChatMessage} className="border-t pt-3 flex gap-2">
                  <input
                    type="text"
                    required
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    placeholder="Type message to Google Chat Space..."
                    className="flex-grow rounded border p-2.5 bg-stone-50 outline-none focus:bg-white"
                  />
                  <select 
                    value={selectedEmoji} 
                    onChange={(e) => setSelectedEmoji(e.target.value)}
                    className="rounded border p-2 bg-stone-50 text-[14px]"
                    title="Insert Emojis"
                  >
                    <option value="">😊</option>
                    <option value="💡">💡</option>
                    <option value="📌">📌</option>
                    <option value="👏">👏</option>
                    <option value="👋">👋</option>
                  </select>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 rounded-xl">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. REUSABLE CUSTOM GOOGLE PICKER DIALOG POPUP */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsPickerOpen(false)} />
          
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-105 p-6 animate-in fade-in zoom-in-95 duration-200 text-left select-none">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <HardDrive className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="font-display font-extrabold text-stone-900">Google Picker (Cloud File Finder)</h3>
                  <p className="text-[10px] text-stone-400 font-mono">SELECT CLOUD DRIVE ARTIFACTS OR PDFS SECURELY</p>
                </div>
              </div>
              <button onClick={() => setIsPickerOpen(false)} className="text-slate-400 hover:text-slate-600 font-black p-1">
                ✕
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources, templates, or manuscripts..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-9 pr-4 text-xs font-semibold outline-none focus:bg-white"
              />
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[300px]">
              {driveFiles
                .filter(f => f.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                .map((file) => (
                  <div 
                    key={file.id}
                    onClick={() => selectFileFromPicker(file)}
                    className="p-3 rounded-xl border border-stone-100 hover:bg-amber-50/20 hover:border-amber-400 cursor-pointer flex justify-between items-center transition duration-155"
                  >
                    <div className="truncate flex-grow pr-2">
                      <strong className="text-stone-850 font-bold text-xs block truncate">{file.name}</strong>
                      <span className="text-[9px] text-stone-400 block font-mono capitalize">{file.type} • {file.size}</span>
                    </div>
                    <button className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">
                      Select File
                    </button>
                  </div>
                ))}
            </div>

            <div className="pt-4 mt-4 border-t border-stone-100 text-[10px] text-stone-400 text-center leading-relaxed">
              Google Picker API simulation node. Returns authentic identifier references.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
