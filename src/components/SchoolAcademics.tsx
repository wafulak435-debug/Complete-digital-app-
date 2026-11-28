import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Printer, Download, Save, CheckCheck, Plus, Loader2 } from "lucide-react";
import { api, card, input, btn, btnGhost, Field, Badge, Table } from "./schoolUi";

/* ------------------------------------------------------------------ types (mirror server/academicLogic.ts) */
export interface Year { id: string; name: string; startDate: string; endDate: string; current: boolean }
export interface TermT { id: string; yearId: string; name: string; startDate: string; endDate: string; current: boolean }
export interface ClassT { id: string; name: string; stream: string; system: "Diploma" | "Certificate" | "Degree"; classTeacherEmail: string }
export interface SubjectT { id: string; code: string; name: string; system: string }
export interface AssessmentT { id: string; classId: string; subjectId: string; termId: string; name: string; outOf: number; date: string }
interface StudentLite { id: string; admNo: string; name: string; classId?: string; status: string }
interface SheetRow { studentId: string; admNo: string; name: string; score: number | null; grade: string }
interface AttRow { studentId: string; admNo: string; name: string; status: string }
export interface Card {
  studentId: string; admNo: string; name: string; className: string; system: string; termName: string; yearName: string;
  subjects: { subjectId: string; subject: string; code: string; assessments: number; percent: number; grade: string; points: number; label: string }[];
  meanPercent: number; totalPoints: number; overallGrade: string; overallLabel: string;
  classPosition: number; classSize: number; levelPosition: number; levelSize: number;
  attendance: { present: number; absent: number; late: number; excused: number; days: number; ratePercent: number };
  comment: string;
}

type Run = (fn: () => Promise<unknown>, okMsg?: string) => Promise<boolean>;
const label = (c: Pick<ClassT, "name" | "stream">) => (c.stream ? `${c.name} ${c.stream}` : c.name);
const today = () => new Date().toISOString().slice(0, 10);

/** Spreadsheet-safe CSV: quotes cells and neutralises formula injection (=, +, -, @). */
function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    let t = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(t) && Number.isNaN(Number(t))) t = "'" + t;
    return `"${t.replace(/"/g, '""')}"`;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ printable report card */
export function ReportCardView({ card: c, institutionName }: { card: Card; institutionName: string }) {
  return (
    <div className="print-area rounded-2xl border border-border-main bg-bg-surface p-4 text-left sm:p-6">
      <div className="border-b-2 border-accent pb-3 text-center">
        <div className="text-lg font-bold text-text-primary sm:text-xl">{institutionName}</div>
        <div className="text-xs font-semibold uppercase tracking-widest text-accent">Student report card · {c.system}</div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-text-secondary">Name</dt><dd className="font-semibold text-text-primary break-words">{c.name}</dd></div>
        <div><dt className="text-xs text-text-secondary">Adm no.</dt><dd className="font-mono text-text-primary">{c.admNo}</dd></div>
        <div><dt className="text-xs text-text-secondary">Class</dt><dd className="text-text-primary">{c.className}</dd></div>
        <div><dt className="text-xs text-text-secondary">Term</dt><dd className="text-text-primary">{c.termName} {c.yearName}</dd></div>
      </dl>
      <div className="mt-4">
        <Table head={["Subject", "Assessments", "Score %", "Grade", "Points", "Remark"]} empty="No results recorded for this term."
          rows={c.subjects.map((s) => [s.subject, s.assessments, s.percent, <b key="g">{s.grade}</b>, s.points, s.label])} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Mean score", `${c.meanPercent}%`], ["Overall grade", `${c.overallGrade}${c.overallLabel ? " · " + c.overallLabel : ""}`],
          ["Total points", String(c.totalPoints)], ["Attendance", c.attendance.days ? `${c.attendance.ratePercent}% (${c.attendance.absent} absent)` : "Not recorded"],
          ["Position in class", c.classPosition ? `${c.classPosition} of ${c.classSize}` : "-"],
          ["Position in level", c.levelPosition ? `${c.levelPosition} of ${c.levelSize}` : "-"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-bg-muted p-2.5"><div className="text-[11px] uppercase tracking-wide text-text-secondary">{k}</div><div className="text-sm font-bold text-text-primary break-words">{v}</div></div>
        ))}
      </div>
      <p className="mt-4 rounded-xl border border-border-main p-3 text-sm text-text-primary"><span className="font-semibold">Comment: </span>{c.comment}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ student / parent results */
