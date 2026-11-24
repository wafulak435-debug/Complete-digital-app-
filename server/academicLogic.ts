import fs from "fs";
import path from "path";
import crypto from "crypto";

export type CurriculumSystem = "8-4-4" | "CBC";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AcademicInstitution {
  id: string;
  name: string;
}

export interface AcademicYear {
  id: string;
  institutionId: string;
  name: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface AcademicTerm {
  id: string;
  institutionId: string;
  yearId: string;
  name: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface AcademicClass {
  id: string;
  institutionId: string;
  name: string;
  stream: string;
  system: CurriculumSystem;
  classTeacherEmail: string;
}

export interface AcademicSubject {
  id: string;
  institutionId: string;
  code: string;
  name: string;
  system: "both" | "8-4-4" | "CBC";
}

export interface AcademicStudent {
  id: string;
  institutionId: string;
  admNo: string;
  name: string;
  classId?: string;
  status: "active" | "deferred" | "alumni" | string;
  studentEmail?: string;
  parentEmails?: string[];
}

export interface AcademicAssessment {
  id: string;
  institutionId: string;
  classId: string;
  subjectId: string;
  termId: string;
  name: string;
  outOf: number;
  date: string;
}

export interface AssessmentScore {
  assessmentId: string;
  studentId: string;
  score: number | null;
  updatedAt: string;
  updatedBy: string;
}

export interface AttendanceRecord {
  classId: string;
  date: string;
  studentId: string;
  status: AttendanceStatus;
  updatedAt: string;
  updatedBy: string;
}

export interface SheetRow {
  studentId: string;
  admNo: string;
  name: string;
  score: number | null;
  grade: string;
}

export interface AttRow {
  studentId: string;
  admNo: string;
  name: string;
  status: string;
}

export interface ReportCardData {
  studentId: string;
  admNo: string;
  name: string;
  className: string;
  system: string;
  termName: string;
  yearName: string;
  subjects: {
    subjectId: string;
    subject: string;
    code: string;
    assessments: number;
    percent: number;
    grade: string;
    points: number;
    label: string;
  }[];
  meanPercent: number;
  totalPoints: number;
  overallGrade: string;
  overallLabel: string;
  classPosition: number;
  classSize: number;
  levelPosition: number;
  levelSize: number;
  attendance: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    days: number;
    ratePercent: number;
  };
  comment: string;
}

export interface AcademicStoreState {
  institutions: Record<string, AcademicInstitution>;
  years: Record<string, AcademicYear>;
  terms: Record<string, AcademicTerm>;
  classes: Record<string, AcademicClass>;
  subjects: Record<string, AcademicSubject>;
  students: Record<string, AcademicStudent>;
  assessments: Record<string, AcademicAssessment>;
  scores: Record<string, AssessmentScore>; // key: `${assessmentId}:${studentId}`
  attendance: Record<string, AttendanceRecord>; // key: `${classId}:${date}:${studentId}`
}

const DATA_DIR = path.join(process.cwd(), "data");
const ACADEMICS_STATE_FILE = path.join(DATA_DIR, "zion-academics-state.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const DEFAULT_INSTITUTION_ID = "zion_academy";

function createDefaultAcademicState(): AcademicStoreState {
  const instId = DEFAULT_INSTITUTION_ID;
  const yearId = "yr_2026";
  const term1Id = "term_2026_1";
  const term2Id = "term_2026_2";
  const clsForm2E = "cls_form2_east";
  const clsGrade6 = "cls_grade6_cbc";

  return {
    institutions: {
      [instId]: {
        id: instId,
        name: "Zion Digital Leadership & Bible Academy",
      },
    },
    years: {
      [yearId]: {
        id: yearId,
        institutionId: instId,
        name: "2026",
        startDate: "2026-01-06",
        endDate: "2026-11-27",
        current: true,
      },
    },
    terms: {
      [term1Id]: {
        id: term1Id,
        institutionId: instId,
        yearId,
        name: "Term 1",
        startDate: "2026-01-06",
        endDate: "2026-04-10",
        current: false,
      },
      [term2Id]: {
        id: term2Id,
        institutionId: instId,
        yearId,
        name: "Term 2",
        startDate: "2026-05-04",
        endDate: "2026-08-14",
        current: true,
      },
    },
    classes: {
      [clsForm2E]: {
        id: clsForm2E,
        institutionId: instId,
        name: "Form 2",
        stream: "East",
        system: "8-4-4",
        classTeacherEmail: "wafulak435@gmail.com",
      },
      [clsGrade6]: {
        id: clsGrade6,
        institutionId: instId,
        name: "Grade 6",
        stream: "",
        system: "CBC",
        classTeacherEmail: "wafulak435@gmail.com",
      },
    },
    subjects: {
      sub_math: { id: "sub_math", institutionId: instId, code: "MAT", name: "Mathematics", system: "both" },
      sub_eng: { id: "sub_eng", institutionId: instId, code: "ENG", name: "English", system: "both" },
      sub_kis: { id: "sub_kis", institutionId: instId, code: "KIS", name: "Kiswahili", system: "both" },
      sub_cre: { id: "sub_cre", institutionId: instId, code: "CRE", name: "Christian Religious Education", system: "both" },
      sub_comp: { id: "sub_comp", institutionId: instId, code: "CSC", name: "Computer Studies", system: "both" },
    },
    students: {},
    assessments: {},
    scores: {},
    attendance: {},
  };
}

function loadAcademicState(): AcademicStoreState {
  try {
    if (fs.existsSync(ACADEMICS_STATE_FILE)) {
      const raw = fs.readFileSync(ACADEMICS_STATE_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<AcademicStoreState>;
      const fallback = createDefaultAcademicState();
      return {
        institutions: parsed.institutions && Object.keys(parsed.institutions).length > 0 ? parsed.institutions : fallback.institutions,
        years: parsed.years || fallback.years,
        terms: parsed.terms || fallback.terms,
        classes: parsed.classes || fallback.classes,
        subjects: parsed.subjects || fallback.subjects,
        students: parsed.students || {},
        assessments: parsed.assessments || {},
        scores: parsed.scores || {},
        attendance: parsed.attendance || {},
      };
    }
  } catch {
    // Fallback cleanly to default seeded state
  }
  return createDefaultAcademicState();
}

export const academicState: AcademicStoreState = loadAcademicState();

export function persistAcademicState(): void {
  try {
    const tmp = `${ACADEMICS_STATE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(academicState, null, 2), "utf8");
    fs.renameSync(tmp, ACADEMICS_STATE_FILE);
  } catch (err) {
    console.error("Failed to persist academic state:", err instanceof Error ? err.message : "unknown");
  }
}

export function generateAcademicId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
}

/**
 * Kenyan 8-4-4 (KNEC 12-point) and CBC / CBE grading calculator
 */
export function gradeScore(
  percent: number,
  system: CurriculumSystem | string
): { grade: string; points: number; label: string } {
  const p = Math.max(0, Math.min(100, Math.round(percent)));

  if (system === "CBC") {
    if (p >= 80) return { grade: "EE", points: 4, label: "Exceeding Expectations" };
    if (p >= 65) return { grade: "ME", points: 3, label: "Meeting Expectations" };
    if (p >= 45) return { grade: "AE", points: 2, label: "Approaching Expectations" };
    return { grade: "BE", points: 1, label: "Below Expectations" };
  }

  // Standard KNEC 8-4-4 12-point grading scale
  if (p >= 80) return { grade: "A", points: 12, label: "Excellent" };
  if (p >= 75) return { grade: "A-", points: 11, label: "Very Good" };
  if (p >= 70) return { grade: "B+", points: 10, label: "Good" };
  if (p >= 65) return { grade: "B", points: 9, label: "Good" };
  if (p >= 60) return { grade: "B-", points: 8, label: "Above Average" };
  if (p >= 55) return { grade: "C+", points: 7, label: "Fairly Good" };
  if (p >= 50) return { grade: "C", points: 6, label: "Average" };
  if (p >= 45) return { grade: "C-", points: 5, label: "Fair" };
  if (p >= 40) return { grade: "D+", points: 4, label: "Pass" };
  if (p >= 35) return { grade: "D", points: 3, label: "Below Average" };
  if (p >= 30) return { grade: "D-", points: 2, label: "Weak" };
  return { grade: "E", points: 1, label: "Needs Improvement" };
}

function buildTeacherComment(
  meanPercent: number,
  overallGrade: string,
  system: string,
  attendanceRate: number,
  attendanceDays: number
): string {
  let academicMsg = "Steady effort demonstrated this term; continue consistent revision.";
  if (system === "CBC") {
    if (overallGrade === "EE") {
      academicMsg = "Outstanding mastery of learning outcomes across competencies. Keep leading by example.";
    } else if (overallGrade === "ME") {
      academicMsg = "Consistent achievement meeting core curriculum expectations. Aim even higher next term.";
    } else if (overallGrade === "AE") {
      academicMsg = "Developing steadily; targeted practice on foundational concepts will boost confidence.";
    } else {
      academicMsg = "Requires guided remedial support and closer mentorship across key learning areas.";
    }
  } else {
    if (meanPercent >= 75) {
      academicMsg = "Commendable academic excellence and disciplined preparation. Maintain this high standard.";
    } else if (meanPercent >= 60) {
      academicMsg = "Good performance with clear potential for A-tier distinction with extra practice.";
    } else if (meanPercent >= 45) {
      academicMsg = "Fair results; consistent daily revision and early assignment review are encouraged.";
    } else {
      academicMsg = "Needs focused academic mentorship and structured remedial coaching next term.";
    }
  }

  if (attendanceDays > 0 && attendanceRate < 80) {
    return `${academicMsg} Improve class attendance (${attendanceRate}%) to sustain academic progress.`;
  }
  return academicMsg;
}

function computeCompetitionRank(studentMean: number, allMeans: number[]): number {
  if (allMeans.length === 0) return 0;
  let higher = 0;
  for (const m of allMeans) {
    if (m > studentMean) higher++;
  }
  return higher + 1;
}

function formatClassLabel(c: Pick<AcademicClass, "name" | "stream">): string {
  return c.stream ? `${c.name} ${c.stream}` : c.name;
}

/**
 * Computes report cards for a class and term, including class & level ranking
 */
export function buildClassReportCards(params: {
  classId: string;
  termId: string;
}): ReportCardData[] {
  const { classId, termId } = params;
  const cls = academicState.classes[classId];
  const term = academicState.terms[termId];
  if (!cls || !term) return [];

  const year = academicState.years[term.yearId];
  const allSubjects = Object.values(academicState.subjects).filter(
    (s) =>
      s.institutionId === cls.institutionId &&
      (s.system === "both" || s.system === cls.system)
  );

  // All classes in the same level (same base name + institution + system) for level ranking
  const levelClassIds = new Set(
    Object.values(academicState.classes)
      .filter(
        (c) =>
          c.institutionId === cls.institutionId &&
          c.system === cls.system &&
          c.name.trim().toLowerCase() === cls.name.trim().toLowerCase()
      )
      .map((c) => c.id)
  );

  const levelStudents = Object.values(academicState.students).filter(
    (s) =>
      s.classId &&
      levelClassIds.has(s.classId) &&
      (s.status === "active" || s.status === "deferred")
  );

  // Compute raw student averages across the level first so class & level positions are accurate
  const computeStudentSummary = (student: AcademicStudent) => {
    const studentClassId = student.classId || classId;
    const classAssessments = Object.values(academicState.assessments).filter(
      (a) => a.classId === studentClassId && a.termId === termId
    );

    const subjectCards: ReportCardData["subjects"] = [];
    for (const sub of allSubjects) {
      const subAssessments = classAssessments.filter((a) => a.subjectId === sub.id);
      if (subAssessments.length === 0) continue;

      let totalObtained = 0;
      let totalOutOf = 0;
      let takenCount = 0;

      for (const ass of subAssessments) {
        const rec = academicState.scores[`${ass.id}:${student.id}`];
        if (rec && rec.score !== null && rec.score !== undefined && !Number.isNaN(rec.score)) {
          totalObtained += Number(rec.score);
          totalOutOf += Number(ass.outOf) || 100;
          takenCount++;
        }
      }

      if (takenCount === 0 || totalOutOf <= 0) continue;
      const percent = Math.round((totalObtained / totalOutOf) * 100);
      const graded = gradeScore(percent, cls.system);

      subjectCards.push({
        subjectId: sub.id,
        subject: sub.name,
        code: sub.code,
        assessments: takenCount,
        percent,
        grade: graded.grade,
        points: graded.points,
        label: graded.label,
      });
    }

    const meanPercent =
      subjectCards.length > 0
        ? Math.round(subjectCards.reduce((sum, s) => sum + s.percent, 0) / subjectCards.length)
        : 0;
    const totalPoints = subjectCards.reduce((sum, s) => sum + s.points, 0);
    const overall =
      subjectCards.length > 0
        ? gradeScore(meanPercent, cls.system)
        : { grade: "-", points: 0, label: "" };

    // Term attendance for this student
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    for (const att of Object.values(academicState.attendance)) {
      if (att.classId !== studentClassId || att.studentId !== student.id) continue;
      if (term.startDate && att.date < term.startDate) continue;
      if (term.endDate && att.date > term.endDate) continue;
      if (att.status === "present") present++;
      else if (att.status === "absent") absent++;
      else if (att.status === "late") late++;
      else if (att.status === "excused") excused++;
    }
    const days = present + absent + late + excused;
    const ratePercent = days > 0 ? Math.round(((present + late) / days) * 100) : 0;

    return {
      student,
      subjectCards,
      meanPercent,
      totalPoints,
      overallGrade: overall.grade,
      overallLabel: overall.label,
      attendance: { present, absent, late, excused, days, ratePercent },
    };
  };

  const levelSummaries = levelStudents.map(computeStudentSummary);
  const classSummaries = levelSummaries.filter((s) => s.student.classId === classId);

  const classMeans = classSummaries
    .filter((s) => s.subjectCards.length > 0)
    .map((s) => s.meanPercent);
  const levelMeans = levelSummaries
    .filter((s) => s.subjectCards.length > 0)
    .map((s) => s.meanPercent);

  const classSize = classSummaries.length;
  const levelSize = levelSummaries.length;
  const classNameLabel = formatClassLabel(cls);

  return classSummaries
    .sort((a, b) => b.meanPercent - a.meanPercent || a.student.name.localeCompare(b.student.name))
    .map((s) => {
      const hasResults = s.subjectCards.length > 0;
      const classPosition = hasResults ? computeCompetitionRank(s.meanPercent, classMeans) : 0;
      const levelPosition = hasResults ? computeCompetitionRank(s.meanPercent, levelMeans) : 0;
      return {
        studentId: s.student.id,
        admNo: s.student.admNo,
        name: s.student.name,
        className: classNameLabel,
        system: cls.system,
        termName: term.name,
        yearName: year?.name || "",
        subjects: s.subjectCards,
        meanPercent: s.meanPercent,
        totalPoints: s.totalPoints,
        overallGrade: s.overallGrade,
        overallLabel: s.overallLabel,
        classPosition,
        classSize,
        levelPosition,
        levelSize,
        attendance: s.attendance,
        comment: hasResults
          ? buildTeacherComment(
              s.meanPercent,
              s.overallGrade,
              cls.system,
              s.attendance.ratePercent,
              s.attendance.days
            )
          : "No assessments recorded for this term yet.",
      };
    });
}
