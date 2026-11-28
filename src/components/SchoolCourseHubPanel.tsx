import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Lock,
  MessageSquare,
  Mic,
  Send,
  Video,
} from "lucide-react";
import { User } from "../types";
import { secureApiFetch } from "../lib/aiClient";
import {
  exportPDF,
  exportWordDoc,
  exportSlidesDeck,
  exportSheetCsv,
} from "../lib/docExporter";
import ExamLockdownModal from "./ExamLockdownModal";

interface SchoolCourseHubPanelProps {
  currentUser: User | null;
  schoolFilter?: "leadership" | "bible" | "all";
  onLogIn?: () => void;
  onRequestEnroll?: () => void;
}

export default function SchoolCourseHubPanel({
  currentUser,
  schoolFilter = "all",
  onLogIn,
  onRequestEnroll,
}: SchoolCourseHubPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "notes" | "classes" | "assignments" | "exams"
  >("notes");
  const [notes, setNotes] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [enrolledCourseCodes, setEnrolledCourseCodes] = useState<string[]>([]);

  const [discussionInput, setDiscussionInput] = useState("");
  const [selectedDiscussionCourse, setSelectedDiscussionCourse] = useState("");
  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, string>>({});
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLearnerData = useCallback(async () => {
    if (!currentUser || currentUser.role === "guest") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [notesRes, clsRes, discRes, assgRes, exmRes, enrRes] = await Promise.all([
        secureApiFetch("/api/school/notes").then((r) => r.json()).catch(() => ({})),
        secureApiFetch("/api/school/classes").then((r) => r.json()).catch(() => ({})),
        secureApiFetch("/api/school/discussions").then((r) => r.json()).catch(() => ({})),
        secureApiFetch("/api/school/assignments").then((r) => r.json()).catch(() => ({})),
        secureApiFetch("/api/exams").then((r) => r.json()).catch(() => ({})),
        secureApiFetch("/api/enrollments").then((r) => r.json()).catch(() => ({})),
      ]);

      const enrolList = Array.isArray(enrRes?.enrollments) ? enrRes.enrollments : [];
      const activeCodes: string[] = enrolList
        .filter((e: any) => e.status !== "rejected")
        .map((e: any) => String(e.courseCode || e.courseId || ""));
      setEnrolledCourseCodes(activeCodes);
      if (activeCodes.length > 0 && !selectedDiscussionCourse) {
        setSelectedDiscussionCourse(activeCodes[0]);
      }

      const filterBySchool = (arr: any[]) =>
        schoolFilter === "all"
          ? arr
          : arr.filter((x) => !x.school || x.school === schoolFilter || x.school === "both");

      setNotes(filterBySchool(Array.isArray(notesRes?.notes) ? notesRes.notes : []));
      setClassesList(filterBySchool(Array.isArray(clsRes?.classes) ? clsRes.classes : []));
      setDiscussions(Array.isArray(discRes?.discussions) ? discRes.discussions : []);
      setAssignments(Array.isArray(assgRes?.assignments) ? assgRes.assignments : []);
      setExams(filterBySchool(Array.isArray(exmRes?.exams) ? exmRes.exams : []));
    } finally {
      setLoading(false);
    }
  }, [currentUser, schoolFilter, selectedDiscussionCourse]);

  useEffect(() => {
    loadLearnerData();
  }, [loadLearnerData]);

  const handleDownloadNote = (note: any, format?: "pdf" | "docx" | "slides" | "sheet") => {
    const targetFormat = format || note.publishFormat || "pdf";
    const title = note.title || "Course Notes";
    const content = note.content || "";
    if (targetFormat === "pdf") exportPDF(title, content);
    else if (targetFormat === "docx") exportWordDoc(title, content);
    else if (targetFormat === "slides") exportSlidesDeck(title, content);
    else exportSheetCsv(title, content);
  };

  const handlePostDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discussionInput.trim()) return;
    const targetCourse = selectedDiscussionCourse || enrolledCourseCodes[0] || "general";
    const res = await secureApiFetch("/api/school/discussions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: targetCourse,
        courseCode: targetCourse,
        message: discussionInput.trim(),
      }),
    });
    if (res.ok) {
      setDiscussionInput("");
      await loadLearnerData();
    }
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    const text = (submissionDrafts[assignmentId] || "").trim();
    if (!text) return;
    const res = await secureApiFetch(
      `/api/school/assignments/${encodeURIComponent(assignmentId)}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseText: text }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      setSubmissionDrafts((prev) => ({ ...prev, [assignmentId]: "" }));
      setNotice("Assignment response submitted to your tutor.");
      await loadLearnerData();
    } else {
      setNotice(data.error || "Could not submit assignment.");
    }
  };

  if (!currentUser || currentUser.role === "guest") {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center space-y-3">
        <Lock className="h-8 w-8 text-[#155EEF] mx-auto" />
        <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
          Sign In for Course Materials, Classes &amp; Exams
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Tutor notes, online class rooms, assignments, and timed CATs or Exams are securely locked to enrolled learners.
        </p>
        {onLogIn && (
          <button
            type="button"
            onClick={onLogIn}
            className="rounded-xl bg-[#155EEF] text-white font-bold text-xs px-5 py-2.5 cursor-pointer"
          >
            Sign In to Access Course Hub
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#155EEF] font-bold block">
              Student Academic Portal
            </span>
            <h3 className="font-display text-base sm:text-lg font-bold text-[#0B254D] dark:text-white">
              My Enrolled Courses, Notes, Classes &amp; Exams
            </h3>
          </div>

          {onRequestEnroll && (
            <button
              type="button"
              onClick={onRequestEnroll}
              className="rounded-xl bg-[#0B254D] hover:bg-[#155EEF] text-white text-xs font-bold px-3.5 py-2 cursor-pointer"
            >
              Enroll in a Course
            </button>
          )}
        </div>

        {/* Sub-navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "notes", label: `Course Notes (${notes.length})`, icon: BookOpen },
            { id: "classes", label: `Classes & Chat (${classesList.length})`, icon: Video },
            { id: "assignments", label: `Assignments (${assignments.length})`, icon: FileText },
            { id: "exams", label: `CATs & Exams (${exams.length})`, icon: ClipboardCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#155EEF] text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {notice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-medium">
            {notice}
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-slate-500">
          Loading your course records...
        </div>
      ) : (
        <>
          {/* 1. COURSE-LOCKED NOTES */}
          {activeTab === "notes" && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                    Tutor-Shared Course Notes (Enrolled Courses Only)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Notes uploaded by a tutor can only be viewed and downloaded by learners enrolled in that specific course.
                  </p>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Enrolled Courses: {enrolledCourseCodes.length}
                </span>
              </div>

              {notes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                  <p>
                    No tutor notes available for your current enrollments yet. Enroll in a course or wait for your assigned tutor to publish notes.
                  </p>
                  {onRequestEnroll && (
                    <button
                      type="button"
                      onClick={onRequestEnroll}
                      className="rounded-xl bg-[#155EEF] text-white font-bold px-4 py-2 text-xs cursor-pointer"
                    >
                      Enroll in a Course Now
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2.5 bg-slate-50/60 dark:bg-slate-800/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block rounded bg-[#0B254D] text-white text-[10px] font-mono font-bold px-2 py-0.5 uppercase">
                            {n.courseCode}
                          </span>
                          <h5 className="font-display text-sm font-bold text-[#0B254D] dark:text-white mt-1.5">
                            {n.title}
                          </h5>
                          <p className="text-[11px] text-slate-500">
                            By {n.authorName} &middot; Primary Format:{" "}
                            <strong className="uppercase">{n.publishFormat || "pdf"}</strong>
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 whitespace-pre-line">
                        {n.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadNote(n)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#155EEF] hover:bg-[#0F49C7] text-white text-[11px] font-bold px-3 py-1.5 cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download {String(n.publishFormat || "pdf").toUpperCase()}</span>
                        </button>
                        {(["pdf", "docx", "slides", "sheet"] as const)
                          .filter((f) => f !== (n.publishFormat || "pdf"))
                          .map((fmt) => (
                            <button
                              key={fmt}
                              type="button"
                              onClick={() => handleDownloadNote(n, fmt)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[10px] font-bold px-2.5 py-1.5 uppercase cursor-pointer"
                            >
                              {fmt}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. ONLINE CLASSES & LEARNER-TUTOR CHAT */}
          {activeTab === "classes" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
                <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[#155EEF]" />
                  <span>Scheduled Online Classes</span>
                </h4>
                {classesList.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No upcoming live classes posted by your tutors yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {classesList.map((cls) => (
                      <div
                        key={cls.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-xs space-y-1.5"
                      >
                        <div className="flex justify-between">
                          <span className="font-bold text-[#0B254D] dark:text-white">
                            {cls.title}
                          </span>
                          <span className="font-mono text-[10px] text-[#155EEF] font-bold">
                            {cls.courseCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Tutor: {cls.tutorName} &middot; {cls.scheduledDate} at{" "}
                          {cls.scheduledTime} ({cls.durationMinutes}m)
                        </p>
                        {cls.notes && <p className="text-[11px] text-slate-600">{cls.notes}</p>}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {cls.meetUrl && (
                            <a
                              href={cls.meetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-[#155EEF] text-white px-3 py-1.5 text-[11px] font-bold"
                            >
                              <Video className="h-3.5 w-3.5" />
                              <span>Join Google Meet</span>
                            </a>
                          )}
                          {cls.classroomUrl && (
                            <a
                              href={cls.classroomUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-[#0B254D] dark:text-white"
                            >
                              <span>Open Google Classroom</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
                <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#155EEF]" />
                  <span>Ask Your Course Tutor (No AI)</span>
                </h4>
                <form onSubmit={handlePostDiscussion} className="space-y-2 text-xs">
                  {enrolledCourseCodes.length > 0 && (
                    <select
                      value={selectedDiscussionCourse}
                      onChange={(e) => setSelectedDiscussionCourse(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    >
                      {enrolledCourseCodes.map((code) => (
                        <option key={code} value={code}>
                          Course: {code}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={discussionInput}
                      onChange={(e) => setDiscussionInput(e.target.value)}
                      placeholder="Write a question or comment to your course tutor..."
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-xl bg-[#0B254D] text-white px-3.5 py-2 font-bold cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {discussions.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs space-y-1"
                    >
                      <div className="flex justify-between">
                        <span className="font-bold text-[#0B254D] dark:text-white">
                          {d.senderName}{" "}
                          <span className="text-[10px] font-mono uppercase text-[#155EEF]">
                            ({d.senderRole})
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {d.courseCode}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{d.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. COURSE ASSIGNMENTS */}
          {activeTab === "assignments" && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
              <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                Course Assignments
              </h4>
              {assignments.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No assignments posted for your courses yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {assignments.map((a) => {
                    const mySubmission = (a.submissions || []).find(
                      (s: any) =>
                        String(s.studentEmail || "").toLowerCase() ===
                        String(currentUser.email || "").toLowerCase()
                    );
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-xs space-y-3"
                      >
                        <div className="flex flex-wrap justify-between gap-2">
                          <div>
                            <span className="font-mono text-[10px] font-bold text-[#155EEF] uppercase">
                              {a.courseCode}
                            </span>
                            <h5 className="font-bold text-sm text-[#0B254D] dark:text-white">
                              {a.title}
                            </h5>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">
                            Max: {a.maxMarks} marks {a.dueDate ? `| Due: ${a.dueDate}` : ""}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{a.instructions}</p>

                        {mySubmission ? (
                          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                            <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Submitted ({mySubmission.submittedAt?.slice(0, 10)})</span>
                            </p>
                            <p className="text-slate-700">{mySubmission.responseText}</p>
                            {mySubmission.score !== undefined && (
                              <p className="font-bold text-[#0B254D]">
                                Grade: {mySubmission.score} / {a.maxMarks}{" "}
                                {mySubmission.feedback ? `- ${mySubmission.feedback}` : ""}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              rows={3}
                              value={submissionDrafts[a.id] || ""}
                              onChange={(e) =>
                                setSubmissionDrafts((prev) => ({
                                  ...prev,
                                  [a.id]: e.target.value,
                                }))
                              }
                              placeholder="Type your assignment answer cleanly (no AI allowed)..."
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
                            />
                            <button
                              type="button"
                              onClick={() => handleSubmitAssignment(a.id)}
                              className="rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold px-4 py-2 cursor-pointer"
                            >
                              Submit Assignment
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. CATS & EXAMS PORTAL */}
          {activeTab === "exams" && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 space-y-1">
                <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#155EEF]" />
                  <span>Supervised CATs &amp; Final Exams</span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  AI assistance is disabled. Once opened, you cannot exit without submitting. Leaving the screen, switching tabs, or exceeding the allocated time submits your exam automatically. Microphone answers are supported.
                </p>
              </div>

              {exams.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No active CATs or Exams have been published yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {exams.map((ex) => (
                    <div
                      key={ex.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-[#0B254D] text-[#F5B82E] text-[10px] font-mono font-bold px-2 py-0.5 uppercase">
                          {ex.assessmentType === "cat" ? "CAT" : "FINAL EXAM"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {ex.durationMinutes} min &middot; {ex.totalQuestions} Qs
                        </span>
                      </div>

                      <h5 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                        {ex.title}
                      </h5>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <span>Course: {ex.courseCode || ex.courseId}</span>
                        {ex.allowMicrophone !== false && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <Mic className="h-3 w-3" />
                            <span>Mic Allowed</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveExamId(ex.id)}
                        className="w-full rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold text-xs py-2.5 cursor-pointer"
                      >
                        Enter Locked {ex.assessmentType === "cat" ? "CAT" : "Exam"} Portal
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeExamId && (
        <ExamLockdownModal
          examId={activeExamId}
          currentUser={currentUser}
          onClose={() => setActiveExamId(null)}
          onSubmitted={() => {
            void loadLearnerData();
          }}
        />
      )}
    </div>
  );
}
