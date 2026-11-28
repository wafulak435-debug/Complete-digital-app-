import { PREBUILT_LESSONS, BIBLE_LESSONS } from "../schoolCurriculum";

export interface SchoolCourseCatalogItem {
  id: string;
  courseId: string;
  courseCode: string;
  title: string;
  school: "leadership" | "bible";
  duration: string;
  feeKes: number;
}

export type SchoolCourseOption = SchoolCourseCatalogItem;

const LEADERSHIP_CODE_MAP: Record<string, string> = {
  visionary_leadership: "LDR-101",
  effective_communication: "LDR-102",
  team_building_delegation: "LDR-103",
  decision_making_crisis: "LDR-104",
  ethical_stewardship: "LDR-105",
  coding_full_stack: "ZIO01/001/26",
  robotics_automation: "ZIO03/001/26",
  graphic_design_branding: "ZIO04/001/26",
  motion_graphics: "ZIO05/001/26",
  video_editing_production: "ZIO06/001/26",
  maintenance_troubleshooting: "ZIO08/001/26",
  kenyan_digital_services: "ZIO07/001/26",
  computer_programming_office: "ZIO02/001/26",
};

const EXTRA_BIBLE_TRACK_COURSES: SchoolCourseCatalogItem[] = [
  { id: "old_testament", courseId: "old_testament", courseCode: "BIB-101", title: "Old Testament Survey & Hebrew Covenants", school: "bible", duration: "4 Months", feeKes: 0 },
  { id: "new_testament", courseId: "new_testament", courseCode: "BIB-102", title: "New Testament Epistles & Gospels", school: "bible", duration: "4 Months", feeKes: 0 },
  { id: "systematic_theology", courseId: "systematic_theology", courseCode: "BIB-103", title: "Biblical Theology & Christian Doctrine", school: "bible", duration: "5 Months", feeKes: 0 },
  { id: "hermeneutics", courseId: "hermeneutics", courseCode: "BIB-104", title: "Biblical Hermeneutics & Exegesis", school: "bible", duration: "3 Months", feeKes: 0 },
  { id: "homiletics_preaching", courseId: "homiletics_preaching", courseCode: "BIB-105", title: "Homiletics, Ministry & Pastoral Care", school: "bible", duration: "4 Months", feeKes: 0 },
  { id: "evangelism_missions_track", courseId: "evangelism_missions_track", courseCode: "BIB-106", title: "Evangelism & Global Missions", school: "bible", duration: "3 Months", feeKes: 0 },
  { id: "church_history", courseId: "church_history", courseCode: "BIB-107", title: "Church History & Apostolic Foundations", school: "bible", duration: "4 Months", feeKes: 0 },
  { id: "christian_ethics", courseId: "christian_ethics", courseCode: "BIB-108", title: "Christian Ethics & Family Stewardship", school: "bible", duration: "3 Months", feeKes: 0 },
  { id: "spiritual_formation", courseId: "spiritual_formation", courseCode: "BIB-109", title: "Prayer, Fasting & Spiritual Formation", school: "bible", duration: "3 Months", feeKes: 0 },
  { id: "apologetics", courseId: "apologetics", courseCode: "BIB-110", title: "Christian Apologetics & Worldview", school: "bible", duration: "4 Months", feeKes: 0 },
  { id: "eschatology", courseId: "eschatology", courseCode: "BIB-111", title: "Biblical Prophecy & Eschatology", school: "bible", duration: "3 Months", feeKes: 0 },
];

export const UNIFIED_SCHOOL_COURSES: SchoolCourseCatalogItem[] = (() => {
  const seen = new Set<string>();
  const list: SchoolCourseCatalogItem[] = [];

  for (const l of PREBUILT_LESSONS) {
    const code = l.courseCode || LEADERSHIP_CODE_MAP[l.id] || `LDR-${list.length + 101}`;
    if (!seen.has(l.id)) {
      seen.add(l.id);
      list.push({
        id: l.id,
        courseId: l.id,
        courseCode: code,
        title: l.topic,
        school: "leadership",
        duration: l.duration || "4 Months",
        feeKes: l.courseFee ?? 0,
      });
    }
  }

  for (const b of BIBLE_LESSONS) {
    const code = b.courseCode || `BIB-${list.length + 101}`;
    if (!seen.has(b.id)) {
      seen.add(b.id);
      list.push({
        id: b.id,
        courseId: b.id,
        courseCode: code,
        title: b.topic,
        school: "bible",
        duration: b.duration || "4 Months",
        feeKes: b.courseFee ?? 0,
      });
    }
  }

  for (const ex of EXTRA_BIBLE_TRACK_COURSES) {
    if (!seen.has(ex.courseId)) {
      seen.add(ex.courseId);
      list.push({
        ...ex,
        id: ex.courseId,
      });
    }
  }

  return list;
})();

export function findSchoolCourse(courseIdOrCode: string): SchoolCourseCatalogItem | undefined {
  const needle = String(courseIdOrCode || "").trim().toLowerCase();
  if (!needle) return undefined;
  return UNIFIED_SCHOOL_COURSES.find(
    (c) => c.courseId.toLowerCase() === needle || c.courseCode.toLowerCase() === needle
  );
}
