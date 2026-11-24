import { Router, Response } from "express";
import {
  academicState,
  AcademicStudent,
  AttendanceStatus,
  buildClassReportCards,
  DEFAULT_INSTITUTION_ID,
  generateAcademicId,
  gradeScore,
  persistAcademicState,
} from "./academicLogic";
import {
  AuthenticatedRequest,
  recordAuditLog,
  requireAuth,
  RequestIdentity,
} from "./security";

export const academicsRouter = Router();

function canManageAcademics(actor: RequestIdentity): boolean {
  return (
    actor.isMainAdmin ||
    actor.role === "main_admin" ||
    actor.role === "sub_admin" ||
    actor.role === "manager" ||
    actor.role === "tutor"
  );
}

function canAccessClass(actor: RequestIdentity, classId: string): boolean {
  if (canManageAcademics(actor)) return true;
  const cls = academicState.classes[classId];
  if (!cls) return false;
  return (
    Boolean(cls.classTeacherEmail) &&
    cls.classTeacherEmail.toLowerCase() === actor.email.toLowerCase()
  );
}

function ensureInstitution(instId: string) {
  if (!academicState.institutions[instId]) {
    academicState.institutions[instId] = {
      id: instId,
      name:
        instId === DEFAULT_INSTITUTION_ID
          ? "Zion Digital Leadership & Bible Academy"
          : `Institution (${instId})`,
    };
    persistAcademicState();
  }
  return academicState.institutions[instId];
}

/**
 * GET /api/school/my/context
 * Returns academic context (institutions, classes, terms, and visible students)
 */
academicsRouter.get("/my/context", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.identity!;
  const isStaff = canManageAcademics(actor);
  const emailLower = actor.email.toLowerCase();

  const institutions = Object.values(academicState.institutions);
  const classes = Object.values(academicState.classes);
  const terms = Object.values(academicState.terms);

  const allStudents = Object.values(academicState.students);
  const students = isStaff
    ? allStudents
    : allStudents.filter(
        (s) =>
          s.studentEmail?.toLowerCase() === emailLower ||
          s.parentEmails?.some((p) => p.toLowerCase() === emailLower)
      );

  const childIds = allStudents
    .filter((s) => s.parentEmails?.some((p) => p.toLowerCase() === emailLower))
    .map((s) => s.id);

  return res.json({
    success: true,
    institutions,
    classes,
    terms,
    students,
    childIds,
  });
});

/**
 * GET /api/school/institutions/:instId/academics
 * Returns years, terms, classes, subjects, assessments, and students for staff
 */
academicsRouter.get(
  "/institutions/:instId/academics",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const { instId } = req.params;
    ensureInstitution(instId);

    const years = Object.values(academicState.years).filter((y) => y.institutionId === instId);
    const terms = Object.values(academicState.terms).filter((t) => t.institutionId === instId);
    const classes = Object.values(academicState.classes).filter((c) => c.institutionId === instId);
    const subjects = Object.values(academicState.subjects).filter((s) => s.institutionId === instId);
    const assessments = Object.values(academicState.assessments)
      .filter((a) => a.institutionId === instId)
      .sort((a, b) => b.date.localeCompare(a.date));
    const students = canManageAcademics(actor)
      ? Object.values(academicState.students).filter((s) => s.institutionId === instId)
      : [];

    return res.json({
      success: true,
      years,
      terms,
      classes,
      subjects,
      assessments,
      students,
    });
  }
);

/**
 * POST /api/school/institutions/:instId/years
 */
academicsRouter.post(
  "/institutions/:instId/years",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);

    const name = String(req.body?.name || "").trim();
    const startDate = String(req.body?.startDate || "").trim();
    const endDate = String(req.body?.endDate || "").trim();
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: "Year name, start date, and end date are required." });
    }

    const hasCurrent = Object.values(academicState.years).some(
      (y) => y.institutionId === instId && y.current
    );

    const id = generateAcademicId("yr");
    academicState.years[id] = {
      id,
      institutionId: instId,
      name,
      startDate,
      endDate,
      current: !hasCurrent,
    };
    persistAcademicState();
    return res.status(201).json({ success: true, year: academicState.years[id] });
  }
);

/**
 * PUT /api/school/years/:id/current
 */
academicsRouter.put(
  "/years/:id/current",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const target = academicState.years[req.params.id];
    if (!target) return res.status(404).json({ success: false, error: "Academic year not found." });

    for (const y of Object.values(academicState.years)) {
      if (y.institutionId === target.institutionId) {
        y.current = y.id === target.id;
      }
    }
    persistAcademicState();
    return res.json({ success: true, year: target });
  }
);

