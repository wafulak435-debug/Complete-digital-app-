// Client-side Google Workspace API helpers using the in-memory OAuth access token.
// All write/mutating actions must be confirmed by the user in the UI prior to calling these functions.

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  enrollmentCode?: string;
  courseState?: string;
  alternateLink?: string;
}

export interface ClassroomAnnouncement {
  id: string;
  courseId: string;
  text: string;
  creationTime?: string;
  alternateLink?: string;
}

export interface ClassroomCourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  maxPoints?: number;
  workType?: string;
  state?: string;
  alternateLink?: string;
}

export interface ClassroomMaterial {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  alternateLink?: string;
}

export interface ClassroomRosterMember {
  userId: string;
  name: string;
  email?: string;
  role: "Student" | "Teacher";
}

export interface MeetSpace {
  name: string;
  meetingUri: string;
  meetingCode: string;
}

export interface WorkspaceCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

export interface WorkspaceDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
}

export interface WorkspaceContact {
  resourceName: string;
  name: string;
  email: string;
  phone: string;
}

async function googleApiFetch<T = any>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  if (!token) {
    throw new Error("Please sign in with Google to connect Google Workspace.");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers ? (options.headers as Record<string, string>) : {}),
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const errJson = await res.json();
      msg = errJson?.error?.message || msg;
    } catch {
      const txt = await res.text().catch(() => "");
      if (txt) msg = txt;
    }
    throw new Error(msg);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// ---------------------------------------------------------------------------
// GOOGLE CLASSROOM
// ---------------------------------------------------------------------------

export async function listClassroomCourses(token: string): Promise<ClassroomCourse[]> {
  const data = await googleApiFetch<{ courses?: ClassroomCourse[] }>(
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=20",
    token
  );
  return data.courses || [];
}

export async function createClassroomCourse(
  token: string,
  input: { name: string; section?: string; descriptionHeading?: string; room?: string }
): Promise<ClassroomCourse> {
  return googleApiFetch<ClassroomCourse>("https://classroom.googleapis.com/v1/courses", token, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      section: input.section || undefined,
      descriptionHeading: input.descriptionHeading || "Zion Digital Leadership & Bible School",
      room: input.room || "Online / Bungoma Campus",
      ownerId: "me",
    }),
  });
}

export async function listCourseAnnouncements(
  token: string,
  courseId: string
): Promise<ClassroomAnnouncement[]> {
  const data = await googleApiFetch<{ announcements?: ClassroomAnnouncement[] }>(
    `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/announcements?pageSize=15`,
    token
  );
  return data.announcements || [];
}

export async function createCourseAnnouncement(
  token: string,
  courseId: string,
  text: string
): Promise<ClassroomAnnouncement> {
  return googleApiFetch<ClassroomAnnouncement>(
    `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/announcements`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ text, state: "PUBLISHED" }),
    }
  );
}

export async function listCourseWork(
  token: string,
  courseId: string
): Promise<ClassroomCourseWork[]> {
  const data = await googleApiFetch<{ courseWork?: ClassroomCourseWork[] }>(
    `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork?pageSize=20`,
    token
  );
  return data.courseWork || [];
}

export async function createCourseWork(
  token: string,
  courseId: string,
  input: { title: string; description?: string; maxPoints?: number }
): Promise<ClassroomCourseWork> {
  return googleApiFetch<ClassroomCourseWork>(
    `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWork`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        description: input.description || "",
        workType: "ASSIGNMENT",
        maxPoints: input.maxPoints ?? 100,
        state: "PUBLISHED",
      }),
    }
  );
}

export async function listCourseMaterials(
  token: string,
  courseId: string
): Promise<ClassroomMaterial[]> {
  const data = await googleApiFetch<{ courseWorkMaterial?: ClassroomMaterial[] }>(
    `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/courseWorkMaterials?pageSize=20`,
    token
  );
  return data.courseWorkMaterial || [];
}

export async function listCourseRoster(
  token: string,
  courseId: string
): Promise<ClassroomRosterMember[]> {
  const [teachersRes, studentsRes] = await Promise.all([
    googleApiFetch<{ teachers?: any[] }>(
      `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/teachers?pageSize=20`,
      token
    ).catch(() => ({ teachers: [] })),
    googleApiFetch<{ students?: any[] }>(
      `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(courseId)}/students?pageSize=50`,
      token
    ).catch(() => ({ students: [] })),
  ]);

  const teachers: ClassroomRosterMember[] = (teachersRes.teachers || []).map((t: any) => ({
    userId: t.userId,
    name: t.profile?.name?.fullName || "Faculty Instructor",
    email: t.profile?.emailAddress || undefined,
    role: "Teacher",
  }));

  const students: ClassroomRosterMember[] = (studentsRes.students || []).map((s: any) => ({
    userId: s.userId,
    name: s.profile?.name?.fullName || "Enrolled Scholar",
    email: s.profile?.emailAddress || undefined,
    role: "Student",
  }));

  return [...teachers, ...students];
}

