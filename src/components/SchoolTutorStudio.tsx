import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  MessageSquare,
  Mic,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { User } from "../types";
import { secureApiFetch } from "../lib/aiClient";
import { UNIFIED_SCHOOL_COURSES, SchoolCourseOption } from "../lib/schoolCatalog";
import {
  exportPDF,
  exportWordDoc,
  exportSlidesDeck,
  exportSheetCsv,
} from "../lib/docExporter";

interface SchoolTutorStudioProps {
  currentUser: User | null;
  seedPublishDraft?: { title: string; content: string } | null;
  onClearSeedDraft?: () => void;
  onOpenTutorAi?: () => void;
}

type StudioTab = "notes" | "classes" | "discussions" | "assignments" | "assessments";

export default function SchoolTutorStudio({
  currentUser,
  seedPublishDraft,
  onClearSeedDraft,
  onOpenTutorAi,
}: SchoolTutorStudioProps) {
  const userRoleLower = (currentUser?.role || "").toLowerCase();
  const isAdmin =
    ["main_admin", "admin", "sub_admin", "manager"].includes(userRoleLower) ||
    Boolean(currentUser?.isMainAdmin);

  const authorizedCourses: SchoolCourseOption[] = React.useMemo(() => {
    if (isAdmin) return UNIFIED_SCHOOL_COURSES;
    const assigned = (currentUser?.authorizedCourses || []).map((c) => c.toLowerCase());
    if (assigned.length === 0) return [];
    return UNIFIED_SCHOOL_COURSES.filter(
      (c) =>
        assigned.includes(c.id.toLowerCase()) ||
        assigned.includes(c.courseCode.toLowerCase())
    );
  }, [isAdmin, currentUser?.authorizedCourses]);

  const [activeTab, setActiveTab] = useState<StudioTab>("notes");
  const [selectedCourseKey, setSelectedCourseKey] = useState<string>("");

  useEffect(() => {
    if (authorizedCourses.length > 0 && !selectedCourseKey) {
      setSelectedCourseKey(authorizedCourses[0].id);
    }
  }, [authorizedCourses, selectedCourseKey]);

  const selectedCourse =
    authorizedCourses.find((c) => c.id === selectedCourseKey) || authorizedCourses[0] || null;

  // Publisher & Notes State
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [publishFormat, setPublishFormat] = useState<"pdf" | "docx" | "slides" | "sheet">("pdf");
  const [notesList, setNotesList] = useState<any[]>([]);
  const [isPublishingNote, setIsPublishingNote] = useState(false);

  // Sync AI-seeded notes directly into Publisher
  useEffect(() => {
    if (seedPublishDraft) {
      setNoteTitle(seedPublishDraft.title || "AI Generated Course Notes");
      setNoteContent(seedPublishDraft.content || "");
      setActiveTab("notes");
    }
  }, [seedPublishDraft]);

  // Online Classes State
  const [classTitle, setClassTitle] = useState("");
  const [classDate, setClassDate] = useState(new Date().toISOString().split("T")[0]);
  const [classTime, setClassTime] = useState("10:00");
  const [classDuration, setClassDuration] = useState(60);
  const [meetUrl, setMeetUrl] = useState("");
  const [classroomUrl, setClassroomUrl] = useState("");
  const [classNotes, setClassNotes] = useState("");
  const [classesList, setClassesList] = useState<any[]>([]);

  // Learner Discussions State
  const [discussionMsg, setDiscussionMsg] = useState("");
  const [discussionsList, setDiscussionsList] = useState<any[]>([]);

  // Assignments State
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignDue, setAssignDue] = useState("");
  const [assignMaxMarks, setAssignMaxMarks] = useState(20);
  const [assignmentsList, setAssignmentsList] = useState<any[]>([]);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { score: string; feedback: string }>>({});

  // CATs & Exams State
  const [examTitle, setExamTitle] = useState("");
  const [assessmentType, setAssessmentType] = useState<"cat" | "exam">("cat");
  const [examDuration, setExamDuration] = useState(25);
  const [allowMic, setAllowMic] = useState(true);
  const [mcqDrafts, setMcqDrafts] = useState<
    { question: string; options: [string, string, string, string]; correctIndex: number; explanation: string }[]
  >([
    {
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
    },
  ]);
  const [writtenDrafts, setWrittenDrafts] = useState<{ id: string; prompt: string; maxMarks: number }[]>([]);
  const [examsList, setExamsList] = useState<any[]>([]);
  const [attemptsList, setAttemptsList] = useState<any[]>([]);

  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadWorkspaceData = useCallback(async () => {
    const courseFilter = selectedCourse ? `?courseId=${encodeURIComponent(selectedCourse.id)}` : "";
    const [notesRes, clsRes, discRes, assgRes, exmRes, attRes] = await Promise.all([
      secureApiFetch(`/api/school/notes${courseFilter}`).then((r) => r.json()).catch(() => ({})),
      secureApiFetch(`/api/school/classes${courseFilter}`).then((r) => r.json()).catch(() => ({})),
      secureApiFetch(`/api/school/discussions${courseFilter}`).then((r) => r.json()).catch(() => ({})),
      secureApiFetch(`/api/school/assignments${courseFilter}`).then((r) => r.json()).catch(() => ({})),
      secureApiFetch("/api/exams").then((r) => r.json()).catch(() => ({})),
      secureApiFetch("/api/exams/attempts").then((r) => r.json()).catch(() => ({})),
    ]);

    setNotesList(Array.isArray(notesRes?.notes) ? notesRes.notes : []);
    setClassesList(Array.isArray(clsRes?.classes) ? clsRes.classes : []);
    setDiscussionsList(Array.isArray(discRes?.discussions) ? discRes.discussions : []);
    setAssignmentsList(Array.isArray(assgRes?.assignments) ? assgRes.assignments : []);
    setExamsList(Array.isArray(exmRes?.exams) ? exmRes.exams : []);
    setAttemptsList(Array.isArray(attRes?.attempts) ? attRes.attempts : []);
  }, [selectedCourse]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleLocalExport = (format: "pdf" | "docx" | "slides" | "sheet", title: string, content: string) => {
    if (!title.trim() || !content.trim()) {
      setStatusMsg({ type: "err", text: "Provide a document title and content before exporting." });
      return;
    }
    if (format === "pdf") exportPDF(title, content);
    else if (format === "docx") exportWordDoc(title, content);
    else if (format === "slides") exportSlidesDeck(title, content);
    else exportSheetCsv(title, content);
  };

  const handlePublishNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (!noteTitle.trim() || !noteContent.trim()) {
      setStatusMsg({ type: "err", text: "Enter both note title and content." });
      return;
    }

    setIsPublishingNote(true);
    setStatusMsg(null);
    try {
      const res = await secureApiFetch("/api/school/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          courseCode: selectedCourse.courseCode,
          courseTitle: selectedCourse.title,
          school: selectedCourse.school,
          title: noteTitle.trim(),
          content: noteContent.trim(),
          publishFormat,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setStatusMsg({ type: "err", text: data.error || "Failed to publish course notes." });
        return;
      }
      setStatusMsg({
        type: "ok",
        text: `Published "${noteTitle.trim()}" (${publishFormat.toUpperCase()}) exclusively to students enrolled in ${selectedCourse.courseCode}.`,
      });
      setNoteTitle("");
      setNoteContent("");
      onClearSeedDraft?.();
      await loadWorkspaceData();
    } finally {
      setIsPublishingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const res = await secureApiFetch(`/api/school/notes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadWorkspaceData();
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !classTitle.trim()) return;
    setStatusMsg(null);
    const res = await secureApiFetch("/api/school/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: selectedCourse.id,
        courseCode: selectedCourse.courseCode,
        courseTitle: selectedCourse.title,
        school: selectedCourse.school,
        title: classTitle.trim(),
        scheduledDate: classDate,
        scheduledTime: classTime,
        durationMinutes: Number(classDuration),
        meetUrl: meetUrl.trim(),
        classroomUrl: classroomUrl.trim(),
        notes: classNotes.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      setClassTitle("");
      setMeetUrl("");
      setClassroomUrl("");
      setClassNotes("");
      setStatusMsg({ type: "ok", text: "Online class session scheduled for your learners." });
      await loadWorkspaceData();
    } else {
      setStatusMsg({ type: "err", text: data.error || "Could not schedule class." });
    }
  };

  const handlePostDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !discussionMsg.trim()) return;
    const res = await secureApiFetch("/api/school/discussions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: selectedCourse.id,
        courseCode: selectedCourse.courseCode,
        message: discussionMsg.trim(),
      }),
    });
    if (res.ok) {
      setDiscussionMsg("");
      await loadWorkspaceData();
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !assignTitle.trim() || !assignDesc.trim()) return;
    const res = await secureApiFetch("/api/school/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: selectedCourse.id,
        courseCode: selectedCourse.courseCode,
        title: assignTitle.trim(),
        instructions: assignDesc.trim(),
        dueDate: assignDue,
        maxMarks: Number(assignMaxMarks),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      setAssignTitle("");
      setAssignDesc("");
      setAssignDue("");
      setStatusMsg({ type: "ok", text: "Assignment published to enrolled students." });
      await loadWorkspaceData();
    } else {
      setStatusMsg({ type: "err", text: data.error || "Could not create assignment." });
    }
  };

  const handleGradeSubmission = async (assignmentId: string, submissionId: string) => {
    const entry = gradeInputs[submissionId];
    if (!entry || entry.score === "") return;
    const res = await secureApiFetch(
      `/api/school/assignments/${encodeURIComponent(assignmentId)}/grade`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          score: Number(entry.score),
          feedback: entry.feedback || "",
        }),
      }
    );
    if (res.ok) {
      setStatusMsg({ type: "ok", text: "Student assignment mark saved." });
      await loadWorkspaceData();
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !examTitle.trim()) return;
    const validMcqs = mcqDrafts.filter(
      (q) => q.question.trim() && q.options.every((o) => o.trim())
    );
    const validWritten = writtenDrafts.filter((w) => w.prompt.trim());

    if (validMcqs.length === 0 && validWritten.length === 0) {
      setStatusMsg({
        type: "err",
        text: "Add at least one complete multiple-choice or written/oral question.",
      });
      return;
    }

    const res = await secureApiFetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: examTitle.trim(),
        courseId: selectedCourse.id,
        courseCode: selectedCourse.courseCode,
        school: selectedCourse.school,
        assessmentType,
        durationMinutes: Number(examDuration),
        allowMicrophone: allowMic,
        questions: validMcqs,
        writtenQuestions: validWritten,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      setExamTitle("");
      setMcqDrafts([{ question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]);
      setWrittenDrafts([]);
      setStatusMsg({
        type: "ok",
        text: `${assessmentType.toUpperCase()} published with auto-submit lockdown.`,
      });
      await loadWorkspaceData();
    } else {
      setStatusMsg({ type: "err", text: data.error || "Could not publish assessment." });
    }
  };

  if (authorizedCourses.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center space-y-3">
        <GraduationCap className="h-9 w-9 text-amber-700 mx-auto" />
        <h3 className="font-display text-base font-bold text-[#0B254D]">
          No Assigned Classes Yet
        </h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Your tutor account has not yet been assigned specific courses by the School Administrator. Once Admin assigns your classes, you can publish course notes, host classes, give assignments, and set CATs and Exams here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left">
      {/* Studio Top Bar & Course Selector */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#155EEF] font-bold block">
              School Tutor Workspace
            </span>
            <h3 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
              Instructor Desk &amp; Class Studio
            </h3>
            <p className="text-xs text-slate-500">
              Assigned classes: {authorizedCourses.length} &middot; Course materials stay locked to enrolled students only.
            </p>
          </div>

          {onOpenTutorAi && (
            <button
              type="button"
              onClick={onOpenTutorAi}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B254D] hover:bg-[#155EEF] text-white text-xs font-bold px-3.5 py-2 cursor-pointer shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#F5B82E]" />
              <span>Generate Notes in AI Assist</span>
            </button>
          )}
        </div>

        {/* Assigned Course Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="text-xs font-bold text-[#0B254D] dark:text-slate-200 shrink-0">
            Active Assigned Class:
          </label>
          <select
            value={selectedCourse?.id || ""}
            onChange={(e) => setSelectedCourseKey(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#155EEF]"
          >
            {authorizedCourses.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.school === "bible" ? "Bible School" : "Leadership"}] {c.courseCode} - {c.title}
              </option>
            ))}
          </select>
        </div>

        {/* Studio Sub-Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "notes", label: "Notes & Publisher", icon: BookOpen },
            { id: "classes", label: "Online Classes", icon: Video },
            { id: "discussions", label: "Learner Chat", icon: MessageSquare },
            { id: "assignments", label: "Assignments", icon: FileText },
            { id: "assessments", label: "CATs & Exams", icon: ClipboardCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as StudioTab)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                  active
                    ? "bg-[#155EEF] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {statusMsg && (
          <div
            className={`rounded-xl p-3 text-xs font-medium border ${
              statusMsg.type === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {statusMsg.text}
          </div>
        )}
      </div>

      {/* TAB 1: NOTES & PUBLISHER */}
      {activeTab === "notes" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handlePublishNotes}
            className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                Tutor Publisher &amp; Course Notes
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                Target: {selectedCourse?.courseCode}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document / Lesson Title
                </label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g. Week 3 Lecture Notes: Servant Stewardship"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 outline-none focus:border-[#155EEF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deliverable Document Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "pdf", label: "PDF Document" },
                    { id: "docx", label: "Word (.docx)" },
                    { id: "slides", label: "Slides Deck" },
                    { id: "sheet", label: "Spreadsheet (.csv)" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setPublishFormat(fmt.id as any)}
                      className={`rounded-xl border px-2.5 py-2 text-[11px] font-bold transition cursor-pointer ${
                        publishFormat === fmt.id
                          ? "bg-[#0B254D] text-white border-[#0B254D]"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes Content (Paste or send from AI Assist Chat)
                </label>
                <textarea
                  rows={9}
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write or paste AI-generated lecture notes, headings (# Topic), bullet points (- Point), or key-value rows for spreadsheets..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 font-sans leading-relaxed outline-none focus:border-[#155EEF]"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleLocalExport(publishFormat, noteTitle, noteContent)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Preview / Download {publishFormat.toUpperCase()}</span>
                </button>

                <button
                  type="submit"
                  disabled={isPublishingNote}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold px-5 py-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isPublishingNote ? "Publishing..." : "Share with Enrolled Students"}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Published Notes List */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
              Published Course Documents ({notesList.length})
            </h4>
            <p className="text-[11px] text-slate-500">
              Only learners enrolled in {selectedCourse?.courseCode} can open and download these documents.
            </p>
            {notesList.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No notes published for this course yet.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {notesList.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-block rounded bg-blue-50 text-[#155EEF] font-mono text-[10px] font-bold px-1.5 py-0.5 uppercase">
                          {n.publishFormat}
                        </span>
                        <h5 className="font-bold text-[#0B254D] dark:text-white mt-1">
                          {n.title}
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          {n.courseCode} &middot; {n.createdAt?.slice(0, 10)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                        title="Delete published note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLocalExport(n.publishFormat || "pdf", n.title, n.content)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#155EEF] hover:underline cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download {String(n.publishFormat || "pdf").toUpperCase()}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ONLINE CLASSES */}
      {activeTab === "classes" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleCreateClass}
            className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs"
          >
            <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
              Organize Online Class Session
            </h4>
            <div>
              <label className="block font-semibold mb-1">Session Topic</label>
              <input
                type="text"
                required
                value={classTitle}
                onChange={(e) => setClassTitle(e.target.value)}
                placeholder="e.g. Live Seminar: Biblical Ethics & Governance"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold mb-1">Date</label>
                <input
                  type="date"
                  value={classDate}
                  onChange={(e) => setClassDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Start Time</label>
                <input
                  type="time"
                  value={classTime}
                  onChange={(e) => setClassTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Minutes</label>
                <input
                  type="number"
                  min={15}
                  max={240}
                  value={classDuration}
                  onChange={(e) => setClassDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Google Meet Link</label>
              <input
                type="url"
                value={meetUrl}
                onChange={(e) => setMeetUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Google Classroom Link (Optional)</label>
              <input
                type="url"
                value={classroomUrl}
                onChange={(e) => setClassroomUrl(e.target.value)}
                placeholder="https://classroom.google.com/..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Preparation Instructions</label>
              <textarea
                rows={2}
                value={classNotes}
                onChange={(e) => setClassNotes(e.target.value)}
                placeholder="Reading chapters or agenda for learners..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold px-5 py-2 cursor-pointer"
            >
              Schedule Live Class
            </button>
          </form>

          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#155EEF]" />
              <span>Scheduled Classes ({classesList.length})</span>
            </h4>
            {classesList.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No live classes scheduled yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                {classesList.map((cls) => (
                  <div
                    key={cls.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs space-y-1.5"
                  >
                    <p className="font-bold text-[#0B254D] dark:text-white">{cls.title}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {cls.scheduledDate} at {cls.scheduledTime} ({cls.durationMinutes} min)
                    </p>
                    {cls.notes && <p className="text-[11px] text-slate-600">{cls.notes}</p>}
                    {cls.meetUrl && (
                      <a
                        href={cls.meetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#155EEF] hover:underline"
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Launch Google Meet</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LEARNER DISCUSSIONS */}
      {activeTab === "discussions" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
            Course Q&amp;A &amp; Learner Interaction ({selectedCourse?.courseCode})
          </h4>

          <form onSubmit={handlePostDiscussion} className="flex flex-col sm:flex-row gap-2 text-xs">
            <input
              type="text"
              value={discussionMsg}
              onChange={(e) => setDiscussionMsg(e.target.value)}
              placeholder="Write a class update, answer learner questions, or share guidance..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#0B254D] hover:bg-[#155EEF] text-white font-bold px-4 py-2 cursor-pointer"
            >
              Post Message
            </button>
          </form>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto">
            {discussionsList.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No course messages yet.</p>
            ) : (
              discussionsList.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0B254D] dark:text-white">
                      {d.senderName}{" "}
                      <span className="text-[10px] font-mono uppercase text-[#155EEF]">
                        ({d.senderRole})
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {d.createdAt?.slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{d.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ASSIGNMENTS & GRADING */}
      {activeTab === "assignments" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleCreateAssignment}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 text-xs"
          >
            <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
              Give Course Assignment
            </h4>
            <div>
              <label className="block font-semibold mb-1">Assignment Title</label>
              <input
                type="text"
                required
                value={assignTitle}
                onChange={(e) => setAssignTitle(e.target.value)}
                placeholder="e.g. Case Study Essay on Ethical Stewardship"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Due Date</label>
                <input
                  type="date"
                  value={assignDue}
                  onChange={(e) => setAssignDue(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Max Marks</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={assignMaxMarks}
                  onChange={(e) => setAssignMaxMarks(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Instructions &amp; Rubric</label>
              <textarea
                rows={4}
                required
                value={assignDesc}
                onChange={(e) => setAssignDesc(e.target.value)}
                placeholder="Describe what learners should submit..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold px-5 py-2 cursor-pointer"
            >
              Publish Assignment
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
              Assignments &amp; Learner Submissions ({assignmentsList.length})
            </h4>
            {assignmentsList.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No assignments yet.</p>
            ) : (
              <div className="space-y-4 max-h-[450px] overflow-y-auto">
                {assignmentsList.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 text-xs space-y-2.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-[#0B254D] dark:text-white">{a.title}</p>
                        <p className="text-[11px] text-slate-500">
                          Max: {a.maxMarks} marks {a.dueDate ? `| Due: ${a.dueDate}` : ""}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-[#155EEF]">
                        {(a.submissions || []).length} Submissions
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{a.instructions}</p>

                    {(a.submissions || []).map((sub: any) => (
                      <div
                        key={sub.id}
                        className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2.5 space-y-2 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex justify-between">
                          <span className="font-bold">{sub.studentName}</span>
                          {sub.score !== undefined && (
                            <span className="font-mono font-bold text-emerald-700">
                              Marked: {sub.score}/{a.maxMarks}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300">
                          {sub.responseText}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            placeholder="Score"
                            value={gradeInputs[sub.id]?.score ?? (sub.score ?? "")}
                            onChange={(e) =>
                              setGradeInputs((prev) => ({
                                ...prev,
                                [sub.id]: {
                                  score: e.target.value,
                                  feedback: prev[sub.id]?.feedback ?? sub.feedback ?? "",
                                },
                              }))
                            }
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-[11px]"
                          />
                          <input
                            type="text"
                            placeholder="Tutor feedback"
                            value={gradeInputs[sub.id]?.feedback ?? (sub.feedback ?? "")}
                            onChange={(e) =>
                              setGradeInputs((prev) => ({
                                ...prev,
                                [sub.id]: {
                                  score: prev[sub.id]?.score ?? String(sub.score ?? ""),
                                  feedback: e.target.value,
                                },
                              }))
                            }
                            className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px]"
                          />
                          <button
                            type="button"
                            onClick={() => handleGradeSubmission(a.id, sub.id)}
                            className="rounded-lg bg-[#0B254D] text-white px-3 py-1 text-[11px] font-bold cursor-pointer"
                          >
                            Save Mark
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CATS & EXAMS BUILDER */}
      {activeTab === "assessments" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleCreateAssessment}
            className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 text-xs"
          >
            <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
              Create Timed CAT or Final Exam (Lockdown + Microphone)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">CAT / Exam Title</label>
                <input
                  type="text"
                  required
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g. CAT 1: Foundations of Christian Leadership"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Type</label>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value as "cat" | "exam")}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                >
                  <option value="cat">CAT (Continuous Assessment)</option>
                  <option value="exam">Final Exam</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <label className="font-semibold">Time Limit (Minutes):</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={examDuration}
                  onChange={(e) => setExamDuration(Number(e.target.value))}
                  className="w-20 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                />
              </div>
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowMic}
                  onChange={(e) => setAllowMic(e.target.checked)}
                />
                <Mic className="h-3.5 w-3.5 text-[#155EEF]" />
                <span>Allow Learner Microphone</span>
              </label>
            </div>

            {/* Objective Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0B254D] dark:text-white">
                  Multiple Choice Questions ({mcqDrafts.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setMcqDrafts((prev) => [
                      ...prev,
                      { question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 font-bold text-[#0B254D] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add MCQ</span>
                </button>
              </div>

              {mcqDrafts.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <input
                    type="text"
                    placeholder={`Question ${qIdx + 1}`}
                    value={q.question}
                    onChange={(e) =>
                      setMcqDrafts((prev) =>
                        prev.map((item, idx) =>
                          idx === qIdx ? { ...item, question: e.target.value } : item
                        )
                      )
                    }
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`correct_${qIdx}`}
                          checked={q.correctIndex === oIdx}
                          onChange={() =>
                            setMcqDrafts((prev) =>
                              prev.map((item, idx) =>
                                idx === qIdx ? { ...item, correctIndex: oIdx } : item
                              )
                            )
                          }
                          title="Mark as correct option"
                        />
                        <input
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                          value={opt}
                          onChange={(e) =>
                            setMcqDrafts((prev) =>
                              prev.map((item, idx) => {
                                if (idx !== qIdx) return item;
                                const nextOpts = [...item.options] as [string, string, string, string];
                                nextOpts[oIdx] = e.target.value;
                                return { ...item, options: nextOpts };
                              })
                            )
                          }
                          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Written / Oral Microphone Questions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0B254D] dark:text-white">
                  Written / Spoken Microphone Prompts ({writtenDrafts.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setWrittenDrafts((prev) => [
                      ...prev,
                      { id: `wq_${Date.now()}`, prompt: "", maxMarks: 10 },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1 font-bold text-[#0B254D] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Oral / Written Prompt</span>
                </button>
              </div>
              {writtenDrafts.map((w, idx) => (
                <div key={w.id} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Prompt ${idx + 1} (Learners may type or answer via microphone)`}
                    value={w.prompt}
                    onChange={(e) =>
                      setWrittenDrafts((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, prompt: e.target.value } : item))
                      )
                    }
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5"
                  />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={w.maxMarks}
                    onChange={(e) =>
                      setWrittenDrafts((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, maxMarks: Number(e.target.value) } : item
                        )
                      )
                    }
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold px-5 py-2.5 cursor-pointer"
            >
              Publish {assessmentType.toUpperCase()} to Course Portal
            </button>
          </form>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
              Published CATs &amp; Exams ({examsList.length})
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {examsList.map((ex) => (
                <div
                  key={ex.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs"
                >
                  <div className="flex justify-between">
                    <span className="font-bold">{ex.title}</span>
                    <span className="uppercase font-mono text-[10px] font-bold text-[#155EEF]">
                      {ex.assessmentType || "exam"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {ex.durationMinutes} min &middot; {ex.totalQuestions} Qs &middot; Mic:{" "}
                    {ex.allowMicrophone !== false ? "On" : "Off"}
                  </p>
                </div>
              ))}
            </div>

            <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white pt-2 border-t border-slate-100">
              Learner Submissions ({attemptsList.length})
            </h4>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {attemptsList.length === 0 ? (
                <p className="text-xs text-slate-400">No student attempts recorded yet.</p>
              ) : (
                attemptsList.map((att) => (
                  <div
                    key={att.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold">
                      <span>{att.studentName}</span>
                      <span className="font-mono text-[#155EEF]">{att.score ?? 0}%</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Trigger: {att.autoSubmitReason || "completed"} &middot;{" "}
                      {att.passed ? "Passed" : "Needs Review"}
                    </p>
                    {att.audioResponses &&
                      Object.values(att.audioResponses).map((src: any, idx) => (
                        <audio key={idx} controls src={src} className="h-7 w-full mt-1" />
                      ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
