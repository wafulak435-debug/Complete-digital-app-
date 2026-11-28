import React, { useState, useEffect, useCallback } from "react";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileUp,
  GraduationCap,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { User } from "../types";
import { secureApiFetch } from "../lib/aiClient";

interface CampaignRecord {
  id: string;
  title: string;
  school: string;
  requirements: string;
  status: "open" | "closed";
  createdAt: string;
}

interface UploadedDocPayload {
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

interface TutorApplicationItem {
  id: string;
  campaignId: string;
  applicantName: string;
  applicantEmail: string;
  educationLevel: string;
  yearsExperience: number;
  status: "pending" | "approved" | "denied";
  assignedCourses: string[];
  adminNotes?: string;
  createdAt: string;
}

interface TutorRecruitmentPanelProps {
  currentUser: User | null;
  onLogIn?: () => void;
}

export default function TutorRecruitmentPanel({
  currentUser,
  onLogIn,
}: TutorRecruitmentPanelProps) {
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [myApps, setMyApps] = useState<TutorApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");

  // Applicant Form State
  const [applicantName, setApplicantName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState("");
  const [educationLevel, setEducationLevel] = useState("Bachelor's Degree");
  const [yearsExperience, setYearsExperience] = useState<number>(2);
  const [preferredSchool, setPreferredSchool] = useState("both");
  const [qualificationSummary, setQualificationSummary] = useState("");

  const [cvDoc, setCvDoc] = useState<UploadedDocPayload | null>(null);
  const [nationalIdDoc, setNationalIdDoc] = useState<UploadedDocPayload | null>(null);
  const [kcseCertDoc, setKcseCertDoc] = useState<UploadedDocPayload | null>(null);
  const [collegeCertDoc, setCollegeCertDoc] = useState<UploadedDocPayload | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (currentUser?.name && !applicantName) {
      setApplicantName(currentUser.name);
    }
  }, [currentUser?.name, applicantName]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [campRes, myRes] = await Promise.all([
        fetch("/api/school/tutor-campaigns").then((r) => r.json()).catch(() => ({})),
        currentUser
          ? secureApiFetch("/api/school/my-tutor-applications").then((r) => r.json()).catch(() => ({}))
          : Promise.resolve({}),
      ]);
      const openList: CampaignRecord[] = Array.isArray(campRes?.campaigns) ? campRes.campaigns : [];
      setCampaigns(openList);
      if (openList.length > 0) {
        setSelectedCampaignId((prev) => prev || openList[0].id);
      }
      setMyApps(Array.isArray(myRes?.applications) ? myRes.applications : []);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReadDocument = (
    file: File | undefined,
    setter: React.Dispatch<React.SetStateAction<UploadedDocPayload | null>>
  ) => {
    if (!file) return;
    if (file.size > 2.5 * 1024 * 1024) {
      setFeedback({
        type: "err",
        text: `File "${file.name}" exceeds 2.5 MB limit. Please compress or upload a smaller scan.`,
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setter({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataUrl: typeof reader.result === "string" ? reader.result : "",
      });
      setFeedback(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentUser || currentUser.role === "guest") {
      onLogIn?.();
      return;
    }

    if (!selectedCampaignId || !applicantName.trim() || !qualificationSummary.trim()) {
      setFeedback({
        type: "err",
        text: "Please complete your full name, vacancy selection, and qualification summary.",
      });
      return;
    }

    if (!cvDoc || !nationalIdDoc || !kcseCertDoc || !collegeCertDoc) {
      setFeedback({
        type: "err",
        text: "All four supporting documents (CV, National ID, KCSE Certificate, and University/College Certificate) are required.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await secureApiFetch("/api/school/tutor-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaignId,
          applicantName: applicantName.trim(),
          phone: phone.trim(),
          educationLevel,
          yearsExperience: Number(yearsExperience),
          preferredSchool,
          qualificationSummary: qualificationSummary.trim(),
          cvDoc,
          nationalIdDoc,
          kcseCertDoc,
          collegeCertDoc,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setFeedback({ type: "err", text: data.error || "Could not submit application." });
        return;
      }

      setFeedback({
        type: "ok",
        text: "Application submitted. The School Admin will verify your certificates and assign courses upon approval.",
      });
      setQualificationSummary("");
      setCvDoc(null);
      setNationalIdDoc(null);
      setKcseCertDoc(null);
      setCollegeCertDoc(null);
      await loadData();
    } catch {
      setFeedback({ type: "err", text: "Network error submitting tutor application." });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  return (
    <div className="space-y-6 text-left">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#155EEF] font-bold block">
              Faculty Recruitment Portal
            </span>
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#0B254D] dark:text-white">
              Apply to Become a School Tutor
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Submit your CV, academic credentials, National ID, KCSE certificate, and university or college qualification for Admin approval.
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              campaigns.length > 0
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            {campaigns.length > 0 ? `${campaigns.length} Open Vacancy` : "Recruitment Closed"}
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Checking advertised tutor openings...</p>
        ) : campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-6 text-center space-y-2">
            <Briefcase className="h-8 w-8 text-slate-400 mx-auto" />
            <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
              Tutor Recruitment is Currently Closed
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All advertised tutor slots are currently filled or paused by the Administrator. Please check again when new vacancies are advertised.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitApplication} className="space-y-4">
            {/* Open Vacancy Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#0B254D] dark:text-slate-200">
                Select Open Tutor Advertisement
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {campaigns.map((camp) => (
                  <button
                    key={camp.id}
                    type="button"
                    onClick={() => setSelectedCampaignId(camp.id)}
                    className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                      selectedCampaignId === camp.id
                        ? "border-[#155EEF] bg-blue-50/70 dark:bg-blue-950/30"
                        : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
                    }`}
                  >
                    <p className="text-xs font-bold text-[#0B254D] dark:text-white">{camp.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 uppercase font-mono">
                      Division: {camp.school}
                    </p>
                  </button>
                ))}
              </div>
              {selectedCampaign && (
                <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 p-3 text-xs text-slate-700 dark:text-slate-300">
                  <strong className="text-[#0B254D] dark:text-white">Advertised Requirements: </strong>
                  {selectedCampaign.requirements}
                </div>
              )}
            </div>

            {!currentUser || currentUser.role === "guest" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-amber-900 font-medium">
                  Sign in with your account before submitting your tutor application and documents.
                </span>
                <button
                  type="button"
                  onClick={() => onLogIn?.()}
                  className="rounded-xl bg-[#0B254D] text-white text-xs font-bold px-4 py-2 cursor-pointer"
                >
                  Sign In to Apply
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="Full name as on National ID"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 outline-none focus:border-[#155EEF]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +254 7..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 outline-none focus:border-[#155EEF]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Highest Education Level
                    </label>
                    <select
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 outline-none focus:border-[#155EEF]"
                    >
                      <option value="Certificate">College Certificate</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Bachelor's Degree">Bachelor&apos;s Degree</option>
                      <option value="Master's Degree">Master&apos;s Degree</option>
                      <option value="PhD / Doctorate">PhD / Doctorate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Years of Teaching / Ministry Experience
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      required
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 outline-none focus:border-[#155EEF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Preferred School Division
                    </label>
                    <select
                      value={preferredSchool}
                      onChange={(e) => setPreferredSchool(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 outline-none focus:border-[#155EEF]"
                    >
                      <option value="leadership">Leadership &amp; Computing School</option>
                      <option value="bible">Bible &amp; Theology School</option>
                      <option value="both">Both Leadership &amp; Bible Schools</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Qualifications, Teaching Subjects &amp; Requirements Summary
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={qualificationSummary}
                    onChange={(e) => setQualificationSummary(e.target.value)}
                    placeholder="List your teaching subjects, degrees/diplomas, church or academic leadership experience..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 outline-none focus:border-[#155EEF]"
                  />
                </div>

                {/* Required 4 Document Uploads */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#0B254D] dark:text-slate-200">
                    Upload Required Verification Documents (PDF or Image, max 2.5 MB each)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      { label: "1. Curriculum Vitae (CV)", doc: cvDoc, setter: setCvDoc },
                      { label: "2. National ID Copy", doc: nationalIdDoc, setter: setNationalIdDoc },
                      { label: "3. KCSE Certificate", doc: kcseCertDoc, setter: setKcseCertDoc },
                      {
                        label: "4. University / College Certificate",
                        doc: collegeCertDoc,
                        setter: setCollegeCertDoc,
                      },
                    ].map((item) => (
                      <label
                        key={item.label}
                        className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 flex flex-col gap-1.5 cursor-pointer hover:border-[#155EEF]"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <FileUp className="h-3.5 w-3.5 text-[#155EEF]" />
                          <span>{item.label}</span>
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => handleReadDocument(e.target.files?.[0], item.setter)}
                          className="text-[11px] text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-[#0B254D] file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-white cursor-pointer"
                        />
                        {item.doc && (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                            Attached: {item.doc.fileName}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {feedback && (
                  <div
                    className={`rounded-xl p-3 text-xs font-medium border ${
                      feedback.type === "ok"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-bold text-xs px-5 py-2.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Uploading Application..." : "Submit Tutor Application"}
                </button>
              </>
            )}
          </form>
        )}
      </div>

      {/* Applicant's Past Applications */}
      {myApps.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-[#155EEF]" />
            <span>My Submitted Tutor Applications</span>
          </h4>
          <div className="space-y-2.5">
            {myApps.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#0B254D] dark:text-white">
                    {app.educationLevel} &middot; {app.yearsExperience} yrs experience
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                      app.status === "approved"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : app.status === "denied"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {app.status === "approved" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : app.status === "denied" ? (
                      <XCircle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    <span>{app.status}</span>
                  </span>
                </div>
                {app.assignedCourses && app.assignedCourses.length > 0 && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Assigned Courses: {app.assignedCourses.join(", ")}</span>
                  </p>
                )}
                {app.adminNotes && (
                  <p className="text-[11px] text-slate-500">Admin Note: {app.adminNotes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
