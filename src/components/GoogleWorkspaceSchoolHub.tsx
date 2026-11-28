import React, { useEffect, useState } from "react";
import {
  GraduationCap,
  Video,
  Calendar,
  FolderOpen,
  FileText,
  ClipboardList,
  Mail,
  Users,
  MessageSquare,
  RefreshCw,
  Plus,
  ExternalLink,
  Copy,
  Check,
  LogIn,
  LogOut,
  AlertCircle,
  Send,
  BookOpen,
} from "lucide-react";
import {
  googleSignIn,
  googleLogout,
  getAccessToken,
  listGmailMessages,
  sendGmailMessage,
  auth,
} from "../lib/firebase";
import {
  listClassroomCourses,
  createClassroomCourse,
  listCourseAnnouncements,
  createCourseAnnouncement,
  listCourseWork,
  createCourseWork,
  listCourseMaterials,
  listCourseRoster,
  createMeetSpace,
  listCalendarEvents,
  createCalendarEvent,
  listDriveFiles,
  createDriveGoogleDoc,
  createGoogleForm,
  listGoogleContacts,
  listGoogleChatSpaces,
  type ClassroomCourse,
  type ClassroomAnnouncement,
  type ClassroomCourseWork,
  type ClassroomMaterial,
  type ClassroomRosterMember,
  type MeetSpace,
  type WorkspaceCalendarEvent,
  type WorkspaceDriveFile,
  type WorkspaceContact,
} from "../lib/workspaceApi";

interface GoogleWorkspaceSchoolHubProps {
  mode?: "school" | "full";
  schoolName?: string;
}

type WorkspaceTab =
  | "classroom"
  | "meet"
  | "calendar"
  | "drive"
  | "forms"
  | "gmail"
  | "contacts"
  | "chat";

