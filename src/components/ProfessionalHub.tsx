import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Briefcase,
  Building2,
  FileText,
  Users,
  Award,
  MapPin,
  Upload,
  CheckCircle2,
  MessageSquare,
  Plus,
  Heart,
  Search,
  Sparkles,
} from "lucide-react";
import { secureApiFetch } from "../lib/aiClient";
import {
  ProfessionalArticle,
  ProfessionalJob,
  ProfessionalOrg,
  User,
} from "../types";

interface ProfessionalProfileData {
  email: string;
  name: string;
  headline: string;
  summary: string;
  location: string;
  cvName?: string;
  cvDataUrl?: string;
  skills: { name: string; endorsedBy: string[] }[];
  experience: { role: string; org: string; period: string }[];
}

interface ProfessionalHubProps {
  currentUser: User | null;
  onLogIn: () => void;
  onStartDm?: (peerEmail: string, peerName: string) => void;
}

export default function ProfessionalHub({
  currentUser,
  onLogIn,
  onStartDm,
}: ProfessionalHubProps) {
  const [tab, setTab] = useState<"jobs" | "people" | "orgs" | "articles">("jobs");
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<ProfessionalProfileData[]>([]);
  const [jobs, setJobs] = useState<ProfessionalJob[]>([]);
  const [orgs, setOrgs] = useState<ProfessionalOrg[]>([]);
  const [articles, setArticles] = useState<ProfessionalArticle[]>([]);
  const [toast, setToast] = useState("");

  // My CV & Profile editor
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [myHeadline, setMyHeadline] = useState("");
  const [mySummary, setMySummary] = useState("");
  const [myLocation, setMyLocation] = useState("Bungoma, Kenya");
  const [mySkillsText, setMySkillsText] = useState("Leadership, Teaching, ICT, Ministry");
  const [myCvName, setMyCvName] = useState("");
  const [myCvDataUrl, setMyCvDataUrl] = useState("");
  const cvInputRef = useRef<HTMLInputElement>(null);

  // Post Job
  const [showJobForm, setShowJobForm] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobOrg, setJobOrg] = useState("");
  const [jobLoc, setJobLoc] = useState("Bungoma / Remote");
  const [jobType, setJobType] = useState("Full-Time");
  const [jobSalary, setJobSalary] = useState("KES 35,000 – 55,000");
  const [jobDesc, setJobDesc] = useState("");

  // Apply modal
  const [applyingJob, setApplyingJob] = useState<ProfessionalJob | null>(null);
  const [applyNote, setApplyNote] = useState("");

  // Org form
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSector, setOrgSector] = useState("Education & Ministry");
  const [orgLocation, setOrgLocation] = useState("Kenya");
  const [orgDesc, setOrgDesc] = useState("");

  // Article form
  const [showArtForm, setShowArtForm] = useState(false);
  const [artTitle, setArtTitle] = useState("");
  const [artCategory, setArtCategory] = useState("Leadership & Education");
  const [artBody, setArtBody] = useState("");
  const [readingArticle, setReadingArticle] = useState<ProfessionalArticle | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  const loadData = useCallback(async () => {
    try {
      const res = await secureApiFetch("/api/professional/overview");
      const data = await res.json();
      if (data.success) {
        setProfiles(data.profiles || []);
        setJobs(data.jobs || []);
        setOrgs(data.orgs || []);
        setArticles(data.articles || []);
        if (currentUser) {
          const mine = (data.profiles || []).find(
            (p: ProfessionalProfileData) => p.email.toLowerCase() === currentUser.email.toLowerCase()
          );
          if (mine) {
            setMyHeadline(mine.headline || "");
            setMySummary(mine.summary || "");
            setMyLocation(mine.location || "Kenya");
            setMySkillsText(mine.skills.map((s) => s.name).join(", "));
            setMyCvName(mine.cvName || "");
          }
        }
      }
    } catch {
      // ignore initial offline error
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_800_000) {
      notify("Please choose a CV PDF smaller than 1.8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setMyCvName(file.name);
      setMyCvDataUrl(String(reader.result || ""));
      notify(`CV attached: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    const res = await secureApiFetch("/api/professional/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: myHeadline,
        summary: mySummary,
        location: myLocation,
        skills: mySkillsText.split(",").map((s) => s.trim()).filter(Boolean),
        cvName: myCvName || undefined,
        cvDataUrl: myCvDataUrl || undefined,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setShowProfileEditor(false);
      notify("Professional CV profile updated.");
      loadData();
    } else {
      notify(data.error || "Could not update profile.");
    }
  };

  const handleEndorse = async (targetEmail: string, skillName: string) => {
    if (!currentUser) {
      onLogIn();
      return;
    }
    const res = await secureApiFetch("/api/professional/endorse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetEmail, skillName }),
    });
    const data = await res.json();
    if (data.success) {
      notify(`Endorsed ${skillName}!`);
      loadData();
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onLogIn();
      return;
    }
    const res = await secureApiFetch("/api/professional/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: jobTitle,
        orgName: jobOrg,
        location: jobLoc,
        jobType,
        salaryRange: jobSalary,
        description: jobDesc,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setShowJobForm(false);
      setJobTitle("");
      setJobOrg("");
      setJobDesc("");
      notify("Job opening published!");
      loadData();
    }
  };

  const handleApplyJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !applyingJob) {
      onLogIn();
      return;
    }
    const res = await secureApiFetch(`/api/professional/jobs/${encodeURIComponent(applyingJob.id)}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: applyNote, cvName: myCvName || undefined }),
    });
    const data = await res.json();
    if (data.success) {
      setApplyingJob(null);
      setApplyNote("");
      notify("Application submitted successfully.");
      loadData();
    } else {
      notify(data.error || "Application failed.");
    }
  };

  const q = search.trim().toLowerCase();
  const filteredJobs = jobs.filter(
    (j) =>
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.orgName.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q)
  );
  const filteredProfiles = profiles.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.headline.toLowerCase().includes(q) ||
      p.skills.some((s) => s.name.toLowerCase().includes(q))
  );
  const filteredOrgs = orgs.filter(
    (o) => !q || o.name.toLowerCase().includes(q) || o.sector.toLowerCase().includes(q)
  );
  const filteredArticles = articles.filter(
    (a) => !q || a.title.toLowerCase().includes(q) || a.authorName.toLowerCase().includes(q)
  );

  return (
    <div id="zion_professional_hub" className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 space-y-6 text-left">
      <input
        ref={cvInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleCvUpload}
      />

      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 right-5 z-50 rounded-xl bg-[#0B254D] text-white px-4 py-2.5 text-xs font-semibold shadow-xl border border-[#F5B82E]/50">
          {toast}
        </div>
      )}

      {/* Hero Header */}
      <section className="rounded-3xl bg-gradient-to-r from-[#0B254D] via-[#123A78] to-[#155EEF] text-white p-6 sm:p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F5B82E]">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Zion Professional &amp; Career Network</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Careers, Christian Organizations &amp; Scholar Portfolios
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90">
            Build your verified CV, endorse peers, apply for teaching or ministry roles, and publish leadership articles.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => (currentUser ? setShowProfileEditor((p) => !p) : onLogIn())}
            className="rounded-xl bg-[#F5B82E] hover:bg-[#E5A91E] text-[#0B254D] font-bold px-4 py-2.5 text-xs shadow-xs transition cursor-pointer"
          >
            {showProfileEditor ? "Close CV Builder" : "My CV & Portfolio"}
          </button>
          <button
            type="button"
            onClick={() => (currentUser ? setShowJobForm((p) => !p) : onLogIn())}
            className="rounded-xl border border-white/25 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 text-xs transition cursor-pointer"
          >
            + Post Job Opening
          </button>
        </div>
      </section>

      {/* CV & Profile Editor */}
      {showProfileEditor && (
        <form
          onSubmit={handleSaveProfile}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
              Edit Professional Profile &amp; Upload CV
            </h2>
            <button
              type="button"
              onClick={() => cvInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#155EEF] text-[#155EEF] px-3 py-1.5 text-xs font-semibold cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{myCvName ? `CV: ${myCvName}` : "Upload CV (PDF/DOC)"}</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              required
              value={myHeadline}
              onChange={(e) => setMyHeadline(e.target.value)}
              placeholder="Headline (e.g. Senior Mathematics Educator & Mentor)"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs"
            />
            <input
              value={myLocation}
              onChange={(e) => setMyLocation(e.target.value)}
              placeholder="Location (e.g. Bungoma, Kenya)"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs"
            />
          </div>
          <textarea
            rows={3}
            value={mySummary}
            onChange={(e) => setMySummary(e.target.value)}
            placeholder="Brief career summary, ministry calling, and qualifications..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs"
          />
          <input
            value={mySkillsText}
            onChange={(e) => setMySkillsText(e.target.value)}
            placeholder="Comma-separated skills (Leadership, CBC Curriculum, Public Speaking)"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowProfileEditor(false)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#0B254D] text-white px-5 py-2 text-xs font-bold cursor-pointer"
            >
              Save Portfolio
            </button>
          </div>
        </form>
      )}

      {/* Post Job Form */}
      {showJobForm && (
        <form
          onSubmit={handlePostJob}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3 shadow-xs"
        >
          <h2 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
            Post Job or Internship Opening
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Role title"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
            <input
              required
              value={jobOrg}
              onChange={(e) => setJobOrg(e.target.value)}
              placeholder="Organization / School name"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
            <input
              value={jobLoc}
              onChange={(e) => setJobLoc(e.target.value)}
              placeholder="Location"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            >
              <option>Full-Time</option>
              <option>Part-Time</option>
              <option>Internship</option>
              <option>Volunteer / Ministry</option>
            </select>
            <input
              value={jobSalary}
              onChange={(e) => setJobSalary(e.target.value)}
              placeholder="Compensation / Stipend range"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
            />
          </div>
          <textarea
            required
            rows={3}
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
            placeholder="Role responsibilities and requirements..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowJobForm(false)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-xl bg-[#155EEF] text-white px-5 py-2 text-xs font-bold cursor-pointer">
              Publish Job
            </button>
          </div>
        </form>
      )}

      {/* Search + Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "jobs", label: `Jobs & Internships (${jobs.length})`, icon: Briefcase },
            { id: "people", label: `Talent & CVs (${profiles.length})`, icon: Users },
            { id: "orgs", label: `Organizations (${orgs.length})`, icon: Building2 },
            { id: "articles", label: `Articles (${articles.length})`, icon: FileText },
          ].map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as any)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-[#0B254D] text-white"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-[#F5B82E]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs, skills, orgs..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-8 pr-3 text-xs outline-none focus:border-[#155EEF]"
          />
        </div>
      </div>

      {/* TAB 1: JOBS */}
      {tab === "jobs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <article
              key={job.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#155EEF]">
                      {job.jobType} · {job.salaryRange}
                    </span>
                    <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                      {job.title}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {job.orgName} · <MapPin className="inline h-3 w-3" /> {job.location}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">
                  {job.applicantsCount || 0} applicants
                </span>
                <div className="flex gap-2">
                  {onStartDm && job.postedBy && job.postedBy !== currentUser?.email?.toLowerCase() && (
                    <button
                      type="button"
                      onClick={() => onStartDm(job.postedBy, job.orgName)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Message
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={Boolean(job.appliedByMe)}
                    onClick={() => (currentUser ? setApplyingJob(job) : onLogIn())}
                    className={`rounded-xl px-4 py-1.5 text-xs font-bold cursor-pointer ${
                      job.appliedByMe
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-[#155EEF] text-white"
                    }`}
                  >
                    {job.appliedByMe ? "Applied ✓" : "Apply Now"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* TAB 2: PEOPLE & PORTFOLIOS */}
      {tab === "people" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((prof) => (
            <div
              key={prof.email}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-[#0B254D] text-[#F5B82E] font-bold flex items-center justify-center shrink-0">
                    {prof.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0B254D] dark:text-white">{prof.name}</h3>
                    <p className="text-[11px] text-[#155EEF] font-medium">{prof.headline}</p>
                    <p className="text-[11px] text-slate-400">{prof.location}</p>
                  </div>
                </div>
              </div>

              {prof.summary && (
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">{prof.summary}</p>
              )}

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Skills &amp; Endorsements
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {prof.skills.map((sk) => (
                    <button
                      key={sk.name}
                      type="button"
                      onClick={() => handleEndorse(prof.email, sk.name)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-[#155EEF] px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                      title="Click to endorse this skill"
                    >
                      <Award className="h-3 w-3 text-[#F5B82E]" />
                      <span>{sk.name}</span>
                      <span className="text-[10px] text-[#155EEF] font-bold">
                        +{sk.endorsedBy.length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {onStartDm && prof.email !== currentUser?.email?.toLowerCase() && (
                <button
                  type="button"
                  onClick={() => onStartDm(prof.email, prof.name)}
                  className="w-full rounded-xl bg-[#0B254D] text-white py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Direct Private Message</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: ORGANIZATIONS */}
      {tab === "orgs" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => (currentUser ? setShowOrgForm((p) => !p) : onLogIn())}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Organization</span>
            </button>
          </div>

          {showOrgForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await secureApiFetch("/api/professional/orgs", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: orgName,
                    sector: orgSector,
                    location: orgLocation,
                    description: orgDesc,
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  setShowOrgForm(false);
                  setOrgName("");
                  setOrgDesc("");
                  notify("Organization listed!");
                  loadData();
                }
              }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Organization name"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  value={orgSector}
                  onChange={(e) => setOrgSector(e.target.value)}
                  placeholder="Sector"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  value={orgLocation}
                  onChange={(e) => setOrgLocation(e.target.value)}
                  placeholder="Location"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
              </div>
              <textarea
                rows={2}
                value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
                placeholder="Mission and ministry focus..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
              />
              <button type="submit" className="rounded-xl bg-[#0B254D] text-white px-4 py-2 text-xs font-bold cursor-pointer">
                Save Organization
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrgs.map((org) => {
              const following = currentUser
                ? org.followers.includes(currentUser.email.toLowerCase())
                : false;
              return (
                <div
                  key={org.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#155EEF]">
                      {org.sector} · {org.location}
                    </span>
                    <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                      {org.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{org.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500">{org.followers.length} followers</span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!currentUser) return onLogIn();
                        await secureApiFetch(`/api/professional/orgs/${encodeURIComponent(org.id)}/follow`, {
                          method: "POST",
                        });
                        loadData();
                      }}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                        following
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-[#0B254D] text-white"
                      }`}
                    >
                      {following ? "Following ✓" : "Follow Organization"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ARTICLES */}
      {tab === "articles" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => (currentUser ? setShowArtForm((p) => !p) : onLogIn())}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#155EEF] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Write Leadership Article</span>
            </button>
          </div>

          {showArtForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await secureApiFetch("/api/professional/articles", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title: artTitle, category: artCategory, body: artBody }),
                });
                const data = await res.json();
                if (data.success) {
                  setShowArtForm(false);
                  setArtTitle("");
                  setArtBody("");
                  notify("Article published!");
                  loadData();
                }
              }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  value={artTitle}
                  onChange={(e) => setArtTitle(e.target.value)}
                  placeholder="Article title"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  value={artCategory}
                  onChange={(e) => setArtCategory(e.target.value)}
                  placeholder="Topic / Category"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
              </div>
              <textarea
                required
                rows={4}
                value={artBody}
                onChange={(e) => setArtBody(e.target.value)}
                placeholder="Write insights for educators, scholars, and Christian professionals..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
              />
              <button type="submit" className="rounded-xl bg-[#0B254D] text-white px-5 py-2 text-xs font-bold cursor-pointer">
                Publish Article
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArticles.map((art) => (
              <article
                key={art.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#155EEF]">
                  {art.category}
                </span>
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                  {art.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {art.summary}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500">By {art.authorName}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!currentUser) return onLogIn();
                        await secureApiFetch(`/api/professional/articles/${encodeURIComponent(art.id)}/like`, {
                          method: "POST",
                        });
                        loadData();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                      <span>{art.likes.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReadingArticle(art)}
                      className="rounded-lg bg-[#0B254D] text-white px-3 py-1 font-semibold cursor-pointer"
                    >
                      Read Full
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Apply Job Modal */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleApplyJob}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
          >
            <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
              Apply for {applyingJob.title}
            </h3>
            <p className="text-xs text-slate-500">
              {applyingJob.orgName} · {myCvName ? `Attaching CV: ${myCvName}` : "No CV attached (optional)"}
            </p>
            <textarea
              required
              rows={4}
              value={applyNote}
              onChange={(e) => setApplyNote(e.target.value)}
              placeholder="Write a brief cover note highlighting your experience..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApplyingJob(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#155EEF] text-white px-4 py-2 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Submit Application
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Article Reader Modal */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#155EEF]">
              {readingArticle.category} · By {readingArticle.authorName}
            </span>
            <h3 className="font-display text-xl font-bold text-[#0B254D] dark:text-white">
              {readingArticle.title}
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {readingArticle.body}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setReadingArticle(null)}
                className="rounded-xl bg-[#0B254D] text-white px-4 py-2 text-xs font-bold cursor-pointer"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
