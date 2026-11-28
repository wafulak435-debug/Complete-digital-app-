import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock,
  Lock,
  Mic,
  MicOff,
  Square,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Volume2,
  Trash2,
} from "lucide-react";
import { User } from "../types";
import { secureApiFetch } from "../lib/aiClient";

interface WrittenQuestionItem {
  id: string;
  prompt: string;
  maxMarks?: number;
}

interface LoadedExam {
  id: string;
  title: string;
  courseId: string;
  courseCode?: string;
  school?: string;
  assessmentType: "cat" | "exam";
  durationMinutes: number;
  allowMicrophone: boolean;
  totalQuestions: number;
  writtenQuestions?: WrittenQuestionItem[];
  questions: {
    question: string;
    options: string[];
  }[];
}

interface SubmissionResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  autoSubmitReason: string;
  resultsReleased?: boolean;
  pendingReview?: boolean;
  message?: string;
  breakdown?: {
    question: string;
    selectedIndex: number;
    correctIndex: number;
    isCorrect: boolean;
    explanation: string;
  }[];
}

interface ExamLockdownModalProps {
  examId: string;
  currentUser: User | null;
  onClose: () => void;
  onSubmitted?: (result: SubmissionResult) => void;
}

export default function ExamLockdownModal({
  examId,
  currentUser,
  onClose,
  onSubmitted,
}: ExamLockdownModalProps) {
  const [exam, setExam] = useState<LoadedExam | null>(null);
  const [attemptId, setAttemptId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [writtenAnswers, setWrittenAnswers] = useState<Record<number, string>>({});
  const [audioResponses, setAudioResponses] = useState<Record<number, string>>({});

  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Microphone dictation & voice recording state
  const [activeDictationIdx, setActiveDictationIdx] = useState<number | null>(null);
  const [activeRecordIdx, setActiveRecordIdx] = useState<number | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const answersRef = useRef<Record<number, number>>({});
  const writtenAnswersRef = useRef<Record<number, string>>({});
  const audioResponsesRef = useRef<Record<number, string>>({});
  const attemptIdRef = useRef<string>("");
  const submittedRef = useRef<boolean>(false);
  const micPromptGuardRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecRef = useRef<any>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    writtenAnswersRef.current = writtenAnswers;
  }, [writtenAnswers]);

  useEffect(() => {
    audioResponsesRef.current = audioResponses;
  }, [audioResponses]);

  const cleanupMicrophone = useCallback(() => {
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // Ignore cleanup errors
      }
      speechRecRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore cleanup errors
      }
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setActiveDictationIdx(null);
    setActiveRecordIdx(null);
  }, []);

  const performSubmit = useCallback(
    async (reason: "completed" | "timer_expired" | "tab_or_exit") => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setIsSubmitting(true);
      cleanupMicrophone();

      try {
        const res = await secureApiFetch(`/api/exams/${encodeURIComponent(examId)}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            attemptId: attemptIdRef.current || undefined,
            answers: answersRef.current,
            writtenAnswers: writtenAnswersRef.current,
            audioResponses: audioResponsesRef.current,
            autoSubmitReason: reason,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          const finalRes: SubmissionResult = {
            score: data.score ?? 0,
            correctCount: data.correctCount ?? 0,
            totalQuestions: data.totalQuestions ?? 0,
            passed: Boolean(data.passed),
            autoSubmitReason: data.autoSubmitReason || reason,
            resultsReleased: data.resultsReleased,
            pendingReview: data.pendingReview,
            message: data.message,
            breakdown: data.breakdown,
          };
          setResult(finalRes);
          window.dispatchEvent(
            new CustomEvent("ZION_EXAM_LOCK_ACTIVE", { detail: { locked: false, examId } })
          );
          onSubmitted?.(finalRes);
        } else {
          setStatusBanner(data.error || "Assessment recorded with automatic lockdown submission.");
          setResult({
            score: 0,
            correctCount: 0,
            totalQuestions: 0,
            passed: false,
            autoSubmitReason: reason,
            message: data.error || "Submitted automatically under exam lockdown.",
          });
        }
      } catch {
        setStatusBanner("Network interruption during automatic submission.");
      } finally {
        setIsSubmitting(false);
        window.dispatchEvent(
          new CustomEvent("ZION_EXAM_LOCK_ACTIVE", { detail: { locked: false, examId } })
        );
      }
    },
    [examId, cleanupMicrophone, onSubmitted]
  );

  // Load exam definition & start server-timed attempt
  useEffect(() => {
    let mounted = true;
    submittedRef.current = false;

    const initExam = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const defRes = await secureApiFetch(`/api/exams/${encodeURIComponent(examId)}`);
        const defData = await defRes.json().catch(() => ({}));
        if (!defRes.ok || !defData.success || !defData.exam) {
          throw new Error(defData.error || "Could not load this CAT/Exam.");
        }

        const loaded: LoadedExam = defData.exam;
        const startRes = await secureApiFetch(`/api/exams/${encodeURIComponent(examId)}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentEmail: currentUser?.email,
            studentName: currentUser?.name,
          }),
        });
        const startData = await startRes.json().catch(() => ({}));
        if (!startRes.ok || !startData.success) {
          throw new Error(startData.error || "Could not open secure exam attempt.");
        }

        if (!mounted) return;
        setExam(loaded);
        const attId = startData.attempt?.id || "";
        attemptIdRef.current = attId;
        setAttemptId(attId);
        const secs = Math.max(60, Number(loaded.durationMinutes || 30) * 60);
        setSecondsLeft(secs);

        window.dispatchEvent(
          new CustomEvent("ZION_EXAM_LOCK_ACTIVE", {
            detail: {
              locked: true,
              examId,
              onForceSubmit: () => performSubmit("tab_or_exit"),
            },
          })
        );
      } catch (err: any) {
        if (!mounted) return;
        setLoadError(err?.message || "Failed to initialize secure assessment portal.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initExam();

    return () => {
      mounted = false;
      cleanupMicrophone();
      window.dispatchEvent(
        new CustomEvent("ZION_EXAM_LOCK_ACTIVE", { detail: { locked: false, examId } })
      );
    };
  }, [examId, currentUser?.email, currentUser?.name, cleanupMicrophone, performSubmit]);

  // Live countdown timer — auto-submits at 00:00
  useEffect(() => {
    if (!exam || result || loading || loadError || secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void performSubmit("timer_expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [exam, result, loading, loadError, secondsLeft, performSubmit]);

  // Strict Anti-Exit & Tab-Switch Auto-Submission Listeners
  useEffect(() => {
    if (!exam || result || loading || loadError) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !submittedRef.current && !micPromptGuardRef.current) {
        setStatusBanner("You left the exam screen. Your CAT/Exam was automatically submitted.");
        void performSubmit("tab_or_exit");
      }
    };

    const handleWindowBlur = () => {
      if (!submittedRef.current && !micPromptGuardRef.current) {
        setStatusBanner("Focus left the exam window. Your CAT/Exam was automatically submitted.");
        void performSubmit("tab_or_exit");
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) {
        void performSubmit("tab_or_exit");
        e.preventDefault();
        e.returnValue = "";
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [exam, result, loading, loadError, performSubmit]);

  const handleToggleDictation = (qIndex: number) => {
    setMicError(null);
    if (!exam?.allowMicrophone) return;

    if (activeDictationIdx === qIndex) {
      if (speechRecRef.current) {
        try {
          speechRecRef.current.stop();
        } catch {
          // Ignore
        }
      }
      setActiveDictationIdx(null);
      return;
    }

    const Speech =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Speech) {
      setMicError("Voice dictation is not supported in this browser. Use Audio Recording or type your answer.");
      return;
    }

    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // Ignore
      }
    }

    micPromptGuardRef.current = true;
    window.setTimeout(() => {
      micPromptGuardRef.current = false;
    }, 4500);

    const rec = new Speech();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (event: any) => {
      let spoken = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        spoken += event.results[i][0].transcript + " ";
      }
      const trimmed = spoken.trim();
      if (trimmed) {
        setWrittenAnswers((prev) => ({
          ...prev,
          [qIndex]: prev[qIndex] ? `${prev[qIndex]} ${trimmed}` : trimmed,
        }));
      }
    };
    rec.onerror = () => {
      setMicError("Microphone permission denied or unavailable.");
      setActiveDictationIdx(null);
    };
    rec.onend = () => {
      setActiveDictationIdx(null);
    };

    speechRecRef.current = rec;
    setActiveDictationIdx(qIndex);
    try {
      rec.start();
    } catch {
      setMicError("Unable to start microphone dictation.");
      setActiveDictationIdx(null);
    }
  };

  const handleToggleAudioRecord = async (qIndex: number) => {
    setMicError(null);
    if (!exam?.allowMicrophone) return;

    if (activeRecordIdx === qIndex) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setActiveRecordIdx(null);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError("Audio recording is not supported on this device.");
      return;
    }

    try {
      micPromptGuardRef.current = true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      window.setTimeout(() => {
        micPromptGuardRef.current = false;
      }, 1500);

      mediaStreamRef.current = stream;
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = typeof reader.result === "string" ? reader.result : "";
          if (base64) {
            setAudioResponses((prev) => ({ ...prev, [qIndex]: base64 }));
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        setActiveRecordIdx(null);
      };

      mediaRecorderRef.current = recorder;
      setActiveRecordIdx(qIndex);
      recorder.start();
    } catch {
      micPromptGuardRef.current = false;
      setMicError("Microphone access denied. Check your browser microphone settings.");
      setActiveRecordIdx(null);
    }
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleRequestExit = () => {
    if (result) {
      onClose();
      return;
    }
    void performSubmit("tab_or_exit");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Secure Assessment Portal"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Lockdown Top Header */}
        <div className="bg-[#0B254D] text-white px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#F5B82E] font-bold">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>
                {exam?.assessmentType === "cat" ? "CAT LOCKDOWN PORTAL" : "EXAM LOCKDOWN PORTAL"}
              </span>
              {attemptId && <span className="text-blue-200">ID: {attemptId.slice(-6)}</span>}
            </div>
            <h3 className="font-display text-sm sm:text-base font-bold truncate mt-0.5">
              {exam?.title || "Loading Assessment..."}
            </h3>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {exam && !result && (
              <div
                className={`px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center gap-1.5 ${
                  secondsLeft <= 60
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-white/15 text-white"
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>{formatTimer(secondsLeft)}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleRequestExit}
              disabled={isSubmitting}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 cursor-pointer disabled:opacity-50"
            >
              {result ? "Close" : isSubmitting ? "Submitting..." : "Exit & Auto-Submit"}
            </button>
          </div>
        </div>

        {/* Strict Lockdown Rules Strip */}
        {!result && !loadError && !loading && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/40 px-4 py-2 text-[11px] text-amber-950 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <span>
                Zero AI allowed. Switching tabs, minimizing, exiting, or timer expiry will immediately submit your assessment.
              </span>
            </span>
            {exam?.allowMicrophone && (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300">
                <Mic className="h-3.5 w-3.5" />
                <span>Microphone Enabled</span>
              </span>
            )}
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-left">
          {statusBanner && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-950 font-medium">
              {statusBanner}
            </div>
          )}

          {micError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-800">
              {micError}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Preparing locked assessment session...
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
              <p className="text-sm font-bold text-slate-900">Unable to Open Assessment</p>
              <p className="text-xs text-slate-600">{loadError}</p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#0B254D] text-white px-4 py-2 text-xs font-bold cursor-pointer"
              >
                Return to School
              </button>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-5 text-center space-y-2">
                <CheckCircle2
                  className={`h-10 w-10 mx-auto ${
                    result.passed ? "text-emerald-600" : "text-amber-600"
                  }`}
                />
                <h4 className="font-display text-lg font-bold text-[#0B254D] dark:text-white">
                  Assessment Submitted
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Submission trigger:{" "}
                  <strong className="uppercase">
                    {result.autoSubmitReason === "timer_expired"
                      ? "Time Allocated Expired (Auto-Submitted)"
                      : result.autoSubmitReason === "tab_or_exit"
                      ? "Left Portal / Tab Switched (Auto-Submitted)"
                      : "Completed by Learner"}
                  </strong>
                </p>

                {result.resultsReleased ? (
                  <div className="pt-2">
                    <span className="inline-block rounded-xl bg-[#0B254D] text-white font-mono font-bold text-lg px-5 py-2">
                      {result.score}% ({result.correctCount}/{result.totalQuestions})
                    </span>
                    <p className="text-xs font-bold mt-2 text-emerald-700 dark:text-emerald-400">
                      {result.passed ? "Status: Passed" : "Status: Below Pass Mark (60%)"}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 pt-2">
                    {result.message ||
                      "Submitted successfully. Final marks will be released by your Tutor or Admin."}
                  </p>
                )}
              </div>

              {result.resultsReleased && result.breakdown && result.breakdown.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Question Feedback
                  </p>
                  {result.breakdown.map((b, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border p-3 text-xs space-y-1 ${
                        b.isCorrect
                          ? "border-emerald-200 bg-emerald-50/50 text-emerald-950"
                          : "border-rose-200 bg-rose-50/50 text-rose-950"
                      }`}
                    >
                      <p className="font-bold">
                        Q{i + 1}. {b.question}
                      </p>
                      <p className="text-[11px]">{b.explanation}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold text-xs px-5 py-2.5 cursor-pointer"
                >
                  Return to School Portal
                </button>
              </div>
            </div>
          ) : exam ? (
            <div className="space-y-6">
              {/* Multiple Choice Section */}
              {exam.questions.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Section A: Objective Questions ({exam.questions.length})
                  </h4>
                  {exam.questions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/60 dark:bg-slate-800/30"
                    >
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {qIdx + 1}. {q.question}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => {
                          const selected = answers[qIdx] === oIdx;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() =>
                                setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                              }
                              className={`text-left rounded-xl border px-3 py-2.5 text-xs transition cursor-pointer flex items-center gap-2 ${
                                selected
                                  ? "bg-[#155EEF] text-white border-[#155EEF] font-bold"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-[#155EEF]"
                              }`}
                            >
                              <span className="font-mono font-bold">
                                {String.fromCharCode(65 + oIdx)}.
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Written & Oral Microphone Section */}
              {(exam.writtenQuestions && exam.writtenQuestions.length > 0) ||
              exam.allowMicrophone ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Section B: Written &amp; Oral Responses
                  </h4>
                  {(exam.writtenQuestions && exam.writtenQuestions.length > 0
                    ? exam.writtenQuestions
                    : [
                        {
                          id: "oral_summary",
                          prompt:
                            "Provide any additional written or spoken explanation required by your tutor.",
                          maxMarks: 10,
                        },
                      ]
                  ).map((wq, wIdx) => (
                    <div
                      key={wq.id || wIdx}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm font-bold text-[#0B254D] dark:text-white">
                          {wIdx + 1}. {wq.prompt}
                        </p>
                        {wq.maxMarks ? (
                          <span className="text-[11px] font-mono text-slate-500">
                            {wq.maxMarks} marks
                          </span>
                        ) : null}
                      </div>

                      <textarea
                        rows={3}
                        value={writtenAnswers[wIdx] || ""}
                        onChange={(e) =>
                          setWrittenAnswers((prev) => ({
                            ...prev,
                            [wIdx]: e.target.value,
                          }))
                        }
                        placeholder="Type your response here or use the Microphone button below to dictate..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white outline-none focus:border-[#155EEF]"
                      />

                      {exam.allowMicrophone && (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleDictation(wIdx)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
                              activeDictationIdx === wIdx
                                ? "bg-rose-600 text-white border-rose-600"
                                : "bg-blue-50 text-[#155EEF] border-blue-200 hover:bg-blue-100"
                            }`}
                          >
                            {activeDictationIdx === wIdx ? (
                              <>
                                <MicOff className="h-3.5 w-3.5" />
                                <span>Stop Voice Dictation</span>
                              </>
                            ) : (
                              <>
                                <Mic className="h-3.5 w-3.5" />
                                <span>Dictate Answer (Mic)</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleAudioRecord(wIdx)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
                              activeRecordIdx === wIdx
                                ? "bg-amber-600 text-white border-amber-600"
                                : "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {activeRecordIdx === wIdx ? (
                              <>
                                <Square className="h-3.5 w-3.5" />
                                <span>Stop Recording</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3.5 w-3.5" />
                                <span>Record Audio Answer</span>
                              </>
                            )}
                          </button>

                          {audioResponses[wIdx] && (
                            <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                              <audio
                                controls
                                src={audioResponses[wIdx]}
                                className="h-8 max-w-[210px]"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setAudioResponses((prev) => {
                                    const next = { ...prev };
                                    delete next[wIdx];
                                    return next;
                                  })
                                }
                                className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                                title="Remove audio recording"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Answered {Object.keys(answers).length} of {exam.questions.length} objective items.
                </span>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => performSubmit("completed")}
                  className="rounded-xl bg-[#0B254D] hover:bg-[#155EEF] text-white font-bold text-xs px-6 py-2.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting Assessment..." : "Finish & Submit Now"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
