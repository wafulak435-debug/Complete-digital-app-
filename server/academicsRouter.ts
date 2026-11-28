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

function canManageStudents(actor: RequestIdentity): boolean {
  if (actor.isMainAdmin || actor.role === "main_admin" || actor.role === "manager") return true;
  if (actor.role === "sub_admin") {
    return Boolean(actor.capabilities.allowManageStudents || actor.capabilities.allowManageEnrollments);
  }
  return false;
}

function canManageAcademics(actor: RequestIdentity): boolean {
  if (actor.isMainAdmin || actor.role === "main_admin" || actor.role === "manager" || actor.role === "tutor") {
    return true;
  }
  if (actor.role === "sub_admin") {
    return Boolean(
      actor.capabilities.allowManageStudents ||
        actor.capabilities.allowManageEnrollments ||
        actor.capabilities.allowManageExams ||
        actor.capabilities.allowManageLeadership ||
        actor.capabilities.allowManageComputer ||
        actor.capabilities.allowManageBible
    );
  }
  return false;
}

function canAccessClass(actor: RequestIdentity, classId: string): boolean {
  if (actor.isMainAdmin || actor.role === "main_admin" || actor.role === "manager") return true;
  if (actor.role === "sub_admin" && actor.capabilities.allowManageExams) return true;
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
      return res.status(403).json({ success: false, error: "School management permission required." });
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
    if (!actor.isMainAdmin && actor.role !== "manager") {
      return res.status(403).json({ success: false, error: "Only the Manager may switch active academic year." });
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
    if (!actor.isMainAdmin && actor.role !== "manager") {
      return res.status(403).json({ success: false, error: "Only the Manager may switch active academic term." });
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
    if (!canManageStudents(actor)) {
      recordAuditLog({
        actor,
        category: "ACCESS_DENIED",
        action: "STUDENT_CREATE_DENIED",
        targetType: "student",
        targetId: instIdFromReq(req),
        details: `Denied student creation by ${actor.email} (missing allowManageStudents/allowManageEnrollments)`,
      });
      return res.status(403).json({ success: false, error: "Student management permission required." });
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
    recordAuditLog({
      actor,
      category: "ADMIN_ACTION",
      action: "STUDENT_ADDED",
      targetType: "student",
      targetId: id,
      details: `Added student "${name}" (${admNo})`,
    });
    return res.status(201).json({ success: true, student });
  }
);

function instIdFromReq(req: AuthenticatedRequest) {
  return String(req.params?.instId || "zion_academy");
}

/**
 * PUT /api/school/students/:id
 * Allows authorized admins (allowManageStudents / allowManageEnrollments) and Manager to edit student details under monitoring.
 */
academicsRouter.put(
  "/students/:id",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageStudents(actor)) {
      recordAuditLog({
        actor,
        category: "ACCESS_DENIED",
        action: "STUDENT_EDIT_DENIED",
        targetType: "student",
        targetId: req.params.id,
        details: `Blocked student profile edit by ${actor.email}`,
      });
      return res.status(403).json({ success: false, error: "Student management permission required." });
    }
    const student = academicState.students[req.params.id];
    if (!student) {
      return res.status(404).json({ success: false, error: "Student not found." });
    }

    const nextName = req.body?.name !== undefined ? String(req.body.name).trim() : student.name;
    const nextAdmNo = req.body?.admNo !== undefined ? String(req.body.admNo).trim() : student.admNo;
    const nextClassId =
      req.body?.classId !== undefined ? String(req.body.classId || "").trim() || undefined : student.classId;
    if (nextClassId && !academicState.classes[nextClassId]) {
      return res.status(404).json({ success: false, error: "Selected class not found." });
    }

    const allowedStatuses = new Set(["active", "deferred", "graduated", "transferred"]);
    const rawStatus = req.body?.status !== undefined ? String(req.body.status).trim().toLowerCase() : student.status;
    const nextStatus = allowedStatuses.has(rawStatus) ? (rawStatus as AcademicStudent["status"]) : student.status;

    const nextStudentEmail =
      req.body?.studentEmail !== undefined
        ? String(req.body.studentEmail || "").trim().toLowerCase() || undefined
        : student.studentEmail;

    let nextParentEmails = student.parentEmails || [];
    if (Array.isArray(req.body?.parentEmails)) {
      nextParentEmails = req.body.parentEmails.map((e: any) => String(e || "").trim().toLowerCase()).filter(Boolean);
    } else if (req.body?.parentEmail !== undefined) {
      const p = String(req.body.parentEmail || "").trim().toLowerCase();
      nextParentEmails = p ? [p] : [];
    }

    if (!nextName || !nextAdmNo) {
      return res.status(400).json({ success: false, error: "Student name and admission number are required." });
    }

    student.name = nextName.slice(0, 120);
    student.admNo = nextAdmNo.slice(0, 40);
    student.classId = nextClassId;
    student.status = nextStatus;
    student.studentEmail = nextStudentEmail;
    student.parentEmails = nextParentEmails;
    persistAcademicState();

    recordAuditLog({
      actor,
      category: "ADMIN_ACTION",
      action: "STUDENT_DETAILS_UPDATED",
      targetType: "student",
      targetId: student.id,
      details: `Updated student ${student.admNo} (${student.name}, status=${student.status})`,
    });

    return res.json({ success: true, student });
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
    if (!canManageStudents(actor)) {
      return res.status(403).json({ success: false, error: "Student management permission required." });
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
    recordAuditLog({
      actor,
      category: "ADMIN_ACTION",
      action: "STUDENT_CLASS_UPDATED",
      targetType: "student",
      targetId: student.id,
      details: `Placed student ${student.name} into class ${classId || "Unassigned"}`,
    });
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

/**
 * GET /api/school/institutions/:instId/operations
 * Returns timetables, lesson plans, discipline records (staff/parent-scoped), assignments, parent messages, transport & inventory
 */
academicsRouter.get(
  "/institutions/:instId/operations",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const { instId } = req.params;
    ensureInstitution(instId);
    const isStaff = canManageAcademics(actor);
    const emailLower = actor.email.toLowerCase();

    const timetables = Object.values(academicState.timetables).filter((t) => t.institutionId === instId);
    const lessonPlans = isStaff
      ? Object.values(academicState.lessonPlans).filter((l) => l.institutionId === instId)
      : [];
    const disciplineRecords = isStaff
      ? Object.values(academicState.disciplineRecords).filter((d) => d.institutionId === instId)
      : Object.values(academicState.disciplineRecords).filter((d) => {
          const stu = academicState.students[d.studentId];
          return (
            d.institutionId === instId &&
            stu &&
            (stu.studentEmail?.toLowerCase() === emailLower ||
              stu.parentEmails?.some((p) => p.toLowerCase() === emailLower))
          );
        });
    const assignments = Object.values(academicState.assignments)
      .filter((a) => a.institutionId === instId)
      .map((a) => ({
        ...a,
        submissions: isStaff
          ? a.submissions
          : a.submissions.filter((sub) => sub.studentEmail.toLowerCase() === emailLower),
      }));
    const parentMessages = Object.values(academicState.parentMessages).filter(
      (m) =>
        m.institutionId === instId &&
        (isStaff ||
          m.senderEmail.toLowerCase() === emailLower ||
          m.recipientEmail.toLowerCase() === emailLower ||
          m.recipientEmail === "all-parents")
    );
    const transportRoutes = Object.values(academicState.transportRoutes).filter((t) => t.institutionId === instId);
    const inventoryItems = isStaff
      ? Object.values(academicState.inventoryItems).filter((i) => i.institutionId === instId)
      : [];
    const calendarEvents = Object.values(academicState.calendarEvents)
      .filter((c) => c.institutionId === instId)
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      success: true,
      timetables,
      lessonPlans,
      disciplineRecords,
      assignments,
      parentMessages,
      transportRoutes,
      inventoryItems,
      calendarEvents,
    });
  }
);