export function MyResults({ students, childIds, terms, classes: _classes, institutions }: {
  students: (StudentLite & { institutionId?: string })[]; childIds: string[]; terms: (TermT & { institutionId?: string })[]; classes: ClassT[]; institutions: { id: string; name: string }[];
}) {
  const list = (students as (StudentLite & { institutionId?: string })[]).filter((s) => s.classId);
  const [sid, setSid] = useState("");
  const [tid, setTid] = useState("");
  const [data, setData] = useState<{ card: Card; institution: { name: string } } | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const student = list.find((s) => s.id === sid) || list[0];
  const termOptions = (terms as (TermT & { institutionId?: string })[]).filter(
    (t) => !student?.institutionId || t.institutionId === student.institutionId
  );

  useEffect(() => { if (!sid && list[0]) setSid(list[0].id); }, [list, sid]);
  useEffect(() => {
    const cur = termOptions.find((t) => t.current) || termOptions[termOptions.length - 1];
    setTid((x) => (termOptions.some((t) => t.id === x) ? x : cur?.id || ""));
  }, [student?.id, termOptions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!student || !tid) { setData(null); return; }
    let live = true;
    setBusy(true); setErr("");
    api<{ card: Card; institution: { name: string } }>(`/my/report?studentId=${encodeURIComponent(student.id)}&termId=${encodeURIComponent(tid)}`)
      .then((d) => live && setData(d))
      .catch((e) => { if (live) { setData(null); setErr(e.message); } })
      .finally(() => live && setBusy(false));
    return () => { live = false; };
  }, [student?.id, tid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (list.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 no-print">
        <Field label={childIds.length ? "Student / child" : "Student"}>
          <select className={input} value={student?.id} onChange={(e) => setSid(e.target.value)}>
            {list.map((s) => <option key={s.id} value={s.id}>{s.name}{childIds.includes(s.id) ? " (my child)" : ""}</option>)}
          </select>
        </Field>
        <Field label="Term">
          <select className={input} value={tid} onChange={(e) => setTid(e.target.value)}>
            {termOptions.length === 0 && <option value="">No terms yet</option>}
            {termOptions.map((t) => <option key={t.id} value={t.id}>{t.name}{t.current ? " (current)" : ""}</option>)}
          </select>
        </Field>
        {data && <button type="button" className={btnGhost} onClick={() => window.print()}><Printer className="h-3.5 w-3.5" />Print / Save PDF</button>}
      </div>
      {busy && <p className="flex items-center gap-2 text-sm text-text-secondary"><Loader2 className="h-4 w-4 animate-spin" />Loading results…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      {data && <ReportCardView card={data.card} institutionName={data.institution?.name || institutions[0]?.name || "School"} />}
    </section>
  );
}

/* ------------------------------------------------------------------ staff side */
type Section = "setup" | "marks" | "attendance" | "reports";

export default function SchoolAcademics({ instId, instName, canManage, students, run, onStudentsChanged }: {
  instId: string; instName: string; canManage: boolean; students: StudentLite[]; run: Run; onStudentsChanged: () => void;
}) {
  const [section, setSection] = useState<Section>(canManage ? "setup" : "marks");
  const [years, setYears] = useState<Year[]>([]);
  const [terms, setTerms] = useState<TermT[]>([]);
  const [classes, setClasses] = useState<ClassT[]>([]);
  const [subjects, setSubjects] = useState<SubjectT[]>([]);
  const [assessments, setAssessments] = useState<AssessmentT[]>([]);
  const [serverStudents, setServerStudents] = useState<StudentLite[]>([]);

  const load = useCallback(async () => {
    await run(async () => {
      const d = await api<{
        years: Year[];
        terms: TermT[];
        classes: ClassT[];
        subjects: SubjectT[];
        assessments: AssessmentT[];
        students?: StudentLite[];
      }>(`/institutions/${instId}/academics`);
      setYears(d.years); setTerms(d.terms); setClasses(d.classes); setSubjects(d.subjects); setAssessments(d.assessments);
      if (Array.isArray(d.students)) setServerStudents(d.students);
    });
  }, [instId, run]);
  useEffect(() => { load(); }, [load]);

  const effectiveStudents = useMemo(() => {
    const map = new Map<string, StudentLite>();
    for (const s of students) map.set(s.id, s);
    for (const s of serverStudents) map.set(s.id, s);
    return Array.from(map.values());
  }, [students, serverStudents]);

  const handleStudentsUpdated = useCallback(() => {
    load();
    onStudentsChanged();
  }, [load, onStudentsChanged]);

  const sections: { id: Section; label: string; show: boolean }[] = [
    { id: "setup", label: "Setup", show: canManage },
    { id: "marks", label: "Marks", show: true },
    { id: "attendance", label: "Attendance", show: true },
    { id: "reports", label: "Report cards", show: true },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto no-print">
        {sections.filter((x) => x.show).map((x) => (
          <button type="button" key={x.id} onClick={() => setSection(x.id)} className={`shrink-0 rounded-xl border px-3.5 py-2 text-sm font-semibold cursor-pointer ${section === x.id ? "border-accent bg-accent-soft text-accent" : "border-border-main text-text-secondary hover:bg-bg-muted"}`}>{x.label}</button>
        ))}
      </div>
      {section === "setup" && canManage && <Setup instId={instId} years={years} terms={terms} classes={classes} subjects={subjects} students={effectiveStudents} run={run} reload={load} onStudentsChanged={handleStudentsUpdated} />}
      {section === "marks" && <Marks instId={instId} terms={terms} classes={classes} subjects={subjects} assessments={assessments} run={run} reload={load} />}
      {section === "attendance" && <Attendance classes={classes} run={run} />}
      {section === "reports" && <Reports instName={instName} terms={terms} classes={classes} run={run} />}
    </div>
  );
}

function Setup({ instId, years, terms, classes, subjects, students, run, reload, onStudentsChanged }: {
  instId: string; years: Year[]; terms: TermT[]; classes: ClassT[]; subjects: SubjectT[]; students: StudentLite[]; run: Run; reload: () => void; onStudentsChanged: () => void;
}) {
  const [y, setY] = useState({ name: "", startDate: "", endDate: "" });
  const [t, setT] = useState({ yearId: "", name: "", startDate: "", endDate: "" });
  const [c, setC] = useState({ name: "", stream: "", system: "Diploma", classTeacherEmail: "" });
  const [sub, setSub] = useState({ name: "", code: "", system: "both" });
  const [stu, setStu] = useState({ name: "", admNo: "", studentEmail: "", classId: "" });
  const yearName = (id: string) => years.find((x) => x.id === id)?.name || "-";

  return (
    <div className="space-y-5">
      <section className={card}>
        <h3 className="mb-3 text-base font-bold text-text-primary">Academic years & terms</h3>
        <Table head={["Year", "Dates", ""]} empty="No academic year yet."
          rows={years.map((x) => [x.name, `${x.startDate} → ${x.endDate}`, x.current ? <Badge key="c" tone="good">current</Badge> : <button type="button" key="b" className={btnGhost} onClick={async () => { if (await run(() => api(`/years/${x.id}/current`, "PUT"))) reload(); }}>Make current</button>])} />
        <form className="mt-3 grid gap-3 sm:grid-cols-4" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api(`/institutions/${instId}/years`, "POST", y), "Academic year added.")) { setY({ name: "", startDate: "", endDate: "" }); reload(); } }}>
          <Field label="Year name"><input className={input} placeholder="2027" value={y.name} onChange={(e) => setY({ ...y, name: e.target.value })} required /></Field>
          <Field label="Starts"><input type="date" className={input} value={y.startDate} onChange={(e) => setY({ ...y, startDate: e.target.value })} required /></Field>
          <Field label="Ends"><input type="date" className={input} value={y.endDate} onChange={(e) => setY({ ...y, endDate: e.target.value })} required /></Field>
          <div className="flex items-end"><button type="submit" className={btn}><Plus className="h-4 w-4" />Add year</button></div>
        </form>
        <div className="mt-5">
          <Table head={["Term", "Year", "Dates", ""]} empty="No terms yet."
            rows={terms.map((x) => [x.name, yearName(x.yearId), `${x.startDate} → ${x.endDate}`, x.current ? <Badge key="c" tone="good">current</Badge> : <button type="button" key="b" className={btnGhost} onClick={async () => { if (await run(() => api(`/terms/${x.id}/current`, "PUT"))) reload(); }}>Make current</button>])} />
        </div>
        <form className="mt-3 grid gap-3 sm:grid-cols-5" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api(`/institutions/${instId}/terms`, "POST", t), "Term added.")) { setT({ ...t, name: "", startDate: "", endDate: "" }); reload(); } }}>
          <Field label="Year"><select className={input} value={t.yearId} onChange={(e) => setT({ ...t, yearId: e.target.value })} required><option value="">Choose…</option>{years.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Semester / Term"><input className={input} placeholder="Semester 1" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} required /></Field>
          <Field label="Starts"><input type="date" className={input} value={t.startDate} onChange={(e) => setT({ ...t, startDate: e.target.value })} required /></Field>
          <Field label="Ends"><input type="date" className={input} value={t.endDate} onChange={(e) => setT({ ...t, endDate: e.target.value })} required /></Field>
          <div className="flex items-end"><button type="submit" className={btn}><Plus className="h-4 w-4" />Add semester</button></div>
        </form>
      </section>

      <section className={card}>
        <h3 className="mb-3 text-base font-bold text-text-primary">Programs & Cohorts</h3>
        <Table head={["Program", "Credential", "Faculty Lead", "Enrolled Students"]} empty="No programs yet."
          rows={classes.map((x) => [label(x), <Badge key="s" tone="info">{x.system}</Badge>, x.classTeacherEmail || "-", students.filter((s) => s.classId === x.id).length])} />
        <form className="mt-3 grid gap-3 sm:grid-cols-5" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api(`/institutions/${instId}/classes`, "POST", c), "Program added.")) { setC({ ...c, name: "", stream: "", classTeacherEmail: "" }); reload(); } }}>
          <Field label="Program / Cohort"><input className={input} placeholder="Year 1 Theology / Leadership Cohort" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} required /></Field>
          <Field label="Major / Stream (optional)"><input className={input} placeholder="Evangelism" value={c.stream} onChange={(e) => setC({ ...c, stream: e.target.value })} /></Field>
          <Field label="Credential"><select className={input} value={c.system} onChange={(e) => setC({ ...c, system: e.target.value })}><option value="Diploma">Diploma</option><option value="Certificate">Certificate</option><option value="Degree">Degree</option></select></Field>
          <Field label="Faculty Lead email"><input type="email" className={input} value={c.classTeacherEmail} onChange={(e) => setC({ ...c, classTeacherEmail: e.target.value })} /></Field>
          <div className="flex items-end"><button type="submit" className={btn}><Plus className="h-4 w-4" />Add program</button></div>
        </form>
      </section>

      <section className={card}>
        <h3 className="mb-3 text-base font-bold text-text-primary">Seminary Units</h3>
        <Table head={["Code", "Unit Name", "Level"]} empty="No units yet." rows={subjects.map((x) => [<Badge key="c" tone="info">{x.code}</Badge>, x.name, x.system])} />
        <form className="mt-3 grid gap-3 sm:grid-cols-4" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api(`/institutions/${instId}/subjects`, "POST", sub), "Unit added.")) { setSub({ ...sub, name: "", code: "" }); reload(); } }}>
          <Field label="Seminary Unit"><input className={input} value={sub.name} onChange={(e) => setSub({ ...sub, name: e.target.value })} required /></Field>
          <Field label="Unit Code (optional)"><input className={input} value={sub.code} onChange={(e) => setSub({ ...sub, code: e.target.value })} /></Field>
          <Field label="Program Level"><select className={input} value={sub.system} onChange={(e) => setSub({ ...sub, system: e.target.value })}><option value="both">All Programs</option><option value="Diploma">Diploma only</option><option value="Certificate">Certificate only</option></select></Field>
          <div className="flex items-end"><button type="submit" className={btn}><Plus className="h-4 w-4" />Add unit</button></div>
        </form>
      </section>

      <section className={card}>
        <h3 className="mb-3 text-base font-bold text-text-primary">Place students in classes</h3>
        <Table head={["Adm no.", "Name", "Class"]} empty="No students admitted yet."
          rows={students.filter((s) => s.status === "active" || s.status === "deferred").map((s) => [
            <span key="a" className="font-mono text-xs">{s.admNo}</span>, s.name,
            <select key="c" className={`${input} !w-auto !py-1`} value={s.classId || ""} onChange={async (e) => { if (await run(() => api(`/students/${s.id}/class`, "PUT", { classId: e.target.value }), "Class updated.")) onStudentsChanged(); }}>
              <option value="">Not placed</option>{classes.map((x) => <option key={x.id} value={x.id}>{label(x)}</option>)}
            </select>])} />
        <form
          className="mt-3 grid gap-3 sm:grid-cols-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(() => api(`/institutions/${instId}/students`, "POST", stu), "Student added.")) {
              setStu({ name: "", admNo: "", studentEmail: "", classId: stu.classId });
              onStudentsChanged();
            }
          }}
        >
          <Field label="Student name"><input className={input} placeholder="e.g. Faith Wanjiku" value={stu.name} onChange={(e) => setStu({ ...stu, name: e.target.value })} required /></Field>
          <Field label="Adm no. (optional)"><input className={input} placeholder="ZD-2026-101" value={stu.admNo} onChange={(e) => setStu({ ...stu, admNo: e.target.value })} /></Field>
          <Field label="Student / Parent email"><input type="email" className={input} placeholder="student@domain.com" value={stu.studentEmail} onChange={(e) => setStu({ ...stu, studentEmail: e.target.value })} /></Field>
          <Field label="Class">
            <select className={input} value={stu.classId} onChange={(e) => setStu({ ...stu, classId: e.target.value })}>
              <option value="">Not placed</option>
              {classes.map((x) => <option key={x.id} value={x.id}>{label(x)}</option>)}
            </select>
          </Field>
          <div className="flex items-end"><button type="submit" className={btn}><Plus className="h-4 w-4" />Add student</button></div>
        </form>
      </section>
    </div>
  );
}