/**
 * POST /api/school/institutions/:instId/terms
 */
academicsRouter.post(
  "/institutions/:instId/terms",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);

    const yearId = String(req.body?.yearId || "").trim();
    const name = String(req.body?.name || "").trim();
    const startDate = String(req.body?.startDate || "").trim();
    const endDate = String(req.body?.endDate || "").trim();
    if (!yearId || !name || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: "Year, term name, start date, and end date are required." });
    }
    if (!academicState.years[yearId]) {
      return res.status(404).json({ success: false, error: "Academic year not found." });
    }

    const hasCurrent = Object.values(academicState.terms).some(
      (t) => t.institutionId === instId && t.current
    );

    const id = generateAcademicId("term");
    academicState.terms[id] = {
      id,
      institutionId: instId,
      yearId,
      name,
      startDate,
      endDate,
      current: !hasCurrent,
    };
    persistAcademicState();
    return res.status(201).json({ success: true, term: academicState.terms[id] });
  }
);

/**
 * PUT /api/school/terms/:id/current
 */
academicsRouter.put(
  "/terms/:id/current",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const target = academicState.terms[req.params.id];
    if (!target) return res.status(404).json({ success: false, error: "Term not found." });

    for (const t of Object.values(academicState.terms)) {
      if (t.institutionId === target.institutionId) {
        t.current = t.id === target.id;
      }
    }
    persistAcademicState();
    return res.json({ success: true, term: target });
  }
);

/**
 * POST /api/school/institutions/:instId/classes
 */
academicsRouter.post(
  "/institutions/:instId/classes",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);

    const name = String(req.body?.name || "").trim();
    const stream = String(req.body?.stream || "").trim();
    const system = req.body?.system === "CBC" ? "CBC" : "8-4-4";
    const classTeacherEmail = String(req.body?.classTeacherEmail || "").trim().toLowerCase();

    if (!name) {
      return res.status(400).json({ success: false, error: "Class name is required." });
    }

    const id = generateAcademicId("cls");
    academicState.classes[id] = {
      id,
      institutionId: instId,
      name,
      stream,
      system,
      classTeacherEmail,
    };
    persistAcademicState();
    return res.status(201).json({ success: true, class: academicState.classes[id] });
  }
);

/**
 * POST /api/school/institutions/:instId/subjects
 */
academicsRouter.post(
  "/institutions/:instId/subjects",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);

    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, error: "Subject name is required." });
    }

    const rawCode = String(req.body?.code || "").trim().toUpperCase();
    const code = rawCode || name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "SUB";
    const sys = req.body?.system;
    const system: "both" | "8-4-4" | "CBC" =
      sys === "8-4-4" || sys === "CBC" ? sys : "both";

    const id = generateAcademicId("sub");
    academicState.subjects[id] = {
      id,
      institutionId: instId,
      code,
      name,
      system,
    };
    persistAcademicState();
    return res.status(201).json({ success: true, subject: academicState.subjects[id] });
  }
);

/**
 * POST /api/school/institutions/:instId/students
 */
academicsRouter.post(
  "/institutions/:instId/students",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);

    const name = String(req.body?.name || "").trim();
    const admNoInput = String(req.body?.admNo || "").trim();
    const classId = String(req.body?.classId || "").trim() || undefined;
    const studentEmail = String(req.body?.studentEmail || "").trim().toLowerCase() || undefined;
    const parentEmail = String(req.body?.parentEmail || "").trim().toLowerCase();

    if (!name) {
      return res.status(400).json({ success: false, error: "Student name is required." });
    }

    const existingCount = Object.values(academicState.students).filter(
      (s) => s.institutionId === instId
    ).length;
    const admNo = admNoInput || `ZD-${new Date().getFullYear()}-${String(existingCount + 101)}`;

    const id = generateAcademicId("stu");
    const student: AcademicStudent = {
      id,
      institutionId: instId,
      admNo,
      name,
      classId,
      status: "active",
      studentEmail,
      parentEmails: parentEmail ? [parentEmail] : [],
    };
    academicState.students[id] = student;
    persistAcademicState();
    return res.status(201).json({ success: true, student });
  }
);

/**
 * PUT /api/school/students/:id/class
 */