academicsRouter.post(
  "/institutions/:instId/calendar",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required to add calendar events." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);

    const title = String(req.body?.title || "").trim();
    const category = (["event", "holiday", "exam", "meeting"].includes(req.body?.category)
      ? req.body.category
      : "event") as "event" | "holiday" | "exam" | "meeting";
    const date = String(req.body?.date || new Date().toISOString().slice(0, 10)).trim();
    const endDate = req.body?.endDate ? String(req.body.endDate).trim() : undefined;
    const description = String(req.body?.description || "").trim();

    if (!title || !date) {
      return res.status(400).json({ success: false, error: "Event title and date are required." });
    }

    const id = generateAcademicId("cal");
    academicState.calendarEvents[id] = {
      id,
      institutionId: instId,
      title,
      category,
      date,
      endDate,
      description,
      createdBy: actor.name,
    };
    persistAcademicState();

    recordAuditLog({
      actor,
      category: "ADMIN_ACTION",
      action: "ACADEMIC_CALENDAR_EVENT_CREATED",
      targetType: "calendar_event",
      targetId: id,
      details: `Created calendar event "${title}" (${category}) on ${date}`,
    });

    return res.status(201).json({ success: true, event: academicState.calendarEvents[id] });
  }
);

academicsRouter.delete(
  "/calendar/:id",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const eventId = req.params.id;
    if (!academicState.calendarEvents[eventId]) {
      return res.status(404).json({ success: false, error: "Calendar event not found." });
    }
    delete academicState.calendarEvents[eventId];
    persistAcademicState();
    return res.json({ success: true });
  }
);