export default function GoogleWorkspaceSchoolHub({
  mode = "school",
  schoolName = "Zion Digital Leadership & Bible School",
}: GoogleWorkspaceSchoolHubProps) {
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [googleUser, setGoogleUser] = useState<{
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null>(() => {
    const u = auth.currentUser;
    if (!u || !getAccessToken()) return null;
    return { email: u.email, displayName: u.displayName, photoURL: u.photoURL };
  });

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("classroom");
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  // Classroom state
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [announcements, setAnnouncements] = useState<ClassroomAnnouncement[]>([]);
  const [courseWork, setCourseWork] = useState<ClassroomCourseWork[]>([]);
  const [materials, setMaterials] = useState<ClassroomMaterial[]>([]);
  const [roster, setRoster] = useState<ClassroomRosterMember[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [isLoadingCourseDetail, setIsLoadingCourseDetail] = useState(false);

  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseSection, setNewCourseSection] = useState("");
  const [newAnnouncementText, setNewAnnouncementText] = useState("");
  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
  const [newAssignmentDesc, setNewAssignmentDesc] = useState("");

  // Google Meet state
  const [createdMeets, setCreatedMeets] = useState<Array<MeetSpace & { topic: string; createdAt: string }>>([]);
  const [meetTopic, setMeetTopic] = useState("");
  const [isCreatingMeet, setIsCreatingMeet] = useState(false);
  const [copiedMeetUri, setCopiedMeetUri] = useState<string | null>(null);

  // Google Calendar state
  const [calendarEvents, setCalendarEvents] = useState<WorkspaceCalendarEvent[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [calTitle, setCalTitle] = useState("");
  const [calDate, setCalDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [calTime, setCalTime] = useState("10:00");
  const [calAttachMeet, setCalAttachMeet] = useState(true);

  // Google Drive & Docs state
  const [driveFiles, setDriveFiles] = useState<WorkspaceDriveFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docBody, setDocBody] = useState("");
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  // Google Forms state
  const [formTitle, setFormTitle] = useState("");
  const [createdForms, setCreatedForms] = useState<Array<{ formId: string; title: string; responderUri?: string }>>([]);
  const [isCreatingForm, setIsCreatingForm] = useState(false);

  // Gmail state
  const [emails, setEmails] = useState<any[]>([]);
  const [isLoadingMail, setIsLoadingMail] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [isSendingMail, setIsSendingMail] = useState(false);

  // Contacts & Chat state (full mode)
  const [contacts, setContacts] = useState<WorkspaceContact[]>([]);
  const [chatSpaces, setChatSpaces] = useState<Array<{ name: string; displayName?: string; spaceType?: string }>>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);

  // Confirmation modal state for mutating/destructive operations
  const [pendingConfirm, setPendingConfirm] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    action: () => Promise<void>;
  } | null>(null);
  const [isExecutingConfirm, setIsExecutingConfirm] = useState(false);

  const requestConfirmation = (
    title: string,
    message: string,
    confirmLabel: string,
    action: () => Promise<void>
  ) => {
    setPendingConfirm({ title, message, confirmLabel, action });
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm) return;
    setIsExecutingConfirm(true);
    setStatusError(null);
    try {
      await pendingConfirm.action();
      setPendingConfirm(null);
    } catch (err: any) {
      setStatusError(err?.message || "Google Workspace operation failed.");
      setPendingConfirm(null);
    } finally {
      setIsExecutingConfirm(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatusError(null);
    setStatusSuccess(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setToken(res.accessToken);
        setGoogleUser({
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL,
        });
        setStatusSuccess("Google Workspace connected. Loading your live courses and schedule.");
      }
    } catch (err: any) {
      setStatusError(err?.message || "Could not sign in with Google.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await googleLogout();
    setToken(null);
    setGoogleUser(null);
    setCourses([]);
    setCalendarEvents([]);
    setDriveFiles([]);
    setEmails([]);
    setContacts([]);
    setChatSpaces([]);
    setStatusSuccess(null);
  };

  const loadClassroomData = async (activeToken: string) => {
    setIsLoadingCourses(true);
    setStatusError(null);
    try {
      const list = await listClassroomCourses(activeToken);
      setCourses(list);
      if (list.length > 0 && !list.some((c) => c.id === selectedCourseId)) {
        setSelectedCourseId(list[0].id);
      }
    } catch (err: any) {
      setStatusError(err?.message || "Unable to fetch Google Classroom courses.");
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const loadSelectedCourseDetail = async (activeToken: string, courseId: string) => {
    if (!courseId) return;
    setIsLoadingCourseDetail(true);
    try {
      const [anns, works, mats, memb] = await Promise.all([
        listCourseAnnouncements(activeToken, courseId).catch(() => []),
        listCourseWork(activeToken, courseId).catch(() => []),
        listCourseMaterials(activeToken, courseId).catch(() => []),
        listCourseRoster(activeToken, courseId).catch(() => []),
      ]);
      setAnnouncements(anns);
      setCourseWork(works);
      setMaterials(mats);
      setRoster(memb);
    } finally {
      setIsLoadingCourseDetail(false);
    }
  };

  const loadCalendarData = async (activeToken: string) => {
    setIsLoadingCalendar(true);
    setStatusError(null);
    try {
      const evts = await listCalendarEvents(activeToken, 15);
      setCalendarEvents(evts);
    } catch (err: any) {
      setStatusError(err?.message || "Unable to fetch Google Calendar events.");
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  const loadDriveData = async (activeToken: string) => {
    setIsLoadingDrive(true);
    setStatusError(null);
    try {
      const files = await listDriveFiles(activeToken);
      setDriveFiles(files);
    } catch (err: any) {
      setStatusError(err?.message || "Unable to list Google Drive files.");
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const loadGmailData = async (activeToken: string) => {
    if (!activeToken) return;
    setIsLoadingMail(true);
    setStatusError(null);
    try {
      const msgs = await listGmailMessages(12);
      setEmails(msgs);
    } catch (err: any) {
      setStatusError(err?.message || "Unable to load Gmail messages.");
    } finally {
      setIsLoadingMail(false);
    }
  };

  const loadContactsAndChat = async (activeToken: string) => {
    setIsLoadingDirectory(true);
    try {
      const [cList, sList] = await Promise.all([
        listGoogleContacts(activeToken).catch(() => []),
        listGoogleChatSpaces(activeToken).catch(() => []),
      ]);
      setContacts(cList);
      setChatSpaces(sList);
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (activeTab === "classroom") void loadClassroomData(token);
    if (activeTab === "calendar") void loadCalendarData(token);
    if (activeTab === "drive") void loadDriveData(token);
    if (activeTab === "gmail") void loadGmailData(token);
    if (activeTab === "contacts" || activeTab === "chat") void loadContactsAndChat(token);
  }, [token, activeTab]);

  useEffect(() => {
    if (token && selectedCourseId && activeTab === "classroom") {
      void loadSelectedCourseDetail(token, selectedCourseId);
    }
  }, [token, selectedCourseId, activeTab]);

  const handleCopyLink = (uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedMeetUri(uri);
    setTimeout(() => setCopiedMeetUri(null), 2000);
  };

  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "classroom", label: "Google Classroom", icon: GraduationCap },
    { id: "meet", label: "Google Meet", icon: Video },
    { id: "calendar", label: "Class Calendar", icon: Calendar },
    { id: "drive", label: "Drive & Docs", icon: FolderOpen },
    { id: "forms", label: "Forms & Quizzes", icon: ClipboardList },
    { id: "gmail", label: "School Gmail", icon: Mail },
    ...(mode === "full"
      ? [
          { id: "contacts" as WorkspaceTab, label: "Contacts", icon: Users },
          { id: "chat" as WorkspaceTab, label: "Chat Spaces", icon: MessageSquare },
        ]
      : []),
  ];

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#0B254D] text-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#F5B82E] font-bold">
            Google Workspace for Education
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
            {schoolName} — Connected Classroom &amp; Meet
          </h2>
          <p className="text-xs text-blue-100/85 max-w-2xl">
            Manage live Google Classroom courses, launch Google Meet video lessons, sync seminar calendars, share Drive and Docs study guides, and collect assessments with Google Forms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {token && googleUser ? (
            <div className="flex items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2">
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate max-w-[160px]">
                  {googleUser.displayName || "Connected Account"}
                </p>
                <p className="text-[11px] text-blue-200 truncate max-w-[160px]">
                  {googleUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="inline-flex items-center gap-1 rounded-lg bg-white/15 hover:bg-white/25 px-2.5 py-1.5 text-[11px] font-semibold text-white transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] px-4 py-2.5 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isConnecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              <span>{isConnecting ? "Connecting..." : "Sign in with Google"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alerts */}
      {statusError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 px-4 py-3 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {statusError}
          </span>
          <button type="button" onClick={() => setStatusError(null)} className="font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {statusSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
          <span className="font-medium">{statusSuccess}</span>
          <button type="button" onClick={() => setStatusSuccess(null)} className="font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Unauthenticated Gate */}
      {!token ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-5 shadow-xs">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[#EFF6FF] dark:bg-blue-950/60 text-[#155EEF] flex items-center justify-center">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            <h3 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
              Connect Your Google Account to Use School Workspace Tools
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Sign in with Google to view your live Google Classroom courses, launch Google Meet learning rooms, check upcoming Calendar lectures, open Drive and Docs materials, create Forms assessments, and send school Gmail messages.
            </p>
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white px-6 py-3 text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{isConnecting ? "Connecting Google Account..." : "Sign in with Google"}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Workspace Feature Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? "bg-[#155EEF] text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#155EEF]"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 1. GOOGLE CLASSROOM */}
          {activeTab === "classroom" && (
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Left Column: Courses & Create Course */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                      Active Classroom Courses ({courses.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => loadClassroomData(token)}
                      className="text-xs font-semibold text-[#155EEF] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingCourses ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {isLoadingCourses ? (
                    <p className="text-xs text-slate-500 py-4">Loading Google Classroom courses...</p>
                  ) : courses.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 text-xs text-slate-600 dark:text-slate-300">
                      No active Google Classroom courses found on this account yet. Create a course below to start.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {courses.map((crs) => (
                        <button
                          key={crs.id}
                          type="button"
                          onClick={() => setSelectedCourseId(crs.id)}
                          className={`w-full text-left rounded-xl border p-3 transition cursor-pointer ${
                            selectedCourseId === crs.id
                              ? "border-[#155EEF] bg-[#EFF6FF] dark:bg-blue-950/40"
                              : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <p className="text-xs font-bold text-[#0B254D] dark:text-white truncate">{crs.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {crs.section || "Main Section"} {crs.enrollmentCode ? `· Code: ${crs.enrollmentCode}` : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Create Course Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newCourseName.trim()) return;
                    requestConfirmation(
                      "Create Google Classroom Course",
                      `Create a new Google Classroom course named "${newCourseName.trim()}" in your connected Google Workspace account?`,
                      "Create Course",
                      async () => {
                        const created = await createClassroomCourse(token, {
                          name: newCourseName.trim(),
                          section: newCourseSection.trim() || "Zion School Cohort",
                        });
                        setCourses((prev) => [created, ...prev]);
                        setSelectedCourseId(created.id);
                        setNewCourseName("");
                        setNewCourseSection("");
                        setStatusSuccess(`Created Google Classroom course "${created.name}".`);
                      }
                    );
                  }}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                >
                  <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                    Create New Classroom Course
                  </h4>
                  <input
                    type="text"
                    required
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="Course title (e.g. Biblical Leadership 101)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
                  />
                  <input
                    type="text"
                    value={newCourseSection}
                    onChange={(e) => setNewCourseSection(e.target.value)}
                    placeholder="Section or Term (e.g. Term 1 - 2026)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
                  />
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white py-2.5 text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Course in Google Classroom</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Selected Course Stream, Coursework, Materials & Roster */}
              <div className="lg:col-span-8 space-y-5">
                {selectedCourse ? (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div>
                        <p className="text-[11px] font-mono uppercase font-bold text-[#155EEF]">
                          Course Workspace {selectedCourse.enrollmentCode ? `· Join Code: ${selectedCourse.enrollmentCode}` : ""}
                        </p>
                        <h3 className="font-display text-lg font-bold text-[#0B254D] dark:text-white mt-0.5">
                          {selectedCourse.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {selectedCourse.section || "Active Cohort"} {selectedCourse.room ? `· ${selectedCourse.room}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedCourse.alternateLink && (
                          <a
                            href={selectedCourse.alternateLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-[#0B254D] dark:text-white hover:border-[#155EEF] transition"
                          >
                            <span>Open in Google Classroom</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            requestConfirmation(
                              "Start Live Google Meet for Class",
                              `Create a live Google Meet conference link for "${selectedCourse.name}"?`,
                              "Create Meet Room",
                              async () => {
                                const space = await createMeetSpace(token);
                                setCreatedMeets((prev) => [
                                  {
                                    ...space,
                                    topic: selectedCourse.name,
                                    createdAt: new Date().toLocaleTimeString(),
                                  },
                                  ...prev,
                                ]);
                                setActiveTab("meet");
                                setStatusSuccess(`Live Google Meet room created for ${selectedCourse.name}.`);
                              }
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] px-3.5 py-2 text-xs font-bold transition cursor-pointer"
                        >
                          <Video className="h-3.5 w-3.5" />
                          <span>Launch Class Google Meet</span>
                        </button>
                      </div>
                    </div>

                    {isLoadingCourseDetail ? (
                      <p className="text-xs text-slate-500">Syncing course stream, assignments, and roster...</p>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Announcements & Stream */}
                        <div className="space-y-3">
                          <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                            Class Announcements ({announcements.length})
                          </h4>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!newAnnouncementText.trim()) return;
                              requestConfirmation(
                                "Post Class Announcement",
                                `Publish this announcement to "${selectedCourse.name}" in Google Classroom?`,
                                "Publish Announcement",
                                async () => {
                                  const created = await createCourseAnnouncement(
                                    token,
                                    selectedCourse.id,
                                    newAnnouncementText.trim()
                                  );
                                  setAnnouncements((prev) => [created, ...prev]);
                                  setNewAnnouncementText("");
                                  setStatusSuccess("Announcement published to Google Classroom.");
                                }
                              );
                            }}
                            className="space-y-2"
                          >
                            <textarea
                              rows={2}
                              value={newAnnouncementText}
                              onChange={(e) => setNewAnnouncementText(e.target.value)}
                              placeholder="Post an update or study notice to this class..."
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs outline-none focus:border-[#155EEF]"
                            />
                            <button
                              type="submit"
                              className="rounded-lg bg-[#0B254D] hover:bg-[#155EEF] text-white px-3 py-1.5 text-[11px] font-bold transition cursor-pointer"
                            >
                              Post to Class Stream
                            </button>
                          </form>
                          <div className="space-y-2 max-h-52 overflow-y-auto">
                            {announcements.length === 0 ? (
                              <p className="text-xs text-slate-500">No announcements posted yet.</p>
                            ) : (
                              announcements.map((a) => (
                                <div key={a.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-xs space-y-1">
                                  <p className="text-slate-800 dark:text-slate-200">{a.text}</p>
                                  {a.creationTime && (
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      {new Date(a.creationTime).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Coursework Assignments */}
                        <div className="space-y-3">
                          <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                            Coursework &amp; Assignments ({courseWork.length})
                          </h4>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!newAssignmentTitle.trim()) return;
                              requestConfirmation(
                                "Create Classroom Assignment",
                                `Publish coursework assignment "${newAssignmentTitle.trim()}" to "${selectedCourse.name}"?`,
                                "Publish Assignment",
                                async () => {
                                  const created = await createCourseWork(token, selectedCourse.id, {
                                    title: newAssignmentTitle.trim(),
                                    description: newAssignmentDesc.trim(),
                                    maxPoints: 100,
                                  });
                                  setCourseWork((prev) => [created, ...prev]);
                                  setNewAssignmentTitle("");
                                  setNewAssignmentDesc("");
                                  setStatusSuccess(`Assignment "${created.title}" published.`);
                                }
                              );
                            }}
                            className="space-y-2"
                          >
                            <input
                              type="text"
                              value={newAssignmentTitle}
                              onChange={(e) => setNewAssignmentTitle(e.target.value)}
                              placeholder="Assignment title..."
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
                            />
                            <input
                              type="text"
                              value={newAssignmentDesc}
                              onChange={(e) => setNewAssignmentDesc(e.target.value)}
                              placeholder="Instructions (optional)"
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
                            />
                            <button
                              type="submit"
                              className="rounded-lg bg-[#155EEF] hover:bg-[#0F49C7] text-white px-3 py-1.5 text-[11px] font-bold transition cursor-pointer"
                            >
                              Assign Coursework
                            </button>
                          </form>
                          <div className="space-y-2 max-h-52 overflow-y-auto">
                            {courseWork.length === 0 ? (
                              <p className="text-xs text-slate-500">No coursework items yet.</p>
                            ) : (
                              courseWork.map((cw) => (
                                <div key={cw.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-xs flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-bold text-[#0B254D] dark:text-white truncate">{cw.title}</p>
                                    {cw.description && (
                                      <p className="text-[11px] text-slate-500 line-clamp-2">{cw.description}</p>
                                    )}
                                  </div>
                                  {cw.alternateLink && (
                                    <a
                                      href={cw.alternateLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[11px] font-semibold text-[#155EEF] shrink-0 hover:underline"
                                    >
                                      Open
                                    </a>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Study Materials & Roster Summary */}
                    <div className="grid gap-4 md:grid-cols-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-[#155EEF]" />
                          <span>Course Materials ({materials.length})</span>
                        </h5>
                        {materials.length === 0 ? (
                          <p className="text-xs text-slate-500">No shared reference materials in this course yet.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {materials.map((m) => (
                              <div key={m.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <span className="font-medium truncate">{m.title}</span>
                                {m.alternateLink && (
                                  <a
                                    href={m.alternateLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#155EEF] font-semibold hover:underline shrink-0 ml-2"
                                  >
                                    View
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-[#155EEF]" />
                          <span>Class Roster ({roster.length})</span>
                        </h5>
                        {roster.length === 0 ? (
                          <p className="text-xs text-slate-500">Roster details unavailable or empty.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {roster.map((member) => (
                              <div key={member.userId} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <span className="font-medium truncate">{member.name}</span>
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-[#155EEF] dark:text-blue-300">
                                  {member.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-500">
                    Select or create a Google Classroom course on the left to manage class streams, assignments, and live Google Meet links.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. GOOGLE MEET LIVE LEARNING */}
          {activeTab === "meet" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                  Create Live Google Meet Classroom
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Generate an instant Google Meet conference link for lectures, Bible school seminars, or student mentorship sessions.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const topicLabel = meetTopic.trim() || "Zion Digital Live Lecture";
                    requestConfirmation(
                      "Create Google Meet Space",
                      `Create a new live Google Meet video room for "${topicLabel}"?`,
                      "Create Meet Room",
                      async () => {
                        setIsCreatingMeet(true);
                        try {
                          const space = await createMeetSpace(token);
                          setCreatedMeets((prev) => [
                            { ...space, topic: topicLabel, createdAt: new Date().toLocaleTimeString() },
                            ...prev,
                          ]);
                          setMeetTopic("");
                          setStatusSuccess(`Google Meet room ready: ${space.meetingUri}`);
                        } finally {
                          setIsCreatingMeet(false);
                        }
                      }
                    );
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                      Class or Session Topic
                    </label>
                    <input
                      type="text"
                      value={meetTopic}
                      onChange={(e) => setMeetTopic(e.target.value)}
                      placeholder="e.g. Systematic Theology & Leadership Q&A"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs outline-none focus:border-[#155EEF]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreatingMeet}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white py-3 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    <Video className="h-4 w-4" />
                    <span>{isCreatingMeet ? "Creating Meet Space..." : "Generate Live Google Meet Link"}</span>
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                  Active Google Meet Class Rooms
                </h3>
                {createdMeets.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-6 text-center text-xs text-slate-500">
                    No Google Meet rooms created in this session yet. Click "Generate Live Google Meet Link" to start a live class.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {createdMeets.map((room) => (
                      <div
                        key={room.name}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0B254D] dark:text-white truncate">{room.topic}</p>
                          <p className="text-[11px] font-mono text-slate-500 truncate">{room.meetingUri}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Code: {room.meetingCode} · Created at {room.createdAt}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(room.meetingUri)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            {copiedMeetUri === room.meetingUri ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                          <a
                            href={room.meetingUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] px-3.5 py-2 text-[11px] font-bold transition"
                          >
                            <span>Join Meet</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. GOOGLE CALENDAR */}
          {activeTab === "calendar" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!calTitle.trim()) return;
                  requestConfirmation(
                    "Schedule Google Calendar Class Event",
                    `Add "${calTitle.trim()}" on ${calDate} at ${calTime} to your primary Google Calendar${calAttachMeet ? " with a Google Meet link" : ""}?`,
                    "Schedule Event",
                    async () => {
                      const created = await createCalendarEvent(token, {
                        summary: calTitle.trim(),
                        date: calDate,
                        time: calTime,
                        addMeetLink: calAttachMeet,
                      });
                      setCalendarEvents((prev) => [created, ...prev]);
                      setCalTitle("");
                      setStatusSuccess(`Scheduled "${created.summary}" in Google Calendar.`);
                    }
                  );
                }}
                className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                  Schedule Class or Seminar
                </h3>
                <input
                  type="text"
                  required
                  value={calTitle}
                  onChange={(e) => setCalTitle(e.target.value)}
                  placeholder="Class title (e.g. Leadership Cohort Seminar)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    required
                    value={calDate}
                    onChange={(e) => setCalDate(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none"
                  />
                  <input
                    type="time"
                    required
                    value={calTime}
                    onChange={(e) => setCalTime(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calAttachMeet}
                    onChange={(e) => setCalAttachMeet(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Automatically attach a Google Meet video link</span>
                </label>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white py-2.5 text-xs font-bold transition cursor-pointer"
                >
                  Save to Google Calendar
                </button>
              </form>

              <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                    Upcoming Google Calendar Schedule
                  </h3>
                  <button
                    type="button"
                    onClick={() => loadCalendarData(token)}
                    className="text-xs font-semibold text-[#155EEF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingCalendar ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
                {isLoadingCalendar ? (
                  <p className="text-xs text-slate-500">Loading calendar events...</p>
                ) : calendarEvents.length === 0 ? (
                  <p className="text-xs text-slate-500">No upcoming events scheduled.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                    {calendarEvents.map((ev) => (
                      <div key={ev.id} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0B254D] dark:text-white">{ev.summary || "(Untitled Event)"}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {ev.start?.dateTime
                              ? new Date(ev.start.dateTime).toLocaleString()
                              : ev.start?.date || "Scheduled"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {ev.hangoutLink && (
                            <a
                              href={ev.hangoutLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#F5B82E] text-[#0B254D] px-3 py-1.5 text-[11px] font-bold"
                            >
                              Join Meet
                            </a>
                          )}
                          {ev.htmlLink && (
                            <a
                              href={ev.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-semibold text-[#155EEF] hover:underline"
                            >
                              Open
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. GOOGLE DRIVE & DOCS */}
          {activeTab === "drive" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!docTitle.trim()) return;
                  requestConfirmation(
                    "Create Google Doc in Drive",
                    `Create a new Google Doc titled "${docTitle.trim()}" inside your Google Drive?`,
                    "Create Google Doc",
                    async () => {
                      setIsCreatingDoc(true);
                      try {
                        const created = await createDriveGoogleDoc(
                          token,
                          docTitle.trim(),
                          docBody.trim() || `${docTitle.trim()}\n\nPrepared via ${schoolName}.`
                        );
                        setDriveFiles((prev) => [created, ...prev]);
                        setDocTitle("");
                        setDocBody("");
                        setStatusSuccess(`Created Google Doc "${created.name}".`);
                      } finally {
                        setIsCreatingDoc(false);
                      }
                    }
                  );
                }}
                className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#155EEF]" />
                  <span>Create Study Outline in Google Docs</span>
                </h3>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Document title..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
                />
                <textarea
                  rows={5}
                  value={docBody}
                  onChange={(e) => setDocBody(e.target.value)}
                  placeholder="Write lecture notes, study guide, or assignment text..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs outline-none focus:border-[#155EEF]"
                />
                <button
                  type="submit"
                  disabled={isCreatingDoc}
                  className="w-full rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white py-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {isCreatingDoc ? "Creating Doc..." : "Save to Google Drive as Doc"}
                </button>
              </form>

              <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                    Google Drive Study Files
                  </h3>
                  <button
                    type="button"
                    onClick={() => loadDriveData(token)}
                    className="text-xs font-semibold text-[#155EEF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDrive ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
                {isLoadingDrive ? (
                  <p className="text-xs text-slate-500">Loading Google Drive files...</p>
                ) : driveFiles.length === 0 ? (
                  <p className="text-xs text-slate-500">No Drive files found.</p>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto">
                    {driveFiles.map((f) => (
                      <div key={f.id} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0B254D] dark:text-white truncate">{f.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {f.modifiedTime ? `Updated ${new Date(f.modifiedTime).toLocaleDateString()}` : "Drive File"}
                          </p>
                        </div>
                        {f.webViewLink && (
                          <a
                            href={f.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#155EEF] hover:underline shrink-0"
                          >
                            <span>Open</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. GOOGLE FORMS */}
          {activeTab === "forms" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!formTitle.trim()) return;
                  requestConfirmation(
                    "Create Google Form Quiz or Survey",
                    `Create a new Google Form titled "${formTitle.trim()}" in your Google Workspace account?`,
                    "Create Form",
                    async () => {
                      setIsCreatingForm(true);
                      try {
                        const res = await createGoogleForm(token, formTitle.trim());
                        setCreatedForms((prev) => [
                          {
                            formId: res.formId,
                            title: res.info?.title || formTitle.trim(),
                            responderUri: res.responderUri,
                          },
                          ...prev,
                        ]);
                        setFormTitle("");
                        setStatusSuccess(`Created Google Form "${res.info?.title || formTitle.trim()}".`);
                      } finally {
                        setIsCreatingForm(false);
                      }
                    }
                  );
                }}
                className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                  Create School Quiz or Enrollment Form
                </h3>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Form title (e.g. Term 1 Mid-Term Assessment)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
                />
                <button
                  type="submit"
                  disabled={isCreatingForm}
                  className="w-full rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white py-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {isCreatingForm ? "Creating Form..." : "Create Google Form"}
                </button>
              </form>

              <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                  Created School Forms
                </h3>
                {createdForms.length === 0 ? (
                  <p className="text-xs text-slate-500">Create a form on the left to generate a live Google Forms assessment link.</p>
                ) : (
                  <div className="space-y-2.5">
                    {createdForms.map((f) => (
                      <div key={f.formId} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0B254D] dark:text-white truncate">{f.title}</p>
                          <p className="text-[10px] font-mono text-slate-400">Form ID: {f.formId}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <a
                            href={`https://docs.google.com/forms/d/${f.formId}/edit`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-[11px] font-semibold"
                          >
                            Edit Questions
                          </a>
                          {f.responderUri && (
                            <a
                              href={f.responderUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-[#155EEF] text-white px-3 py-1.5 text-[11px] font-bold"
                            >
                              Share Link
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. SCHOOL GMAIL */}
          {activeTab === "gmail" && (
            <div className="grid gap-6 lg:grid-cols-12">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!mailTo.trim() || !mailSubject.trim() || !mailBody.trim()) return;
                  requestConfirmation(
                    "Send Email via Gmail",
                    `Send email "${mailSubject.trim()}" to ${mailTo.trim()} from ${googleUser?.email || "your Google account"}?`,
                    "Send Email",
                    async () => {
                      setIsSendingMail(true);
                      try {
                        await sendGmailMessage(
                          mailTo.trim(),
                          mailSubject.trim(),
                          `<div style="font-family:sans-serif;line-height:1.6;"><p>${mailBody.replace(/\n/g, "<br/>")}</p><hr/><p style="font-size:11px;color:#64748b;">Sent from ${schoolName}</p></div>`
                        );
                        setMailTo("");
                        setMailSubject("");
                        setMailBody("");
                        setStatusSuccess("Email sent via Gmail.");
                      } finally {
                        setIsSendingMail(false);
                      }
                    }
                  );
                }}
                className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                  Send School Notice (Gmail)
                </h3>
                <input
                  type="email"
                  required
                  value={mailTo}
                  onChange={(e) => setMailTo(e.target.value)}
                  placeholder="Recipient email"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
                />
                <input
                  type="text"
                  required
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-[#155EEF]"
                />
                <textarea
                  rows={5}
                  required
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  placeholder="Message..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs outline-none focus:border-[#155EEF]"
                />
                <button
                  type="submit"
                  disabled={isSendingMail}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white py-2.5 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSendingMail ? "Sending..." : "Send Gmail Message"}</span>
                </button>
              </form>

              <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                    Recent Gmail Messages
                  </h3>
                  <button
                    type="button"
                    onClick={() => loadGmailData(token)}
                    className="text-xs font-semibold text-[#155EEF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingMail ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
                {isLoadingMail ? (
                  <p className="text-xs text-slate-500">Syncing Gmail inbox...</p>
                ) : emails.length === 0 ? (
                  <p className="text-xs text-slate-500">No messages loaded.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                    {emails.map((m) => (
                      <div key={m.id} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-1">
                        <p className="text-[11px] font-semibold text-slate-500 truncate">{m.from}</p>
                        <p className="text-xs font-bold text-[#0B254D] dark:text-white truncate">{m.subject}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{m.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 7. CONTACTS (Full Hub Mode) */}
          {activeTab === "contacts" && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                  Google Contacts ({contacts.length})
                </h3>
                <button
                  type="button"
                  onClick={() => loadContactsAndChat(token)}
                  className="text-xs font-semibold text-[#155EEF] hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>
              {isLoadingDirectory ? (
                <p className="text-xs text-slate-500">Loading contacts...</p>
              ) : contacts.length === 0 ? (
                <p className="text-xs text-slate-500">No contacts returned for this Google account.</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contacts.map((c) => (
                    <div key={c.resourceName} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 text-xs">
                      <p className="font-bold text-[#0B254D] dark:text-white truncate">{c.name}</p>
                      {c.email && <p className="text-slate-500 truncate">{c.email}</p>}
                      {c.phone && <p className="font-mono text-[11px] text-slate-400">{c.phone}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 8. GOOGLE CHAT SPACES (Full Hub Mode) */}
          {activeTab === "chat" && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                  Google Chat Spaces ({chatSpaces.length})
                </h3>
                <button
                  type="button"
                  onClick={() => loadContactsAndChat(token)}
                  className="text-xs font-semibold text-[#155EEF] hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>
              {isLoadingDirectory ? (
                <p className="text-xs text-slate-500">Loading Google Chat spaces...</p>
              ) : chatSpaces.length === 0 ? (
                <p className="text-xs text-slate-500">No Google Chat spaces available on this account.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {chatSpaces.map((s) => (
                    <div key={s.name} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 text-xs">
                      <p className="font-bold text-[#0B254D] dark:text-white">{s.displayName || s.name}</p>
                      <p className="text-[11px] font-mono text-slate-400">{s.spaceType || "SPACE"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Confirmation Dialog Modal */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 text-left">
            <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
              {pendingConfirm.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {pendingConfirm.message}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isExecutingConfirm}
                onClick={() => setPendingConfirm(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecutingConfirm}
                onClick={executeConfirmedAction}
                className="rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isExecutingConfirm ? "Processing..." : pendingConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