// ---------------------------------------------------------------------------
// GOOGLE MEET
// ---------------------------------------------------------------------------

export async function createMeetSpace(token: string): Promise<MeetSpace> {
  return googleApiFetch<MeetSpace>("https://meet.googleapis.com/v2/spaces", token, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// ---------------------------------------------------------------------------
// GOOGLE CALENDAR
// ---------------------------------------------------------------------------

export async function listCalendarEvents(
  token: string,
  maxResults = 15
): Promise<WorkspaceCalendarEvent[]> {
  const timeMin = new Date().toISOString();
  const data = await googleApiFetch<{ items?: WorkspaceCalendarEvent[] }>(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
    token
  );
  return data.items || [];
}

export async function createCalendarEvent(
  token: string,
  input: {
    summary: string;
    description?: string;
    date: string;
    time: string;
    durationMinutes?: number;
    addMeetLink?: boolean;
  }
): Promise<WorkspaceCalendarEvent> {
  const startDate = new Date(`${input.date}T${input.time}:00`);
  const endDate = new Date(startDate.getTime() + (input.durationMinutes || 60) * 60000);

  const payload: any = {
    summary: input.summary,
    description: input.description || "Zion Digital School Live Session",
    start: { dateTime: startDate.toISOString() },
    end: { dateTime: endDate.toISOString() },
  };

  if (input.addMeetLink) {
    payload.conferenceData = {
      createRequest: {
        requestId: `zion_${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const query = input.addMeetLink ? "?conferenceDataVersion=1" : "";
  return googleApiFetch<WorkspaceCalendarEvent>(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events${query}`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

// ---------------------------------------------------------------------------
// GOOGLE DRIVE & DOCS
// ---------------------------------------------------------------------------

export async function listDriveFiles(token: string): Promise<WorkspaceDriveFile[]> {
  const fields = encodeURIComponent("files(id,name,mimeType,webViewLink,modifiedTime,size)");
  const data = await googleApiFetch<{ files?: WorkspaceDriveFile[] }>(
    `https://www.googleapis.com/drive/v3/files?pageSize=20&orderBy=modifiedTime desc&fields=${fields}`,
    token
  );
  return data.files || [];
}

export async function createDriveGoogleDoc(
  token: string,
  title: string,
  plainTextContent: string
): Promise<WorkspaceDriveFile> {
  const metadata = {
    name: title,
    mimeType: "application/vnd.google-apps.document",
  };
  const boundary = `zion_boundary_${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/plain; charset=UTF-8\r\n\r\n` +
    `${plainTextContent}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,modifiedTime",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (!res.ok) {
    const errTxt = await res.text().catch(() => res.statusText);
    throw new Error(`Failed to create Google Doc: ${errTxt}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// GOOGLE FORMS
// ---------------------------------------------------------------------------

export async function createGoogleForm(
  token: string,
  title: string
): Promise<{ formId: string; responderUri?: string; info?: { title?: string } }> {
  return googleApiFetch("https://forms.googleapis.com/v1/forms", token, {
    method: "POST",
    body: JSON.stringify({
      info: {
        title,
        documentTitle: title,
      },
    }),
  });
}

// ---------------------------------------------------------------------------
// GOOGLE CONTACTS & CHAT
// ---------------------------------------------------------------------------

export async function listGoogleContacts(token: string): Promise<WorkspaceContact[]> {
  const data = await googleApiFetch<{ connections?: any[] }>(
    "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=30",
    token
  );
  return (data.connections || []).map((c: any) => ({
    resourceName: c.resourceName,
    name: c.names?.[0]?.displayName || "Unnamed Contact",
    email: c.emailAddresses?.[0]?.value || "",
    phone: c.phoneNumbers?.[0]?.value || "",
  }));
}

export async function listGoogleChatSpaces(token: string): Promise<Array<{ name: string; displayName?: string; spaceType?: string }>> {
  const data = await googleApiFetch<{ spaces?: any[] }>(
    "https://chat.googleapis.com/v1/spaces?pageSize=20",
    token
  );
  return data.spaces || [];
}