academicsRouter.post(
  "/institutions/:instId/timetable",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);
    const classId = String(req.body?.classId || "").trim();
    const day = String(req.body?.day || "Monday").trim();
    const timeSlot = String(req.body?.timeSlot || "").trim();
    const subjectName = String(req.body?.subjectName || "").trim();
    const teacherName = String(req.body?.teacherName || actor.name).trim();
    const room = String(req.body?.room || "Main Hall").trim();
    if (!classId || !timeSlot || !subjectName) {
      return res.status(400).json({ success: false, error: "Class, time slot, and subject are required." });
    }
    const id = generateAcademicId("tt");
    academicState.timetables[id] = { id, institutionId: instId, classId, day, timeSlot, subjectName, teacherName, room };
    persistAcademicState();
    return res.status(201).json({ success: true, slot: academicState.timetables[id] });
  }
);

academicsRouter.post(
  "/institutions/:instId/lesson-plans",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);
    const classId = String(req.body?.classId || "").trim();
    const subjectName = String(req.body?.subjectName || "").trim();
    const topic = String(req.body?.topic || "").trim();
    const objectives = String(req.body?.objectives || "").trim();
    const date = String(req.body?.date || new Date().toISOString().slice(0, 10)).trim();
    if (!topic || !subjectName) {
      return res.status(400).json({ success: false, error: "Subject and topic are required." });
    }
    const id = generateAcademicId("lp");
    academicState.lessonPlans[id] = {
      id,
      institutionId: instId,
      classId,
      subjectName,
      topic,
      objectives,
      teacherEmail: actor.email.toLowerCase(),
      date,
    };
    persistAcademicState();
    return res.status(201).json({ success: true, lessonPlan: academicState.lessonPlans[id] });
  }
);

academicsRouter.post(
  "/institutions/:instId/discipline",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);
    const studentId = String(req.body?.studentId || "").trim();
    const stu = academicState.students[studentId];
    const studentName = stu?.name || String(req.body?.studentName || "").trim();
    const category = (["Commendation", "Late Arrival", "Conduct Warning", "Counseling"].includes(req.body?.category)
      ? req.body.category
      : "Commendation") as "Commendation" | "Late Arrival" | "Conduct Warning" | "Counseling";
    const notes = String(req.body?.notes || "").trim();
    const actionTaken = String(req.body?.actionTaken || "").trim();
    if (!studentName || !notes) {
      return res.status(400).json({ success: false, error: "Student and notes are required." });
    }
    const id = generateAcademicId("disc");
    academicState.disciplineRecords[id] = {
      id,
      institutionId: instId,
      studentId,
      studentName,
      category,
      notes,
      actionTaken,
      recordedBy: actor.name,
      date: new Date().toISOString().slice(0, 10),
    };
    persistAcademicState();
    return res.status(201).json({ success: true, record: academicState.disciplineRecords[id] });
  }
);

