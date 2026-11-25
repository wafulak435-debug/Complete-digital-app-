import React, { useEffect, useState, useCallback } from "react";
import {
  Clock,
  BookOpen,
  ShieldAlert,
  ClipboardCheck,
  MessageSquare,
  Bus,
  Package,
  BarChart3,
  Plus,
  Send,
  Video,
  CheckCircle2,
  Printer,
  Calendar,
  Trash2,
  Bell,
  BellRing,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { secureApiFetch } from "../lib/aiClient";
import { User } from "../types";

interface SchoolModulesPanelProps {
  instId: string;
  currentUser: User | null;
  isStaff: boolean;
  classes: { id: string; name: string; stream?: string; system?: string }[];
  students: { id: string; admNo: string; name: string; classId?: string }[];
  initialSubTab?: "timetable" | "discipline" | "assignments" | "communication" | "transport" | "analytics" | "calendar";
}

const ATTENDANCE_TREND_DATA = [
  { week: "Wk 1", rate: 93, target: 95 },
  { week: "Wk 2", rate: 95, target: 95 },
  { week: "Wk 3", rate: 94, target: 95 },
  { week: "Wk 4", rate: 96, target: 95 },
  { week: "Wk 5", rate: 97, target: 95 },
  { week: "Wk 6", rate: 96, target: 95 },
];

const FEE_COLLECTION_DATA = [
  { month: "Jan", collected: 420000, target: 500000 },
  { month: "Feb", collected: 485000, target: 500000 },
  { month: "Mar", collected: 510000, target: 500000 },
  { month: "Apr", collected: 460000, target: 500000 },
  { month: "May", collected: 540000, target: 550000 },
];

export default function SchoolModulesPanel({
  instId,
  currentUser,
  isStaff,
  classes,
  students,
  initialSubTab = "timetable",
}: SchoolModulesPanelProps) {
  const [subTab, setSubTab] = useState<
    "timetable" | "discipline" | "assignments" | "communication" | "transport" | "analytics" | "calendar"
  >(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const [timetables, setTimetables] = useState<any[]>([]);
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [disciplineRecords, setDisciplineRecords] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [parentMessages, setParentMessages] = useState<any[]>([]);
  const [transportRoutes, setTransportRoutes] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [subscribedEventIds, setSubscribedEventIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ZION_SUBSCRIBED_CALENDAR_EVENTS") || "[]");
    } catch {
      return [];
    }
  });

  const handleToggleSubscribe = async (ev: any) => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted") {
        await Notification.requestPermission();
      }
    }
    setSubscribedEventIds((prev) => {
      const exists = prev.includes(ev.id);
      const next = exists ? prev.filter((id) => id !== ev.id) : [...prev, ev.id];
      localStorage.setItem("ZION_SUBSCRIBED_CALENDAR_EVENTS", JSON.stringify(next));
      setStatusMsg({
        type: "ok",
        text: exists
          ? `Unsubscribed from reminders for "${ev.title}".`
          : `Subscribed! You will receive a local reminder 1 day before "${ev.title}" (${ev.date}).`,
      });
      return next;
    });
  };

  // Calendar form state
  const [calTitle, setCalTitle] = useState("");
  const [calCategory, setCalCategory] = useState<"event" | "holiday" | "exam" | "meeting">("event");
  const [calDate, setCalDate] = useState(new Date().toISOString().slice(0, 10));
  const [calEndDate, setCalEndDate] = useState("");
  const [calDescription, setCalDescription] = useState("");

  // Forms
  const [ttClassId, setTtClassId] = useState(classes[0]?.id || "cls_form2_east");
  const [ttDay, setTtDay] = useState("Monday");
  const [ttTime, setTtTime] = useState("08:00 - 09:00");
  const [ttSubject, setTtSubject] = useState("");
  const [ttRoom, setTtRoom] = useState("Room 2A");

  const [lpTopic, setLpTopic] = useState("");
  const [lpSubject, setLpSubject] = useState("Mathematics");
  const [lpObjectives, setLpObjectives] = useState("");

  const [discStudentId, setDiscStudentId] = useState("");
  const [discStudentName, setDiscStudentName] = useState("");
  const [discCategory, setDiscCategory] = useState("Commendation");
  const [discNotes, setDiscNotes] = useState("");
  const [discAction, setDiscAction] = useState("");

  const [asgTitle, setAsgTitle] = useState("");
  const [asgSubject, setAsgSubject] = useState("Mathematics");
  const [asgDue, setAsgDue] = useState("2026-07-01");
  const [asgInstr, setAsgInstr] = useState("");
  const [submissionDrafts, setSubmissionDrafts] = useState<Record<string, string>>({});

  const [pmRecipient, setPmRecipient] = useState("all-parents");
  const [pmSubject, setPmSubject] = useState("");
  const [pmBody, setPmBody] = useState("");

  const [routeName, setRouteName] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [driverName, setDriverName] = useState("");
  const [stops, setStops] = useState("");

  const [invName, setInvName] = useState("");
  const [invCategory, setInvCategory] = useState("ICT Equipment");
  const [invQty, setInvQty] = useState("10");
  const [invLocation, setInvLocation] = useState("Main Store");

  const [virtualMeetingUrl, setVirtualMeetingUrl] = useState("https://meet.jit.si/ZionDigitalAcademyClassroom");

  const loadOperations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await secureApiFetch(`/api/school/institutions/${encodeURIComponent(instId)}/operations`);
      const data = await res.json();
      if (data.success) {
        setTimetables(data.timetables || []);
        setLessonPlans(data.lessonPlans || []);
        setDisciplineRecords(data.disciplineRecords || []);
        setAssignments(data.assignments || []);
        setParentMessages(data.parentMessages || []);
        setTransportRoutes(data.transportRoutes || []);
        setInventoryItems(data.inventoryItems || []);
        setCalendarEvents(data.calendarEvents || []);
      }
    } catch {
      // ignore
    }
  }, [instId, currentUser]);

  useEffect(() => {
    loadOperations();
  }, [loadOperations]);

  const postJson = async (url: string, body: unknown, okText: string) => {
    setStatusMsg(null);
    try {
      const res = await secureApiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMsg({ type: "err", text: data.error || "Action failed." });
        return false;
      }
      setStatusMsg({ type: "ok", text: okText });
      await loadOperations();
      return true;
    } catch (e: any) {
      setStatusMsg({ type: "err", text: e?.message || "Network error." });
      return false;
    }
  };

  const tabs = [
    { id: "calendar", label: "Academic Calendar", icon: Calendar },
    { id: "timetable", label: "Timetables & Lesson Plans", icon: Clock },
    { id: "assignments", label: "Assignments & Virtual Class", icon: ClipboardCheck },
    { id: "discipline", label: "Attendance & Discipline", icon: ShieldAlert },
    { id: "communication", label: "Parent–Teacher Desk", icon: MessageSquare },
    { id: "transport", label: "Transport & Inventory", icon: Bus },
    { id: "analytics", label: "Reports & Analytics", icon: BarChart3 },
  ] as const;

  return (
    <div className="space-y-5 text-left">
      {/* Sub-navigation bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                active
                  ? "bg-[#0B254D] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-[#F5B82E]" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {statusMsg && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-medium flex items-center justify-between ${
            statusMsg.type === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-rose-300 bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
          }`}
        >
          <span>{statusMsg.text}</span>
          <button type="button" onClick={() => setStatusMsg(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* 0. ACADEMIC CALENDAR */}
      {subTab === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#155EEF]" />
                  <span>Academic &amp; Term Calendar 2026</span>
                </h3>
                <p className="text-xs text-slate-500">Official school events, public holidays, exam dates, and parent meetings.</p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Calendar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {calendarEvents.map((ev) => {
                const catColor =
                  ev.category === "exam"
                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300"
                    : ev.category === "holiday"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300"
                    : ev.category === "meeting"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300";

                return (
                  <div key={ev.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${catColor}`}>
                          {ev.category}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-slate-500">
                          {ev.date} {ev.endDate ? `→ ${ev.endDate}` : ""}
                        </span>
                      </div>
                      <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">{ev.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{ev.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                      <span>By: {ev.createdBy}</span>
                      {isStaff && (
                        <button
                          type="button"
                          onClick={async () => {
                            await secureApiFetch(`/api/school/calendar/${encodeURIComponent(ev.id)}`, { method: "DELETE" });
                            loadOperations();
                          }}
                          className="text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {calendarEvents.length === 0 && (
                <div className="col-span-2 py-10 text-center text-slate-400 text-xs">
                  No academic calendar events recorded for this term.
                </div>
              )}
            </div>
          </div>

          {isStaff ? (
            <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div>
                <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                  Add Calendar Event
                </h3>
                <p className="text-xs text-slate-500">Schedule term dates, exams, holidays, or meetings.</p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postJson(
                    `/api/school/institutions/${encodeURIComponent(instId)}/calendar`,
                    { title: calTitle, category: calCategory, date: calDate, endDate: calEndDate || undefined, description: calDescription },
                    "Calendar event added."
                  );
                  if (ok) {
                    setCalTitle("");
                    setCalDescription("");
                    setCalEndDate("");
                  }
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block font-semibold mb-1">Event Title</label>
                  <input
                    required
                    value={calTitle}
                    onChange={(e) => setCalTitle(e.target.value)}
                    placeholder="e.g. End of Term Exams"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Category</label>
                    <select
                      value={calCategory}
                      onChange={(e: any) => setCalCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    >
                      <option value="event">School Event</option>
                      <option value="exam">Exam Date</option>
                      <option value="holiday">Holiday</option>
                      <option value="meeting">Parent Meeting</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={calDate}
                      onChange={(e) => setCalDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={calEndDate}
                    onChange={(e) => setCalEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Description / Notes</label>
                  <textarea
                    rows={3}
                    value={calDescription}
                    onChange={(e) => setCalDescription(e.target.value)}
                    placeholder="Provide details..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white font-semibold py-2.5 cursor-pointer"
                >
                  Publish to Calendar
                </button>
              </form>
            </div>
          ) : (
            <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                Academic Guidance
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Stay updated on upcoming term dates, holidays, and examination schedules. For event queries, contact the academic registrar's office.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 1. TIMETABLES & LESSON PLANNING */}
      {subTab === "timetable" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                  Class Weekly Timetable
                </h3>
                <p className="text-xs text-slate-500">Organized schedules across streams and learning halls.</p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2 pr-3">Day</th>
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Subject</th>
                    <th className="py-2 pr-3">Teacher</th>
                    <th className="py-2">Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {timetables.map((slot) => (
                    <tr key={slot.id}>
                      <td className="py-2.5 pr-3 font-semibold text-[#0B254D] dark:text-white">{slot.day}</td>
                      <td className="py-2.5 pr-3 font-mono text-[11px]">{slot.timeSlot}</td>
                      <td className="py-2.5 pr-3 font-medium">{slot.subjectName}</td>
                      <td className="py-2.5 pr-3 text-slate-500">{slot.teacherName}</td>
                      <td className="py-2.5 text-slate-500">{slot.room}</td>
                    </tr>
                  ))}
                  {timetables.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        No timetable slots recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {isStaff && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postJson(
                    `/api/school/institutions/${encodeURIComponent(instId)}/timetable`,
                    { classId: ttClassId, day: ttDay, timeSlot: ttTime, subjectName: ttSubject, room: ttRoom },
                    "Timetable slot saved."
                  );
                  if (ok) setTtSubject("");
                }}
                className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800"
              >
                <select
                  value={ttDay}
                  onChange={(e) => setTtDay(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
                >
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                <input
                  value={ttTime}
                  onChange={(e) => setTtTime(e.target.value)}
                  placeholder="08:00 - 09:00"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
                />
                <input
                  required
                  value={ttSubject}
                  onChange={(e) => setTtSubject(e.target.value)}
                  placeholder="Subject"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
                />
                <input
                  value={ttRoom}
                  onChange={(e) => setTtRoom(e.target.value)}
                  placeholder="Room"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-[#155EEF] text-white font-semibold text-xs px-3 py-2 cursor-pointer inline-flex items-center justify-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                Lesson Plans &amp; Curriculum Notes
              </h3>
              <p className="text-xs text-slate-500">Faculty weekly teaching objectives &amp; CBC strands.</p>
            </div>
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {lessonPlans.map((lp) => (
                <div
                  key={lp.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#155EEF]">{lp.subjectName}</span>
                    <span className="text-slate-400">{lp.date}</span>
                  </div>
                  <p className="text-xs font-bold text-[#0B254D] dark:text-white">{lp.topic}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{lp.objectives}</p>
                </div>
              ))}
              {lessonPlans.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">
                  {isStaff ? "No lesson plans added yet." : "Lesson plans are visible to faculty staff."}
                </p>
              )}
            </div>

            {isStaff && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postJson(
                    `/api/school/institutions/${encodeURIComponent(instId)}/lesson-plans`,
                    { classId: ttClassId, subjectName: lpSubject, topic: lpTopic, objectives: lpObjectives },
                    "Lesson plan published."
                  );
                  if (ok) {
                    setLpTopic("");
                    setLpObjectives("");
                  }
                }}
                className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800"
              >
                <input
                  required
                  value={lpSubject}
                  onChange={(e) => setLpSubject(e.target.value)}
                  placeholder="Subject (e.g. Mathematics)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  required
                  value={lpTopic}
                  onChange={(e) => setLpTopic(e.target.value)}
                  placeholder="Lesson topic..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <textarea
                  rows={2}
                  value={lpObjectives}
                  onChange={(e) => setLpObjectives(e.target.value)}
                  placeholder="Learning outcomes & competencies..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#0B254D] text-white font-semibold text-xs py-2 cursor-pointer"
                >
                  Save Lesson Plan
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 2. ASSIGNMENTS & VIRTUAL CLASSROOMS */}
      {subTab === "assignments" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                    Assignments &amp; Homework Portal
                  </h3>
                  <p className="text-xs text-slate-500">Submit coursework directly or review cohort submissions.</p>
                </div>
                <span className="rounded-lg bg-[#EFF6FF] text-[#155EEF] px-2.5 py-1 text-[11px] font-bold">
                  {assignments.length} Active Tasks
                </span>
              </div>

              <div className="space-y-3">
                {assignments.map((a) => {
                  const alreadySubmitted = a.submissions?.some(
                    (s: any) => s.studentEmail?.toLowerCase() === currentUser?.email?.toLowerCase()
                  );
                  return (
                    <div
                      key={a.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#155EEF]">
                            {a.subjectName} · Due {a.dueDate}
                          </span>
                          <h4 className="text-sm font-bold text-[#0B254D] dark:text-white">{a.title}</h4>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {a.submissions?.length || 0} submissions
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{a.instructions}</p>

                      {currentUser && (
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <input
                            type="text"
                            value={submissionDrafts[a.id] || ""}
                            onChange={(e) =>
                              setSubmissionDrafts((prev) => ({ ...prev, [a.id]: e.target.value }))
                            }
                            placeholder={
                              alreadySubmitted
                                ? "Update your homework response..."
                                : "Type your homework summary or Google Doc link..."
                            }
                            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const txt = (submissionDrafts[a.id] || "").trim();
                              if (!txt) return;
                              const ok = await postJson(
                                `/api/school/assignments/${encodeURIComponent(a.id)}/submit`,
                                { answerText: txt },
                                "Assignment submitted!"
                              );
                              if (ok) {
                                setSubmissionDrafts((prev) => ({ ...prev, [a.id]: "" }));
                              }
                            }}
                            className="rounded-xl bg-[#155EEF] text-white px-4 py-2 text-xs font-semibold cursor-pointer inline-flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{alreadySubmitted ? "Resubmit" : "Submit"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isStaff && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await postJson(
                      `/api/school/institutions/${encodeURIComponent(instId)}/assignments`,
                      {
                        classId: ttClassId,
                        subjectName: asgSubject,
                        title: asgTitle,
                        dueDate: asgDue,
                        instructions: asgInstr,
                      },
                      "Assignment posted to class."
                    );
                    if (ok) {
                      setAsgTitle("");
                      setAsgInstr("");
                    }
                  }}
                  className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2"
                >
                  <p className="text-xs font-bold text-[#0B254D] dark:text-white">Post New Assignment</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      required
                      value={asgSubject}
                      onChange={(e) => setAsgSubject(e.target.value)}
                      placeholder="Subject"
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                    />
                    <input
                      required
                      value={asgTitle}
                      onChange={(e) => setAsgTitle(e.target.value)}
                      placeholder="Assignment title"
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                    />
                    <input
                      type="date"
                      value={asgDue}
                      onChange={(e) => setAsgDue(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                    />
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={asgInstr}
                    onChange={(e) => setAsgInstr(e.target.value)}
                    placeholder="Instructions for students..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#0B254D] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                  >
                    Publish Assignment
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Virtual Classroom Panel */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-[#0B254D] to-[#123A78] text-white p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-[#F5B82E] text-[#0B254D] flex items-center justify-center">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold">Online Learning &amp; Virtual Classroom</h3>
                <p className="text-[11px] text-blue-200">Live lectures, revision sessions &amp; recorded seminars</p>
              </div>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/15 p-3.5 space-y-2 text-xs">
              <p className="font-semibold text-[#F5B82E]">Next Live Session: 10:00 AM EAT</p>
              <p className="text-blue-100 leading-relaxed">
                Join faculty-led CBC &amp; 8-4-4 interactive classes directly from phone or desktop.
              </p>
              {isStaff && (
                <input
                  value={virtualMeetingUrl}
                  onChange={(e) => setVirtualMeetingUrl(e.target.value)}
                  className="w-full rounded-lg bg-black/25 border border-white/20 px-3 py-1.5 text-xs text-white"
                  placeholder="Virtual classroom link..."
                />
              )}
              <a
                href={virtualMeetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#F5B82E] text-[#0B254D] font-bold px-4 py-2 text-xs hover:bg-[#E5A91E] transition"
              >
                <Video className="h-4 w-4" />
                <span>Join Virtual Classroom</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 3. DISCIPLINE & CONDUCT LOGS */}
      {subTab === "discipline" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
              Student Conduct &amp; Discipline Records
            </h3>
            <div className="space-y-2.5">
              {disciplineRecords.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#0B254D] dark:text-white">{d.studentName}</span>
                    <span className="rounded-md bg-[#EFF6FF] text-[#155EEF] px-2 py-0.5 text-[10px] font-bold">
                      {d.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{d.notes}</p>
                  <p className="text-[11px] text-slate-400">
                    Action: {d.actionTaken || "Logged"} · By {d.recordedBy} ({d.date})
                  </p>
                </div>
              ))}
              {disciplineRecords.length === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center">No conduct entries recorded yet.</p>
              )}
            </div>
          </div>

          {isStaff && (
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                Record Commendation or Conduct Note
              </h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postJson(
                    `/api/school/institutions/${encodeURIComponent(instId)}/discipline`,
                    {
                      studentId: discStudentId,
                      studentName: discStudentName,
                      category: discCategory,
                      notes: discNotes,
                      actionTaken: discAction,
                    },
                    "Conduct record saved."
                  );
                  if (ok) {
                    setDiscNotes("");
                    setDiscAction("");
                    setDiscStudentName("");
                  }
                }}
                className="space-y-2.5"
              >
                {students.length > 0 ? (
                  <select
                    value={discStudentId}
                    onChange={(e) => {
                      setDiscStudentId(e.target.value);
                      const found = students.find((s) => s.id === e.target.value);
                      if (found) setDiscStudentName(found.name);
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                  >
                    <option value="">Select enrolled student (or type below)...</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.admNo} · {s.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  required={!discStudentId}
                  value={discStudentName}
                  onChange={(e) => setDiscStudentName(e.target.value)}
                  placeholder="Student full name"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <select
                  value={discCategory}
                  onChange={(e) => setDiscCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                >
                  <option>Commendation</option>
                  <option>Late Arrival</option>
                  <option>Conduct Warning</option>
                  <option>Counseling</option>
                </select>
                <textarea
                  required
                  rows={2}
                  value={discNotes}
                  onChange={(e) => setDiscNotes(e.target.value)}
                  placeholder="Observation details..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  value={discAction}
                  onChange={(e) => setDiscAction(e.target.value)}
                  placeholder="Follow-up / guardian notification"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#155EEF] text-white font-semibold text-xs py-2 cursor-pointer"
                >
                  Save Conduct Log
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 4. PARENT-TEACHER COMMUNICATION */}
      {subTab === "communication" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
              Parent–Teacher Communication Log
            </h3>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {parentMessages.map((pm) => (
                <div
                  key={pm.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0B254D] dark:text-white">{pm.subject}</span>
                    <span className="text-[10px] text-slate-400">{pm.createdAt.slice(0, 10)}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{pm.body}</p>
                  <p className="text-[11px] text-[#155EEF]">
                    From {pm.senderName} → {pm.recipientEmail}
                  </p>
                </div>
              ))}
              {parentMessages.length === 0 && (
                <p className="text-xs text-slate-400 py-6 text-center">No parent–teacher dispatches yet.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
              Send Parent / Teacher Notice
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await postJson(
                  `/api/school/institutions/${encodeURIComponent(instId)}/parent-messages`,
                  { recipientEmail: pmRecipient, subject: pmSubject, body: pmBody },
                  "Message sent cleanly."
                );
                if (ok) {
                  setPmSubject("");
                  setPmBody("");
                }
              }}
              className="space-y-2.5"
            >
              <input
                value={pmRecipient}
                onChange={(e) => setPmRecipient(e.target.value)}
                placeholder="Parent/Teacher email or 'all-parents'"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
              />
              <input
                required
                value={pmSubject}
                onChange={(e) => setPmSubject(e.target.value)}
                placeholder="Subject (e.g. Term 2 Academic Clinic)"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
              />
              <textarea
                required
                rows={3}
                value={pmBody}
                onChange={(e) => setPmBody(e.target.value)}
                placeholder="Write update for parent or teacher..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-[#155EEF] text-white font-semibold text-xs py-2 cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. SCHOOL TRANSPORT & INVENTORY */}
      {subTab === "transport" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bus className="h-4 w-4 text-[#155EEF]" />
              <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                School Transport Routes
              </h3>
            </div>
            <div className="space-y-2.5">
              {transportRoutes.map((tr) => (
                <div key={tr.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-[#0B254D] dark:text-white">
                    <span>{tr.routeName}</span>
                    <span className="font-mono text-[#155EEF]">{tr.vehicleReg}</span>
                  </div>
                  <p className="text-slate-500">
                    Driver: {tr.driverName} · Departs {tr.departureTime} · {tr.assignedCount} students
                  </p>
                  <p className="text-[11px] text-slate-400">Stops: {tr.stops}</p>
                </div>
              ))}
            </div>
            {isStaff && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postJson(
                    `/api/school/institutions/${encodeURIComponent(instId)}/transport`,
                    { routeName, vehicleReg, driverName, stops },
                    "Transport route added."
                  );
                  if (ok) {
                    setRouteName("");
                    setVehicleReg("");
                    setDriverName("");
                    setStops("");
                  }
                }}
                className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800"
              >
                <input
                  required
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="Route name"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  required
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  placeholder="Bus reg (e.g. KDK 412Z)"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver name"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  value={stops}
                  onChange={(e) => setStops(e.target.value)}
                  placeholder="Key pickup stops"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="col-span-2 rounded-xl bg-[#0B254D] text-white font-semibold text-xs py-2 cursor-pointer"
                >
                  Add Transport Route
                </button>
              </form>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[#F5B82E]" />
              <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                Campus Assets &amp; Inventory
              </h3>
            </div>
            <div className="space-y-2.5">
              {inventoryItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-[#0B254D] dark:text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {item.category} · {item.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-[#155EEF]">{item.quantity}</span>
                    <span className="block text-[10px] text-emerald-600">{item.condition}</span>
                  </div>
                </div>
              ))}
              {inventoryItems.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">Inventory ledger is restricted to staff.</p>
              )}
            </div>
            {isStaff && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await postJson(
                    `/api/school/institutions/${encodeURIComponent(instId)}/inventory`,
                    { name: invName, category: invCategory, quantity: Number(invQty), location: invLocation },
                    "Inventory item added."
                  );
                  if (ok) setInvName("");
                }}
                className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800"
              >
                <input
                  required
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="Asset / stock item"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  value={invCategory}
                  onChange={(e) => setInvCategory(e.target.value)}
                  placeholder="Category"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  type="number"
                  min={1}
                  value={invQty}
                  onChange={(e) => setInvQty(e.target.value)}
                  placeholder="Quantity"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <input
                  value={invLocation}
                  onChange={(e) => setInvLocation(e.target.value)}
                  placeholder="Location"
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs"
                />
                <button
                  type="submit"
                  className="col-span-2 rounded-xl bg-[#155EEF] text-white font-semibold text-xs py-2 cursor-pointer"
                >
                  Log Inventory Stock
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. ADMIN REPORTS & ANALYTICS */}
      {subTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
              Attendance Trend (%)
            </h3>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ATTENDANCE_TREND_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="rate" name="Attendance %" stroke="#155EEF" fill="#155EEF" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
              Fee Collection Report (KES)
            </h3>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={FEE_COLLECTION_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Tooltip />
                  <Bar dataKey="collected" name="Collected KES" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" name="Target KES" fill="#F5B82E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