function ClassTermPickers({ classes, terms, cls, setCls, term, setTerm, showTerm = true }: {
  classes: ClassT[]; terms: TermT[]; cls: string; setCls: (v: string) => void; term: string; setTerm: (v: string) => void; showTerm?: boolean;
}) {
  useEffect(() => { if (!cls && classes[0]) setCls(classes[0].id); }, [classes, cls, setCls]);
  useEffect(() => { if (showTerm && !term && terms.length) setTerm((terms.find((t) => t.current) || terms[0]).id); }, [terms, term, setTerm, showTerm]);
  return (
    <>
      <Field label="Class"><select className={input} value={cls} onChange={(e) => setCls(e.target.value)}>{classes.length === 0 && <option value="">No classes yet</option>}{classes.map((c) => <option key={c.id} value={c.id}>{label(c)} ({c.system})</option>)}</select></Field>
      {showTerm && <Field label="Term"><select className={input} value={term} onChange={(e) => setTerm(e.target.value)}>{terms.length === 0 && <option value="">No terms yet</option>}{terms.map((t) => <option key={t.id} value={t.id}>{t.name}{t.current ? " (current)" : ""}</option>)}</select></Field>}
    </>
  );
}

function Marks({ instId, terms, classes, subjects, assessments, run, reload }: {
  instId: string; terms: TermT[]; classes: ClassT[]; subjects: SubjectT[]; assessments: AssessmentT[]; run: Run; reload: () => void;
}) {
  const [cls, setCls] = useState("");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState("");
  const [sheet, setSheet] = useState<{ assessment: AssessmentT; rows: SheetRow[] } | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ subjectId: "", name: "", outOf: "100", date: today() });
  const [saving, setSaving] = useState(false);

  const activeClass = classes.find((c) => c.id === cls);
  const filteredSubjects = useMemo(() => {
    if (!activeClass) return subjects;
    return subjects.filter((s) => s.system === "both" || s.system === activeClass.system);
  }, [subjects, activeClass]);

  const classAssessments = useMemo(
    () => assessments.filter((a) => (!cls || a.classId === cls) && (!term || a.termId === term)),
    [assessments, cls, term]
  );

  const openSheet = useCallback(
    async (assessmentId: string) => {
      setOpen(assessmentId);
      await run(async () => {
        const d = await api<{ assessment: AssessmentT; rows: SheetRow[] }>(
          `/assessments/${encodeURIComponent(assessmentId)}/sheet`
        );
        setSheet(d);
        const nextScores: Record<string, string> = {};
        for (const r of d.rows) {
          nextScores[r.studentId] = r.score === null || r.score === undefined ? "" : String(r.score);
        }
        setScores(nextScores);
      });
    },
    [run]
  );

  const saveScores = async () => {
    if (!sheet) return;
    setSaving(true);
    try {
      const payload = sheet.rows.map((r) => {
        const raw = (scores[r.studentId] ?? "").trim();
        return {
          studentId: r.studentId,
          score: raw === "" ? null : Number(raw),
        };
      });
      const ok = await run(
        () => api(`/assessments/${encodeURIComponent(sheet.assessment.id)}/scores`, "PUT", { scores: payload }),
        "Marks saved and grades updated."
      );
      if (ok) {
        await openSheet(sheet.assessment.id);
      }
    } finally {
      setSaving(false);
    }
  };

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name || id;

  return (
    <div className="space-y-5">
      <section className={card}>
        <div className="grid gap-3 sm:grid-cols-2">
          <ClassTermPickers classes={classes} terms={terms} cls={cls} setCls={setCls} term={term} setTerm={setTerm} />
        </div>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!cls || !term) return;
            const created = await run(async () => {
              const res = await api<{ assessment: AssessmentT }>(`/institutions/${instId}/assessments`, "POST", {
                classId: cls,
                termId: term,
                subjectId: form.subjectId,
                name: form.name,
                outOf: Number(form.outOf) || 100,
                date: form.date || today(),
              });
              setForm((prev) => ({ ...prev, name: "" }));
              reload();
              if (res?.assessment?.id) {
                await openSheet(res.assessment.id);
              }
            }, "Assessment created.");
            void created;
          }}
        >
          <Field label="Subject">
            <select
              className={input}
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              required
            >
              <option value="">Choose…</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assessment name">
            <input
              className={input}
              placeholder="Opener / Mid-Term / End Term"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Out of">
            <input
              type="number"
              min={1}
              max={1000}
              className={input}
              value={form.outOf}
              onChange={(e) => setForm({ ...form, outOf: e.target.value })}
              required
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              className={input}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </Field>
          <div className="flex items-end">
            <button type="submit" className={btn} disabled={!cls || !term}>
              <Plus className="h-4 w-4" />Add assessment
            </button>
          </div>
        </form>

        <div className="mt-4">
          <Table
            head={["Date", "Subject", "Assessment", "Out of", ""]}
            empty="No assessments created for this class and term yet."
            rows={classAssessments.map((a) => [
              <span key="d" className="font-mono text-xs">{a.date}</span>,
              subjectName(a.subjectId),
              a.name,
              <span key="o" className="tabular-nums">{a.outOf}</span>,
              <button
                type="button"
                key="b"
                className={open === a.id ? btn : btnGhost}
                onClick={() => openSheet(a.id)}
              >
                {open === a.id ? "Editing sheet" : "Open mark sheet"}
              </button>,
            ])}
          />
        </div>
      </section>

      {sheet && (
        <section className={card}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Mark sheet · {subjectName(sheet.assessment.subjectId)} — {sheet.assessment.name}
              </h3>
              <p className="text-xs text-text-secondary">
                Enter scores out of {sheet.assessment.outOf} (leave blank if absent/ungraded)
              </p>
            </div>
            <button type="button" className={btn} disabled={saving} onClick={saveScores}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save marks
            </button>
          </div>

          <Table
            head={["Adm no.", "Student", `Score (/ ${sheet.assessment.outOf})`, "Grade"]}
            empty="No active students placed in this class yet."
            rows={sheet.rows.map((r) => [
              <span key="adm" className="font-mono text-xs">{r.admNo}</span>,
              r.name,
              <input
                key="sc"
                type="number"
                min={0}
                max={sheet.assessment.outOf}
                step="0.5"
                className={`${input} !w-28 tabular-nums`}
                value={scores[r.studentId] ?? ""}
                onChange={(e) =>
                  setScores((prev) => ({ ...prev, [r.studentId]: e.target.value }))
                }
              />,
              <Badge key="g" tone={r.grade === "-" ? "neutral" : "info"}>{r.grade}</Badge>,
            ])}
          />
        </section>
      )}
    </div>
  );
}