academicsRouter.put(
  "/students/:id/class",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const student = academicState.students[req.params.id];
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found." });
    }

    const classId = String(req.body?.classId || "").trim();
    if (classId && !academicState.classes[classId]) {
      return res.status(404).json({ success: false, error: "Selected class not found." });
    }
    student.classId = classId || undefined;
    persistAcademicState();
    return res.json({ success: true, student });
  }
);

/**
 * POST /api/school/institutions/:instId/assessments
 */
academicsRouter.post(
  "/institutions/:instId/assessments",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const { instId } = req.params;
    const classId = String(req.body?.classId || "").trim();
    const subjectId = String(req.body?.subjectId || "").trim();
    const termId = String(req.body?.termId || "").trim();
    const name = String(req.body?.name || "").trim();
    const outOf = Number(req.body?.outOf) || 100;
    const date = String(req.body?.date || new Date().toISOString().slice(0, 10)).trim();

    if (!classId || !subjectId || !termId || !name) {
      return res.status(400).json({ success: false, error: "Class, term, subject, and assessment name are required." });
    }
    if (!canAccessClass(actor, classId)) {
      return res.status(403).json({ success: false, error: "Not authorized to create assessments for this class." });
    }
    if (outOf < 1 || outOf > 1000) {
      return res.status(400).json({ success: false, error: "Maximum score (outOf) must be between 1 and 1000." });
    }

    const id = generateAcademicId("ass");
    academicState.assessments[id] = {
      id,
      institutionId: instId,
      classId,
      subjectId,
      termId,
      name,
      outOf,
      date,
    };
    persistAcademicState();
    return res.status(201).json({ success: true, assessment: academicState.assessments[id] });
  }
);

/**
 * GET /api/school/assessments/:id/sheet
 */
academicsRouter.get(
  "/assessments/:id/sheet",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const assessment = academicState.assessments[req.params.id];
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found." });
    }
    if (!canAccessClass(actor, assessment.classId)) {
      return res.status(403).json({ success: false, error: "Not authorized to view this mark sheet." });
    }

    const cls = academicState.classes[assessment.classId];
    const system = cls?.system || "8-4-4";

    const students = Object.values(academicState.students)
      .filter(
        (s) =>
          s.classId === assessment.classId &&
          (s.status === "active" || s.status === "deferred")
      )
      .sort((a, b) => a.admNo.localeCompare(b.admNo));

    const rows = students.map((s) => {
      const rec = academicState.scores[`${assessment.id}:${s.id}`];
      const score = rec && rec.score !== null && rec.score !== undefined ? Number(rec.score) : null;
      const pct = score !== null && assessment.outOf > 0 ? (score / assessment.outOf) * 100 : null;
      const grade = pct !== null ? gradeScore(pct, system).grade : "-";
      return {
        studentId: s.id,
        admNo: s.admNo,
        name: s.name,
        score,
        grade,
      };
    });

    return res.json({ success: true, assessment, rows });
  }
);

/**
 * PUT /api/school/assessments/:id/scores
 */
academicsRouter.put(
  "/assessments/:id/scores",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const assessment = academicState.assessments[req.params.id];
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Assessment not found." });
    }
    if (!canAccessClass(actor, assessment.classId)) {
      return res.status(403).json({ success: false, error: "Not authorized to record marks for this class." });
    }

    const entries = Array.isArray(req.body?.scores) ? req.body.scores : [];
    const now = new Date().toISOString();
    let updated = 0;

    for (const item of entries) {
      const studentId = String(item?.studentId || "").trim();
      const student = academicState.students[studentId];
      if (!student || student.classId !== assessment.classId) continue;

      const rawScore = item?.score;
      if (rawScore === null || rawScore === "" || rawScore === undefined) {
        delete academicState.scores[`${assessment.id}:${studentId}`];
        updated++;
        continue;
      }

      const numericScore = Number(rawScore);
      if (Number.isNaN(numericScore) || numericScore < 0 || numericScore > assessment.outOf) {
        return res.status(400).json({
          success: false,
          error: `Score for ${student.name} must be between 0 and ${assessment.outOf}.`,
        });
      }

      academicState.scores[`${assessment.id}:${studentId}`] = {
        assessmentId: assessment.id,
        studentId,
        score: numericScore,
        updatedAt: now,
        updatedBy: actor.email,
      };
      updated++;
    }

    persistAcademicState();

    recordAuditLog({
      actor,
      category: "EXAM_RESULT_CHANGE",
      action: "ACADEMIC_MARKS_UPDATED",
      targetType: "assessment",
      targetId: assessment.id,
      details: `Recorded ${updated} score(s) for ${assessment.name}`,
    });

    return res.json({ success: true, updated });
  }
);