academicsRouter.post(
  "/institutions/:instId/assignments",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);
    const classId = String(req.body?.classId || "").trim();
    const subjectName = String(req.body?.subjectName || "").trim();
    const title = String(req.body?.title || "").trim();
    const instructions = String(req.body?.instructions || "").trim();
    const dueDate = String(req.body?.dueDate || "").trim();
    if (!title || !subjectName) {
      return res.status(400).json({ success: false, error: "Subject and title are required." });
    }
    const id = generateAcademicId("asg");
    academicState.assignments[id] = {
      id,
      institutionId: instId,
      classId,
      subjectName,
      title,
      instructions,
      dueDate,
      createdBy: actor.email.toLowerCase(),
      submissions: [],
    };
    persistAcademicState();
    return res.status(201).json({ success: true, assignment: academicState.assignments[id] });
  }
);

academicsRouter.post(
  "/assignments/:id/submit",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const asg = academicState.assignments[req.params.id];
    if (!asg) return res.status(404).json({ success: false, error: "Assignment not found." });
    const answerText = String(req.body?.answerText || "").trim();
    if (!answerText) return res.status(400).json({ success: false, error: "Submission answer is required." });

    const emailLower = actor.email.toLowerCase();
    asg.submissions = asg.submissions.filter((s) => s.studentEmail.toLowerCase() !== emailLower);
    asg.submissions.push({
      studentEmail: emailLower,
      studentName: actor.name,
      answerText: answerText.slice(0, 4000),
      submittedAt: new Date().toISOString(),
    });
    persistAcademicState();
    return res.status(201).json({ success: true, assignment: asg });
  }
);

academicsRouter.post(
  "/institutions/:instId/parent-messages",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    const { instId } = req.params;
    ensureInstitution(instId);
    const recipientEmail = String(req.body?.recipientEmail || "all-parents").trim().toLowerCase();
    const subject = String(req.body?.subject || "").trim();
    const body = String(req.body?.body || "").trim();
    if (!subject || !body) {
      return res.status(400).json({ success: false, error: "Subject and message body are required." });
    }
    const id = generateAcademicId("pm");
    academicState.parentMessages[id] = {
      id,
      institutionId: instId,
      senderName: actor.name,
      senderEmail: actor.email.toLowerCase(),
      recipientEmail,
      subject: subject.slice(0, 140),
      body: body.slice(0, 3000),
      createdAt: new Date().toISOString(),
    };
    persistAcademicState();
    return res.status(201).json({ success: true, message: academicState.parentMessages[id] });
  }
);

academicsRouter.post(
  "/institutions/:instId/transport",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);
    const routeName = String(req.body?.routeName || "").trim();
    const vehicleReg = String(req.body?.vehicleReg || "").trim();
    const driverName = String(req.body?.driverName || "").trim();
    const departureTime = String(req.body?.departureTime || "06:30 AM").trim();
    const stops = String(req.body?.stops || "").trim();
    const assignedCount = Math.max(0, Number(req.body?.assignedCount || 0));
    if (!routeName || !vehicleReg) {
      return res.status(400).json({ success: false, error: "Route name and vehicle registration are required." });
    }
    const id = generateAcademicId("tr");
    academicState.transportRoutes[id] = {
      id,
      institutionId: instId,
      routeName,
      vehicleReg,
      driverName,
      departureTime,
      stops,
      assignedCount,
    };
    persistAcademicState();
    return res.status(201).json({ success: true, route: academicState.transportRoutes[id] });
  }
);

academicsRouter.post(
  "/institutions/:instId/inventory",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.identity!;
    if (!canManageAcademics(actor)) {
      return res.status(403).json({ success: false, error: "Staff permission required." });
    }
    const { instId } = req.params;
    ensureInstitution(instId);
    const name = String(req.body?.name || "").trim();
    const category = String(req.body?.category || "Equipment").trim();
    const quantity = Math.max(0, Number(req.body?.quantity || 0));
    const condition = (["Good", "Needs Repair", "Low Stock"].includes(req.body?.condition)
      ? req.body.condition
      : "Good") as "Good" | "Needs Repair" | "Low Stock";
    const location = String(req.body?.location || "Store").trim();
    if (!name) {
      return res.status(400).json({ success: false, error: "Inventory item name is required." });
    }
    const id = generateAcademicId("inv");
    academicState.inventoryItems[id] = { id, institutionId: instId, name, category, quantity, condition, location };
    persistAcademicState();
    return res.status(201).json({ success: true, item: academicState.inventoryItems[id] });
  }
);