function Attendance({ classes, run }: { classes: ClassT[]; run: Run }) {
  const [cls, setCls] = useState("");
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState<AttRow[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadAttendance = useCallback(async () => {
    if (!cls || !date) return;
    await run(async () => {
      const d = await api<{ date: string; rows: AttRow[] }>(
        `/classes/${encodeURIComponent(cls)}/attendance?date=${encodeURIComponent(date)}`
      );
      setRows(d.rows);
      const next: Record<string, string> = {};
      for (const r of d.rows) next[r.studentId] = r.status || "present";
      setStatuses(next);
    });
  }, [cls, date, run]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const markAllPresent = () => {
    const next: Record<string, string> = {};
    for (const r of rows) next[r.studentId] = "present";
    setStatuses(next);
  };

  const saveAttendance = async () => {
    if (!cls || !date) return;
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        studentId: r.studentId,
        status: statuses[r.studentId] || "present",
      }));
      await run(
        () => api(`/classes/${encodeURIComponent(cls)}/attendance`, "PUT", { date, rows: payload }),
        "Attendance register saved."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={card}>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div className="grid gap-3 sm:grid-cols-2 flex-1 min-w-[240px]">
          <ClassTermPickers classes={classes} terms={[]} cls={cls} setCls={setCls} term="" setTerm={() => {}} showTerm={false} />
          <Field label="Date">
            <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={markAllPresent} disabled={rows.length === 0}>
            <CheckCheck className="h-4 w-4" />Mark all present
          </button>
          <button type="button" className={btn} onClick={saveAttendance} disabled={saving || rows.length === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save attendance
          </button>
        </div>
      </div>

      <Table
        head={["Adm no.", "Student", "Status"]}
        empty="No active students placed in this class yet."
        rows={rows.map((r) => [
          <span key="a" className="font-mono text-xs">{r.admNo}</span>,
          r.name,
          <select
            key="s"
            className={`${input} !w-auto !py-1.5`}
            value={statuses[r.studentId] || "present"}
            onChange={(e) =>
              setStatuses((prev) => ({ ...prev, [r.studentId]: e.target.value }))
            }
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
          </select>,
        ])}
      />
    </section>
  );
}

function Reports({ instName, terms, classes, run }: {
  instName: string; terms: TermT[]; classes: ClassT[]; run: Run;
}) {
  const [cls, setCls] = useState("");
  const [term, setTerm] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [resolvedInstName, setResolvedInstName] = useState(instName);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const loadReports = useCallback(async () => {
    if (!cls || !term) return;
    setBusy(true);
    try {
      await run(async () => {
        const d = await api<{ cards: Card[]; institution?: { name: string } }>(
          `/classes/${encodeURIComponent(cls)}/reports?termId=${encodeURIComponent(term)}`
        );
        setCards(d.cards || []);
        if (d.institution?.name) setResolvedInstName(d.institution.name);
      });
    } finally {
      setBusy(false);
    }
  }, [cls, term, run]);

  useEffect(() => {
    if (cls && term) loadReports();
  }, [cls, term, loadReports]);

  const visibleCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.admNo.toLowerCase().includes(q)
    );
  }, [cards, search]);

  const exportCsv = () => {
    if (visibleCards.length === 0) return;
    const rows: (string | number)[][] = [
      ["Adm No", "Student Name", "Class", "System", "Term", "Mean %", "Overall Grade", "Total Points", "Class Position", "Level Position", "Attendance %"],
      ...visibleCards.map((c) => [
        c.admNo,
        c.name,
        c.className,
        c.system,
        `${c.termName} ${c.yearName}`.trim(),
        c.meanPercent,
        c.overallGrade,
        c.totalPoints,
        c.classPosition ? `${c.classPosition}/${c.classSize}` : "-",
        c.levelPosition ? `${c.levelPosition}/${c.levelSize}` : "-",
        c.attendance.days ? `${c.attendance.ratePercent}%` : "N/A",
      ]),
    ];
    const clsObj = classes.find((x) => x.id === cls);
    const termObj = terms.find((x) => x.id === term);
    const fname = `${(clsObj ? label(clsObj) : "class").replace(/\s+/g, "_")}_${(termObj?.name || "term").replace(/\s+/g, "_")}_reports.csv`;
    download(fname, toCsv(rows));
  };

  return (
    <div className="space-y-4">
      <section className={`${card} no-print`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-3 sm:grid-cols-3 flex-1 min-w-[260px]">
            <ClassTermPickers classes={classes} terms={terms} cls={cls} setCls={setCls} term={term} setTerm={setTerm} />
            <Field label="Filter student">
              <input
                className={input}
                placeholder="Name or Adm no…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnGhost} onClick={loadReports} disabled={busy || !cls || !term}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Refresh
            </button>
            <button type="button" className={btnGhost} onClick={exportCsv} disabled={visibleCards.length === 0}>
              <Download className="h-4 w-4" />Export CSV
            </button>
            <button type="button" className={btn} onClick={() => window.print()} disabled={visibleCards.length === 0}>
              <Printer className="h-4 w-4" />Print / Save PDF ({visibleCards.length})
            </button>
          </div>
        </div>
      </section>

      {busy && (
        <p className="flex items-center gap-2 text-sm text-text-secondary no-print">
          <Loader2 className="h-4 w-4 animate-spin" />Generating report cards…
        </p>
      )}

      {!busy && visibleCards.length === 0 && (
        <div className={`${card} text-center text-xs text-text-secondary py-8 no-print`}>
          No student report cards available for the selected class and term yet. Place students and record marks first.
        </div>
      )}

      <div className="space-y-5">
        {visibleCards.map((c) => (
          <div key={c.studentId} className="print:break-after-page">
            <ReportCardView card={c} institutionName={resolvedInstName} />
          </div>
        ))}
      </div>
    </div>
  );
}