/**
 * GET /api/school/classes/:id/attendance
 */
academicsRouter.get(
  "/classes/:id/attendance",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const classId = req.params.id;
    const date = String(req.query.date || new Date().toISOString().slice(0, 10)).slice(0, 10);

    if (!academicState.classes[classId]) {
      return res.status(404).json({ success: false, error: "Class not found." });
    }
    if (!canAccessClass(actor, classId)) {
      return res.status(403).json({ success: false, error: "Not authorized to view attendance for this class." });
    }

    const students = Object.values(academicState.students)
      .filter((s) => s.classId === classId && (s.status === "active" || s.status === "deferred"))
      .sort((a, b) => a.admNo.localeCompare(b.admNo));

    const rows = students.map((s) => {
      const rec = academicState.attendance[`${classId}:${date}:${s.id}`];
      return {
        studentId: s.id,
        admNo: s.admNo,
        name: s.name,
        status: rec?.status || "present",
      };
    });

    return res.json({ success: true, date, rows });
  }
);

/**
 * PUT /api/school/classes/:id/attendance
 */
academicsRouter.put(
  "/classes/:id/attendance",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const classId = req.params.id;
    const date = String(req.body?.date || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const entries = Array.isArray(req.body?.rows) ? req.body.rows : [];

    if (!academicState.classes[classId]) {
      return res.status(404).json({ success: false, error: "Class not found." });
    }
    if (!canAccessClass(actor, classId)) {
      return res.status(403).json({ success: false, error: "Not authorized to record attendance for this class." });
    }

    const validStatuses = new Set<AttendanceStatus>(["present", "absent", "late", "excused"]);
    const now = new Date().toISOString();
    let count = 0;

    for (const entry of entries) {
      const studentId = String(entry?.studentId || "").trim();
      const status = String(entry?.status || "present").toLowerCase() as AttendanceStatus;
      const student = academicState.students[studentId];
      if (!student || student.classId !== classId || !validStatuses.has(status)) continue;

      academicState.attendance[`${classId}:${date}:${studentId}`] = {
        classId,
        date,
        studentId,
        status,
        updatedAt: now,
        updatedBy: actor.email,
      };
      count++;
    }

    persistAcademicState();
    return res.json({ success: true, date, saved: count });
  }
);

/**
 * GET /api/school/classes/:id/reports
 */
academicsRouter.get(
  "/classes/:id/reports",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const classId = req.params.id;
    const termId = String(req.query.termId || "").trim();

    const cls = academicState.classes[classId];
    if (!cls) return res.status(404).json({ success: false, error: "Class not found." });
    if (!canAccessClass(actor, classId)) {
      return res.status(403).json({ success: false, error: "Not authorized to view class reports." });
    }
    if (!termId || !academicState.terms[termId]) {
      return res.status(400).json({ success: false, error: "Valid termId is required." });
    }

    const cards = buildClassReportCards({ classId, termId });
    const inst = academicState.institutions[cls.institutionId] || {
      id: cls.institutionId,
      name: "Zion Digital Academy",
    };

    return res.json({ success: true, cards, institution: inst });
  }
);

/**
 * GET /api/school/my/report
 */
academicsRouter.get(
  "/my/report",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const studentId = String(req.query.studentId || "").trim();
    const termId = String(req.query.termId || "").trim();

    const student = academicState.students[studentId];
    if (!student || !student.classId) {
      return res.status(404).json({ success: false, error: "Student is not placed in a class yet." });
    }

    const emailLower = actor.email.toLowerCase();
    const isOwner =
      student.studentEmail?.toLowerCase() === emailLower ||
      student.parentEmails?.some((p) => p.toLowerCase() === emailLower);

    if (!canManageAcademics(actor) && !isOwner) {
      return res.status(403).json({ success: false, error: "Not authorized to view this student's report card." });
    }

    const cls = academicState.classes[student.classId];
    if (!cls || !academicState.terms[termId]) {
      return res.status(404).json({ success: false, error: "Class or term not found." });
    }

    const cards = buildClassReportCards({ classId: student.classId, termId });
    const card = cards.find((c) => c.studentId === student.id);
    if (!card) {
      return res.status(404).json({ success: false, error: "Report card could not be generated." });
    }

    const institution = academicState.institutions[cls.institutionId] || {
      id: cls.institutionId,
      name: "Zion Digital Academy",
    };

    return res.json({ success: true, card, institution });
  }
);
