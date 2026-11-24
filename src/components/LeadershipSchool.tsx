import React, { useState, useEffect } from "react";
import { 
  Award, Globe, BookOpen, Lightbulb, Play, ArrowRight, ShieldCheck, 
  CheckCircle2, X, RefreshCw, Sparkles, BookCheck, ShieldAlert, 
  UserPlus, FileText, Landmark, GraduationCap, ArrowUpRight, CheckSquare, 
  Sparkle, Printer, Download, Eye, PenTool, UploadCloud, FolderOpen, 
  Plus, Trash2
} from "lucide-react";
import { User, Book } from "../types";
import { PREBUILT_LESSONS, BIBLE_LESSONS, Lesson, AssessmentQuestion } from "../schoolCurriculum";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { generateAccreditedCertificatePdf } from "../utils/pdfGenerator";
import { QRCodeGenerator } from "../utils/qrCode";
import AIChat from "./AIChat";
import { invokeGeminiAction, secureApiFetch } from "../lib/aiClient";
import zionLogo from "../assets/images/zion_digital_logo_1781070536038.png";


interface LeadershipSchoolProps {
  currentUser: User | null;
  onLogIn: () => void;
  onUnlockBadge: (badgeId: string) => void;
  unlockedBadges: string[];
  onNavigate?: (view: string) => void;
  books?: Book[];
  onAddNewBookDoc?: (book: Book) => void;
}

export default function LeadershipSchool({ 
  currentUser, 
  onLogIn, 
  onUnlockBadge, 
  unlockedBadges,
  onNavigate,
  books = [],
  onAddNewBookDoc
}: LeadershipSchoolProps) {
  // Check registration / admission status
  const [isAdmitted, setIsAdmitted] = useState<boolean>(() => {
    return localStorage.getItem("WAFULA_LS_ADMITTED") === "true";
  });

  // Admission form state
  const [admissionName, setAdmissionName] = useState("");
  const [admissionEmail, setAdmissionEmail] = useState("");
  const [admissionPassword, setAdmissionPassword] = useState("");
  const [admissionCountry, setAdmissionCountry] = useState("Kenya");
  const [isSubmittingAdmission, setIsSubmittingAdmission] = useState(false);

  // 5 Portals Navigation state (Student, Teacher, Financial, Certificate, Library)
  const [activePortal, setActivePortal] = useState<"student" | "teacher" | "financial" | "certificate" | "library">("student");

  // Load Portal Heads assigned by Admin
  const [headStudent, setHeadStudent] = useState(() => localStorage.getItem("ZION_PORTAL_HEAD_STUDENT") || "Dr. Catherine Nekesa");
  const [headTeacher, setHeadTeacher] = useState(() => localStorage.getItem("ZION_PORTAL_HEAD_TEACHER") || "Prof. Edwin Muliro");
  const [headFinance, setHeadFinance] = useState(() => localStorage.getItem("ZION_PORTAL_HEAD_FINANCE") || "Rev. Silas Wafula");
  const [headCertificate, setHeadCertificate] = useState(() => localStorage.getItem("ZION_PORTAL_HEAD_CERTIFICATE") || "Rev. Andrew Welime");
  const [headLibrary, setHeadLibrary] = useState(() => localStorage.getItem("ZION_PORTAL_HEAD_LIBRARY") || "Pastor Kelvin Opara");

  // Library fee paid status (Ksh 250)
  const [isLibraryPaid, setIsLibraryPaid] = useState(() => localStorage.getItem("WAFULA_LIBRARY_PAID") === "true");
  const [isProcessingLibraryPayment, setIsProcessingLibraryPayment] = useState(false);
  const [libraryPhone, setLibraryPhone] = useState("");

  // Faculty Roles & Strict Permission Gates
  const userRoleLower = (currentUser?.role || "").toLowerCase();
  const isUserTeacher = ["tutor", "faculty", "professor", "teacher"].includes(userRoleLower);
  const isUserAdmin =
    ["main_admin", "admin", "sub_admin", "manager"].includes(userRoleLower) ||
    Boolean(currentUser?.isMainAdmin);
  const isAuthorizedTeacher = isUserTeacher || isUserAdmin;
  const isUserAdminOrSeniorTeacher =
    isUserAdmin || ["faculty", "professor"].includes(userRoleLower);

  // Teacher Syllabus Workshop Editor states (confidential keys kept separate from public AssessmentQuestion)
  const [teacherSelectedMode, setTeacherSelectedMode] = useState<"create" | "update">("create");
  const [teacherSelectedLessonId, setTeacherSelectedLessonId] = useState<string>("");
  const [teacherLessonTopic, setTeacherLessonTopic] = useState("");
  const [teacherLessonSlogan, setTeacherLessonSlogan] = useState("");
  const [teacherLessonTrack, setTeacherLessonTrack] = useState<"leadership" | "computer" | "bible">("leadership");
  const [teacherLessonNotes, setTeacherLessonNotes] = useState("");
  const [teacherCustomQuestions, setTeacherCustomQuestions] = useState<AssessmentQuestion[]>([]);
  const [teacherDraftAnswerKeys, setTeacherDraftAnswerKeys] = useState<Record<number, { correctIndex: number; explanation?: string }>>({});
  const [isCompilingAILesson, setIsCompilingAILesson] = useState(false);

  const handleSelectLessonToUpdate = (lessonId: string) => {
    if (!lessonId) {
      setTeacherSelectedMode("create");
      setTeacherSelectedLessonId("");
      setTeacherLessonTopic("");
      setTeacherLessonSlogan("");
      setTeacherLessonNotes("");
      setTeacherCustomQuestions([]);
      setTeacherDraftAnswerKeys({});
      return;
    }
    
    // Find in active syllabus
    const found = activeLessonsList.find(l => l.id === lessonId) as any;
    if (found) {
      setTeacherSelectedMode("update");
      setTeacherSelectedLessonId(found.id);
      setTeacherLessonTopic(found.topic);
      setTeacherLessonSlogan(found.slogan);
      setTeacherLessonTrack((found.category as any) || "leadership");
      
      const contentText = found.lectures?.[0]?.content || found.points?.join("\n\n") || "";
      setTeacherLessonNotes(contentText);
      const rawQs = Array.isArray(found.selfAssessment) ? found.selfAssessment : [];
      setTeacherCustomQuestions(rawQs.map((q: any) => ({ question: q.question, options: q.options || [] })));
      const keysMap: Record<number, { correctIndex: number; explanation?: string }> = {};
      rawQs.forEach((q: any, idx: number) => {
        if (typeof q.correctIndex === "number") {
          keysMap[idx] = { correctIndex: q.correctIndex, explanation: q.explanation };
        }
      });
      setTeacherDraftAnswerKeys(keysMap);
    }
  };

  const handleCompileAILessonQuestions = async () => {
    if (!teacherLessonTopic.trim() || !teacherLessonNotes.trim()) {
      alert("Please enter the Topic Title and Lecture Notes first.");
      return;
    }
    setIsCompilingAILesson(true);
    try {
      const data = await invokeGeminiAction("compile-lecture-questions", "/api/ai/compile-lecture-questions", {
        topic: teacherLessonTopic,
        content: teacherLessonNotes
      });
      if (data.success && Array.isArray(data.questions)) {
        const sanitized: AssessmentQuestion[] = data.questions.map((q: any) => ({
          question: String(q.question || ""),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
        }));
        const keyMap: Record<number, { correctIndex: number; explanation?: string }> = {};
        data.questions.forEach((q: any, i: number) => {
          keyMap[i] = {
            correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
            explanation: typeof q.explanation === "string" ? q.explanation : undefined,
          };
        });
        setTeacherCustomQuestions(sanitized);
        setTeacherDraftAnswerKeys(keyMap);
        alert("Success: Compiled 3 quiz questions for this lecture draft.");
      } else {
        alert("Could not automatically compile quiz questions. Falling back to default assessments.");
      }
    } catch (e: any) {
      console.error(e);
      alert("Error compiling questions with AI.");
    } finally {
      setIsCompilingAILesson(false);
    }
  };

  const handlePublishOrUpdateSyllabus = () => {
    if (!teacherLessonTopic.trim() || !teacherLessonNotes.trim()) {
      alert("Please provide the topic title and detailed lecture notes.");
      return;
    }

    const points = teacherLessonNotes.split("\n\n").filter(p => p.trim());
    
    const finalQuestions: AssessmentQuestion[] = teacherCustomQuestions.length > 0
      ? teacherCustomQuestions
      : [
          {
            question: `Which fundamental aspect is highlighted under this custom lesson topic of "${teacherLessonTopic}"?`,
            options: ["Strategic integration", "Secondary validation rules", "Unverified random processes", "Complete bypass metrics"],
          }
        ];

    const targetLessonId = teacherSelectedMode === "update" && teacherSelectedLessonId
      ? teacherSelectedLessonId
      : `custom-less-${Date.now()}`;

    const customLesson = {
      id: targetLessonId,
      topic: teacherLessonTopic,
      slogan: teacherLessonSlogan || "Official Teacher Contributed Topic",
      courseCode: teacherLessonTrack === "computer" ? "COMP/ADV/AI" : teacherLessonTrack === "bible" ? "THEO/DIV/BIBLE" : "LEAD/STRAT/GOV",
      category: teacherLessonTrack,
      points: points.length > 5 ? points.slice(0, 5) : points,
      selfAssessment: finalQuestions,
      lectures: [
        {
          title: "Introduction",
          content: teacherLessonNotes
        }
      ]
    };

    const storedStr = localStorage.getItem("ZION_CUSTOM_TEACHER_LESSONS") || "[]";
    let storedList: any[] = [];
    try { storedList = JSON.parse(storedStr); } catch (_) {}

    if (teacherSelectedMode === "update") {
      const idx = storedList.findIndex(x => x.id === targetLessonId);
      if (idx > -1) {
        storedList[idx] = customLesson;
      } else {
        storedList.push(customLesson);
      }
    } else {
      storedList.push(customLesson);
    }

    localStorage.setItem("ZION_CUSTOM_TEACHER_LESSONS", JSON.stringify(storedList));
    
    alert(`Published "${teacherLessonTopic}" to the ${teacherLessonTrack.toUpperCase()} syllabus.`);
    
    setTeacherLessonTopic("");
    setTeacherLessonSlogan("");
    setTeacherLessonNotes("");
    setTeacherCustomQuestions([]);
    setTeacherDraftAnswerKeys({});
    setTeacherSelectedLessonId("");
    setTeacherSelectedMode("create");
    
    window.dispatchEvent(new Event("storage"));
  };

  // Course Completion Transcript Analytics helper
  const checkCourseCompletion = () => {
    if (!currentUser) return { completedAll: false, completedCount: 0, totalCount: 0 };
    
    const userMail = currentUser.email;
    const gradesKey = `WAFULA_STUDENT_GRADES_${userMail}`;
    const gradesStr = localStorage.getItem(gradesKey);
    let grades: Record<string, any> = {};
    if (gradesStr) {
      try { grades = JSON.parse(gradesStr); } catch (_) {}
    }

    const totalCount = activeLessonsList.length;
    let completedCount = 0;
    activeLessonsList.forEach(l => {
      if (grades[l.id] && grades[l.id].passed) {
        completedCount++;
      }
    });

    return {
      completedAll: completedCount === totalCount && totalCount > 0,
      completedCount,
      totalCount
    };
  };

  // Sync state intervals for portal heads & library payment
  useEffect(() => {
    const handleSync = () => {
      setHeadStudent(localStorage.getItem("ZION_PORTAL_HEAD_STUDENT") || "Dr. Catherine Nekesa");
      setHeadTeacher(localStorage.getItem("ZION_PORTAL_HEAD_TEACHER") || "Prof. Edwin Muliro");
      setHeadFinance(localStorage.getItem("ZION_PORTAL_HEAD_FINANCE") || "Rev. Silas Wafula");
      setHeadCertificate(localStorage.getItem("ZION_PORTAL_HEAD_CERTIFICATE") || "Rev. Andrew Welime");
      setHeadLibrary(localStorage.getItem("ZION_PORTAL_HEAD_LIBRARY") || "Pastor Kelvin Opara");
      
      const libPaid = localStorage.getItem("WAFULA_LIBRARY_PAID") === "true";
      if (libPaid !== isLibraryPaid) {
        setIsLibraryPaid(libPaid);
      }
    };
    const interval = setInterval(handleSync, 1200);
    return () => clearInterval(interval);
  }, [isLibraryPaid]);

  // Lesson states
  const [activeSchool, setActiveSchool] = useState<"leadership" | "bible" | "all">(() => {
    const saved = localStorage.getItem("WAFULA_ACTIVE_SCHOOL");
    if (saved === "bible" || saved === "all") return saved;
    return "leadership";
  });
  const activeLessonsList = (() => {
    let customLessons: Lesson[] = [];
    try {
      customLessons = JSON.parse(localStorage.getItem("ZION_CUSTOM_TEACHER_LESSONS") || "[]");
    } catch (_) {}

    let base: Lesson[] = [];
    if (activeSchool === "all") {
      base = [...PREBUILT_LESSONS, ...BIBLE_LESSONS];
    } else if (activeSchool === "bible") {
      base = [...BIBLE_LESSONS];
    } else {
      base = [...PREBUILT_LESSONS];
    }

    const filteredCustom = customLessons.filter((cl: any) => 
      activeSchool === "all" || cl.category === activeSchool
    );

    const updatedCombined = base.map(bLesson => {
      const customized = filteredCustom.find(cl => cl.id === bLesson.id);
      return customized ? customized : bLesson;
    });

    filteredCustom.forEach((cl: any) => {
      if (!updatedCombined.some(item => item.id === cl.id)) {
        updatedCombined.push(cl);
      }
    });

    return updatedCombined;
  })();

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // Custom states for 10-Question quiz generator & congratulations modal
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [congratsScore, setCongratsScore] = useState(0);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  
  // Custom topic builder
  const [customTopic, setCustomTopic] = useState("");
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [isGeneratingIllustration, setIsGeneratingIllustration] = useState(false);

  // Detailed AI study notes generator states
  const [detailedStudyNotes, setDetailedStudyNotes] = useState<string | null>(null);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  // Section-specific notes generator states
  const [generatingSectionKey, setGeneratingSectionKey] = useState<string | null>(null);
  const [generatedSectionNotes, setGeneratedSectionNotes] = useState<Record<string, string>>({});

  // General AI Teacher / Help Box
  const [aiTeacherQuestion, setAiTeacherQuestion] = useState("");
  const [aiTeacherAnswer, setAiTeacherAnswer] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);

  // Multi-question assessment state (Server-graded, timing enforced)
  const [studentAnswers, setStudentAnswers] = useState<{ [key: number]: number }>({});
  const [showAssessment, setShowAssessment] = useState(false);
  const [examAttemptId, setExamAttemptId] = useState<string | null>(null);
  const [examSecondsLeft, setExamSecondsLeft] = useState<number | null>(null);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<{
    score: number;
    passed: boolean;
    gradedFeedbackString: string;
    correctCount?: number;
    totalQuestions?: number;
    resultsReleased?: boolean;
    breakdown?: Record<number, { selectedIndex: number; correctIndex: number; isCorrect: boolean; explanation?: string }>;
  } | null>(null);

  useEffect(() => {
    if (!showAssessment || assessmentResult !== null || examSecondsLeft === null) return;
    if (examSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setExamSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showAssessment, assessmentResult, examSecondsLeft]);

  // Course Enrolment form states (Continuing / Repeat Enrolment Form)
  const [showEnrolmentModal, setShowEnrolmentModal] = useState(false);
  const [enrolmentType, setEnrolmentType] = useState<"new" | "continuing" | "repeat">("continuing");
  const [enrolmentStudentName, setEnrolmentStudentName] = useState("");
  const [enrolmentAdmNo, setEnrolmentAdmNo] = useState("");
  const [enrolmentPhone, setEnrolmentPhone] = useState("");
  const [enrolmentEmail, setEnrolmentEmail] = useState("");
  const [enrolmentSelectedCourseId, setEnrolmentSelectedCourseId] = useState("");
  const [enrolmentMpesaCode, setEnrolmentMpesaCode] = useState("");
  const [isSubmittingEnrolment, setIsSubmittingEnrolment] = useState(false);
  const [enrolmentList, setEnrolmentList] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ZION_ENROLMENTS") || "[]");
    } catch {
      return [];
    }
  });

  const handleLibraryRegister = () => {
    if (!libraryPhone) {
      alert("Please enter your Safaricom M-Pesa phone number to receive the prompt.");
      return;
    }
    setIsProcessingLibraryPayment(true);
    setTimeout(() => {
      setIsProcessingLibraryPayment(false);
      localStorage.setItem("WAFULA_LIBRARY_PAID", "true");
      setIsLibraryPaid(true);
      
      const currentEntries = JSON.parse(localStorage.getItem("ZION_LIBRARY_FEE_ENTRIES") || "[]");
      currentEntries.push({
        id: `lib-tx-${Date.now()}`,
        studentName: currentUser?.name || "Diligent Reader",
        studentPhone: libraryPhone,
        amount: 250,
        date: new Date().toLocaleString()
      });
      localStorage.setItem("ZION_LIBRARY_FEE_ENTRIES", JSON.stringify(currentEntries));

      alert("🎉 TRANSACTION APPROVED! KES 250 Library Matriculation fee successfully paid. Classroom library materials of Zion Constituent Schools are now fully unlocked!");
    }, 2000);
  };

  // Certificate rules
  const [isCertificatePaid, setIsCertificatePaid] = useState<boolean>(() => {
    return localStorage.getItem("WAFULA_LS_CERT_PAID") === "true";
  });
  const [certStatus, setCertStatus] = useState<"none" | "pending" | "approved">(() => {
    const userMail = currentUser?.email || "guest@wafula.com";
    const status = localStorage.getItem(`WAFULA_CERT_STATUS_${userMail}`);
    if (status === "approved" || status === "pending") return status;
    return "none";
  });
  const [certificateFee, setCertificateFee] = useState<number>(() => {
    const fee = localStorage.getItem("WAFULA_CERT_FEE");
    return fee ? parseInt(fee, 10) : 750; // default 750 KES
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState<"terms" | "privacy" | "accreditation" | null>(null);
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [showCertificateView, setShowCertificateView] = useState(false);

  // Categorized Library & Batch Uploader states
  const [pendingBooks, setPendingBooks] = useState<Array<{
    tempId: string;
    title: string;
    author: string;
    category: 'Leadership' | 'Technology' | 'Fiction' | 'Non-Fiction' | 'Business' | 'Self-Help' | 'Education' | 'Health' | 'Science' | 'Religion';
    description: string;
    fileName: string;
    fileSize: string;
    pages: number;
    pdfDataUrl?: string;
  }>>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeReadingBook, setActiveReadingBook] = useState<Book | null>(null);

  // Helper to add simulated academic reference books
  const handleSimulateBatchBooks = () => {
    const samples = [
      {
        tempId: `temp_sim_${Date.now()}_1`,
        title: "Dignified Statesmanship: Principles & Practice",
        author: "Kelvin Opara Wafula",
        category: "Leadership" as const,
        description: "A definitive guide to public service governance, accountability, and ethically centered constitutional administration models in Bungoma County.",
        fileName: "dignified_statesmanship.pdf",
        fileSize: "6.4MB",
        pages: 320
      },
      {
        tempId: `temp_sim_${Date.now()}_2`,
        title: "Compilers, Algorithms, & Sandboxed Interpreters",
        author: "Prof. Edwin Muliro",
        category: "Technology" as const,
        description: "An intensive academic text exploring parsers, byte compiling, and direct secure containerized process execution in high-concurrency Node.js and TypeScript ecosystems.",
        fileName: "compiler_and_interpreters.pdf",
        fileSize: "12.8MB",
        pages: 450
      },
      {
        tempId: `temp_sim_${Date.now()}_3`,
        title: "Rural Informatics & Decentralized Networks",
        author: "Dr. Catherine Nekesa",
        category: "Technology" as const,
        description: "Reviewing low-latency local Wi-Fi hotspots, solar telemetry routers, and mobile money ledger integrations across Bungoma agricultural sectors.",
        fileName: "rural_informatics.pdf",
        fileSize: "4.9MB",
        pages: 180
      }
    ];
    setPendingBooks(prev => [...prev, ...samples]);
    setSuccessMessage("Added 3 highly academic reference books to your pending upload queue! You can now verify and publish them.");
  };

  const handleMultipleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    const newItems = filesArray.map((rawFile, index) => {
      const file = rawFile as File;
      // Determine default category based on filename or activeSchool
      let defaultCat: 'Leadership' | 'Technology' = "Leadership";
      if (activeSchool === "computer" || file.name.toLowerCase().includes("code") || file.name.toLowerCase().includes("tech") || file.name.toLowerCase().includes("computer")) {
        defaultCat = "Technology";
      }

      // Format name nicely
      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, "") // Remove extension
        .replace(/[_-]/g, " ")   // Replace underscores/dashes with spaces
        .replace(/\b\w/g, c => c.toUpperCase()); // Capitalize

      return {
        tempId: `temp_f_${Date.now()}_${index}`,
        title: cleanTitle,
        author: currentUser?.name || "Academic Contributor",
        category: defaultCat,
        description: `Reference textbook and syllabus companion artifact for the academic division. File format: ${file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT'}.`,
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(1) + "MB",
        pages: Math.floor(Math.random() * 250) + 120
      };
    });

    setPendingBooks(prev => [...prev, ...newItems]);
    setSuccessMessage(`Successfully read ${filesArray.length} file metadata into your pending workspace! Adjust their titles or categories and click publish to save.`);
  };

  const handleRemovePendingBook = (tempId: string) => {
    setPendingBooks(prev => prev.filter(b => b.tempId !== tempId));
  };

  const handlePublishBatchBooks = () => {
    if (pendingBooks.length === 0) return;

    if (!onAddNewBookDoc) {
      alert("Error: Central library publisher callback not registered!");
      return;
    }

    pendingBooks.forEach(b => {
      const liveBook: Book = {
        id: `book_upload_school_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: b.title.trim() || b.fileName,
        author: b.author.trim() || "Anonymous Lecturer",
        price: 0, // Reference books in school are free study materials!
        category: b.category,
        description: b.description,
        coverImage: b.category === "Leadership" 
          ? "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=400&auto=format&fit=crop"
          : "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=400&auto=format&fit=crop",
        fileSize: b.fileSize,
        pages: b.pages,
        publishedDate: new Date().toISOString().split("T")[0],
        isFeatured: false,
        status: "active",
        rating: 5,
        reviewsCount: 1,
        pdfUrl: "", // Free online reference text content
        content: `### SECTOR REPORT & REFERENCE SYLLABUS TEXT: ${b.title.toUpperCase()}
Authored by ${b.author} | Zion Digital Library division.

This textbook serves as an approved reference manual under Zion Digital excellence guidelines.

#### Chapter 1: Philosophical Grounding & Theoretical Frameworks
Every sustainable curriculum demands absolute systematic foundation. In the leadership context, this translates to servant-stewardship theory, civic accountability, and ethical institutional architecture. In the computing division, it stands upon solid computational runtimes, state storage bounds, and compiler grammar patterns.
Research in Western Kenya shows that localized informatics can transform county development speed if integrated in local governance and school curriculum.

#### Chapter 2: Detailed Practical Execution & Bungoma Guidelines
Implementing these constructs in live municipal scenarios is the ultimate pedagogical crucible.
1. Formulate clear governance benchmarks with strict compliance parameters.
2. Deploy low-latency offline systems that enable continuous workflow, independent of cellular signal fluctuations.
3. Establish robust training programs where expert scholars pass practical, job-ready skills directly to cohorts.

#### Chapter 3: Advanced Strategic Case Studies & Regional Ledger
- **Case 1**: Agricultural trade automation utilizing localized USSD and SMS data structures, connecting local growers with national trade channels in Kanduyi and Webuye.
- **Case 2**: Ethical public finance dashboards tracking regional support ledgers, securing complete transparency for community development disbursements.

#### Chapter 4: Self-Directed Study Review & Exercises
Prepare for your master certifications by reviewing the definitions of absolute statesmanship or compiler optimizations. Re-draft your technical architecture block diagrams periodically to cement your capability.`,
        allowPreview: true,
        previewDuration: 120,
        isSynced: true
      };

      onAddNewBookDoc(liveBook);
    });

    const count = pendingBooks.length;
    setPendingBooks([]);
    setSuccessMessage(`Success! Published ${count} reference books directly into the school's digital library catalog. Your classmates can now study them inside their workspace.`);
  };

  // Sync state on load or change
  useEffect(() => {
    if (currentUser) {
      setAdmissionName(currentUser.name);
      setAdmissionEmail(currentUser.email);
      setEnrolmentStudentName(currentUser.name);
      setEnrolmentEmail(currentUser.email);
    }
    const adminSetted = localStorage.getItem("WAFULA_CERT_FEE");
    if (adminSetted) {
      setCertificateFee(parseInt(adminSetted, 10));
    }
  }, [currentUser]);

  const handleDownloadCertificatePdf = (forcedScore?: number) => {
    const isComp = activeSchool === "computer";
    const studentName = currentUser?.name || "The Academic Scholar";
    const studentEmail = currentUser?.email || "scholar@student.zion.ac.ke";
    const schoolName = isComp ? "Zion School of Computer Science & IT" : "Zion School of Leadership & Public Values";
    const courseTopic = isComp 
      ? "School of Computer Science & IT Syllabus" 
      : "School of Leadership & Public Values Syllabus";
    
    const parsedScore = forcedScore !== undefined ? forcedScore : (assessmentResult?.score || 90);
    const dateStr = new Date().toISOString().split("T")[0];
    const dlId = `dl_${Date.now()}`;
    const ledgerHash = `${studentName.substring(0, 3).toUpperCase()}-94A3B8-${Date.now().toString().slice(-4)}`;

    const verifyUrl = `${window.location.origin}/?view=verify&certId=${dlId}`;

    // 1. Generate core PDF
    generateAccreditedCertificatePdf({
      studentName,
      studentEmail,
      schoolName,
      courseTopic,
      score: parsedScore,
      ledgerHash,
      date: dateStr,
      verificationUrl: verifyUrl
    });

    // 2. Register download event in system WAFULA_CERT_DOWNLOADS (local cache)
    let currentDls: any[] = [];
    try {
      currentDls = JSON.parse(localStorage.getItem("WAFULA_CERT_DOWNLOADS") || "[]");
    } catch (_) {}

    const newDl = {
      id: dlId,
      name: studentName,
      email: studentEmail,
      schoolName,
      courseTopic,
      score: parsedScore,
      ledgerHash,
      date: dateStr,
      downloadedAt: new Date().toISOString()
    };

    currentDls.push(newDl);
    localStorage.setItem("WAFULA_CERT_DOWNLOADS", JSON.stringify(currentDls));

    // 3. Sync download event with Firestore "certificate_downloads" in real time!
    try {
      addDoc(collection(db, "certificate_downloads"), newDl).catch(e => console.warn("Firestore sync failed for certificate download logs:", e));
    } catch (e) {
      console.warn("Firestore collection sync warning:", e);
    }
  };

  // Sync certificate status continuously against localStorage
  useEffect(() => {
    const userMail = currentUser?.email || "guest@wafula.com";
    const checkCertStatus = () => {
      const status = localStorage.getItem(`WAFULA_CERT_STATUS_${userMail}`);
      if (status) {
        setCertStatus(status as "none" | "pending" | "approved");
      } else {
        const legacyPaid = localStorage.getItem("WAFULA_LS_CERT_PAID") === "true";
        setCertStatus(legacyPaid ? "approved" : "none");
      }
    };
    checkCertStatus();
    const interval = setInterval(checkCertStatus, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle Admission Proposal
  const handleAdmissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!admissionName || !admissionEmail) {
      alert("Please fill in high-integrity name and email credentials.");
      return;
    }
    setIsSubmittingAdmission(true);
    setTimeout(() => {
      localStorage.setItem("WAFULA_LS_ADMITTED", "true");
      setIsAdmitted(true);
      setIsSubmittingAdmission(false);
      onUnlockBadge("badge_3"); // Early Scholar badge
    }, 1200);
  };

  // Handle Continuing / Repeat Course Enrolment Form 2 proposal
  const handleEnrolmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrolmentStudentName || !enrolmentPhone || !enrolmentSelectedCourseId) {
      alert("Please enter Student Name, Contact Phone, and select reference Course.");
      return;
    }

    const selectedCourse = [...PREBUILT_LESSONS, ...BIBLE_LESSONS].find(c => c.id === enrolmentSelectedCourseId);
    if (!selectedCourse) {
      alert("Selected academy course could not be located in syllabus catalog.");
      return;
    }

    setIsSubmittingEnrolment(true);

    const mpesa = enrolmentMpesaCode.trim().toUpperCase() || `MPESA-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const codePrefix = selectedCourse.courseCode?.split('/')[0] || "ZIO01";
    // Eg format: ZIO01/001/26
    const computedAdmNo = enrolmentAdmNo.trim() || `${codePrefix}/${String(Math.floor(Math.random() * 89) + 11).padStart(3, '0')}/26`;

    const newEnrolment = {
      id: `enrol_${Date.now()}`,
      studentName: enrolmentStudentName,
      admNo: computedAdmNo,
      phone: enrolmentPhone,
      email: enrolmentEmail || currentUser?.email || "student@zion.ac.ke",
      courseId: enrolmentSelectedCourseId,
      courseTopic: selectedCourse.topic,
      courseCode: selectedCourse.courseCode || "ZIO01/001/26",
      courseFee: selectedCourse.courseFee || 2500,
      duration: selectedCourse.duration || "4 Months",
      enrolmentType,
      mpesaTransactionCode: mpesa,
      status: "pending",
      enrolledAt: new Date().toISOString()
    };

    secureApiFetch("/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEnrolment),
    }).catch(() => {});

    setTimeout(() => {
      const updatedList = [newEnrolment, ...enrolmentList];
      setEnrolmentList(updatedList);
      localStorage.setItem("ZION_ENROLMENTS", JSON.stringify(updatedList));

      // real-time Firestore synchronization
      try {
        addDoc(collection(db, "enrollments"), newEnrolment)
          .catch(e => console.warn("Firebase collection sync issue:", e));
      } catch (e) {
        console.warn("Firestore collection handler missing or blocked:", e);
      }

      setIsSubmittingEnrolment(false);
      setShowEnrolmentModal(false);
      
      // Reset some fields
      setEnrolmentPhone("");
      setEnrolmentMpesaCode("");

      alert(`🎓 CONGRATULATIONS!\n\nYour application for "${selectedCourse.topic}" has been registered in the Zion active ledger!\n\nOFFICIAL COURSE CODE: ${newEnrolment.courseCode}\nAUTOGENERATED ID: ${newEnrolment.admNo}\nTUITION COST: KES ${newEnrolment.courseFee.toLocaleString()}\nTRANSACTION CODE: ${newEnrolment.mpesaTransactionCode}\n\nYour student portal is activated for this track.`);
    }, 1500);
  };

  const handleStartLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setStudentAnswers({});
    setShowAssessment(false);
    setAssessmentResult(null);
    setDetailedStudyNotes(null);
  };

  // 1. AI Teacher - Master Course Topic & Assessments Generator (Full-Stack Powered)
  const handleGenerateCustom = async () => {
    if (!customTopic.trim()) return;
    setIsGeneratingCustom(true);
    setSelectedLesson(null);
    setStudentAnswers({});
    setShowAssessment(false);
    setAssessmentResult(null);
    setDetailedStudyNotes(null);

    const targetSchool = activeSchool;

    try {
      const data = await invokeGeminiAction("generate-class", "/api/school/generate-class", {
        topic: customTopic.trim(),
        schoolType: targetSchool
      });
      if (data.success && data.data) {
        const generated: Lesson = {
          id: "ai_class_" + Date.now(),
          topic: data.data.topic || customTopic.trim(),
          slogan: data.data.slogan || `Custom Topic: ${customTopic.trim()}`,
          intro: data.data.intro || "Introduction compiled successfully.",
          points: data.data.points || [],
          illustrationPrompt: data.data.illustrationPrompt || "",
          selfAssessment: data.data.selfAssessment || []
        };

        setSelectedLesson(generated);
        onUnlockBadge("badge_3");

        // trigger companion photo generation in background matching the prompt!
        if (generated.illustrationPrompt) {
          setIsGeneratingIllustration(true);
          try {
            const imgData = await invokeGeminiAction("generate-image", "/api/ai/generate-image", {
              prompt: generated.illustrationPrompt,
              aspectRatio: "16:9",
              hdMode: false
            });
            if (imgData.success && imgData.imageUrl) {
              setSelectedLesson(prev => {
                if (prev && prev.id === generated.id) {
                  return { ...prev, imageUrl: imgData.imageUrl };
                }
                return prev;
              });
            }
          } catch (err) {
            console.warn("Background illustration generation failed:", err);
          } finally {
            setIsGeneratingIllustration(false);
          }
        }
      } else {
        alert("The AI Classroom cluster returned an error. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Error contacting the school AI servers. Operating off-the-grid fallbacks.");
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  // 1b. Detailed AI study notes generator and Markdown Parser
  const handleGenerateDetailedNotes = async () => {
    if (!selectedLesson) return;
    setIsGeneratingNotes(true);
    setDetailedStudyNotes(null);

    try {
      const data = await invokeGeminiAction(
        "generate-notes",
        "/api/school/generate-notes",
        {
          topic: selectedLesson.topic,
          schoolType: activeSchool
        },
        {
          saveHistory: true,
          historyTitle: `School Notes: ${selectedLesson.topic}`,
          historyCategory: "Leadership & Bible School",
        }
      );
      if (data.success && data.notes) {
        setDetailedStudyNotes(data.notes);
      } else {
        alert("Failed to generate comprehensive notes. Falling back to offline study notes.");
        setDetailedStudyNotes(`## OFFLINE STUDY NOTES: ${selectedLesson.topic.toUpperCase()}\n\nUnable to reach live neural network servers. Please check your connection status.`);
      }
    } catch (err: any) {
      console.warn("Notes generation net error:", err);
      setDetailedStudyNotes(`## OFFLINE STUDY NOTES: ${selectedLesson.topic.toUpperCase()}\n\nFailed to establish online network trace to Bungoma servers. Ready offline.`);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const handleGenerateSectionNotes = async (pt: string, idx: number) => {
    if (!selectedLesson) return;
    const sectionKey = `${selectedLesson.id}_${idx}`;
    setGeneratingSectionKey(sectionKey);

    const sectionTitle = pt.split(":")[0];
    const sectionBrief = pt.split(":").slice(1).join(":") || pt;

    try {
      const data = await invokeGeminiAction("generate-section-notes", "/api/school/generate-section-notes", {
        topic: selectedLesson.topic,
        sectionTitle,
        sectionBrief,
        schoolType: activeSchool,
        sectionIndex: idx + 1
      });
      if (data.success && data.notes) {
        setGeneratedSectionNotes(prev => ({
          ...prev,
          [sectionKey]: data.notes
        }));
      } else {
        alert("Failed to generate comprehensive section notes. Readying fallback offline notes.");
        setGeneratedSectionNotes(prev => ({
          ...prev,
          [sectionKey]: `### Fallback Offline Study Guide: ${sectionTitle}\n\nUnable to reach live AI professor. Focus on: ${sectionBrief}`
        }));
      }
    } catch (err) {
      console.warn("Section notes generation network error:", err);
      setGeneratedSectionNotes(prev => ({
        ...prev,
        [sectionKey]: `### Fallback Offline Study Guide: ${sectionTitle}\n\nConnection disrupted. Core summary: ${sectionBrief}`
      }));
    } finally {
      setGeneratingSectionKey(null);
    }
  };

  const parseMarkdownToReact = (markdown: string) => {
    const lines = markdown.split("\n");
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={index} className="text-sm font-extrabold text-stone-900 dark:text-stone-100 mt-5 mb-2.5 font-display uppercase tracking-tight flex items-center border-b border-stone-200 dark:border-stone-800 pb-1.5">
            {trimmed.replace("## ", "")}
          </h2>
        );
      }
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={index} className="text-xs font-bold text-stone-850 dark:text-stone-200 mt-4 mb-2 uppercase tracking-wide">
            {trimmed.replace("### ", "")}
          </h3>
        );
      }
      if (trimmed.startsWith("- ")) {
        return (
          <li key={index} className="ml-5 list-disc text-stone-700 dark:text-stone-305 mb-1 leading-relaxed pl-1 select-text">
            {trimmed.replace("- ", "")}
          </li>
        );
      }
      if (trimmed.startsWith("* ")) {
        return (
          <li key={index} className="ml-5 list-disc text-stone-700 dark:text-stone-305 mb-1 leading-relaxed pl-1 select-text">
            {trimmed.replace("* ", "")}
          </li>
        );
      }
      if (trimmed.startsWith("1. ") || trimmed.startsWith("2. ") || trimmed.startsWith("3. ") || trimmed.startsWith("4. ") || trimmed.startsWith("5. ") || trimmed.startsWith("6. ") || trimmed.startsWith("7. ") || trimmed.startsWith("8. ") || trimmed.startsWith("9. ")) {
        return (
          <div key={index} className="ml-4 text-stone-700 dark:text-stone-305 mb-1.5 leading-relaxed pl-1 font-sans select-text">
            <strong>{trimmed.substring(0, 3)}</strong>{trimmed.substring(3)}
          </div>
        );
      }
      if (trimmed === "") {
        return <div key={index} className="h-2" />;
      }
      return (
        <p key={index} className="text-stone-700 dark:text-stone-305 mb-2 leading-relaxed text-xs pl-1 select-text">
          {trimmed}
        </p>
      );
    });
  };

  // 2. AI General Help Resolver
  const handleAskQuestion = async () => {
    if (!aiTeacherQuestion.trim()) return;
    setIsAskingAi(true);
    setAiTeacherAnswer("");

    try {
      const data = await invokeGeminiAction(
        "assistant",
        "/api/ai/assistant",
        {
          prompt: aiTeacherQuestion,
          category: "Problem Solver"
        },
        {
          saveHistory: true,
          historyTitle: `School Q&A: ${aiTeacherQuestion.slice(0, 60)}`,
          historyCategory: "Leadership & Bible School",
        }
      );
      if (data.success) {
        setAiTeacherAnswer(data.text);
      }
    } catch (e) {
      console.error(e);
      setAiTeacherAnswer(`📌 Offline Buffer: We noted offline fallback mode for: "${aiTeacherQuestion}".\n\nA Zion scholar handles strategic questions by creating strict logical partitions, assigning delegated roles to competent sub-officers, and keeping secure record entries in LocalStorage.`);
    } finally {
      setIsAskingAi(false);
    }
  };

  // 3. Server-verified Exam Attempt Start & Grading Submission
  const handleBeginAssessment = async () => {
    if (!selectedLesson) return;
    setStudentAnswers({});
    setAssessmentResult(null);
    setExamAttemptId(null);
    setExamSecondsLeft(null);
    setIsStartingExam(true);
    try {
      const res = await secureApiFetch(`/api/exams/${encodeURIComponent(selectedLesson.id)}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examTitle: selectedLesson.topic }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.attemptId) setExamAttemptId(data.attemptId);
        if (data.expiresAt) {
          const secs = Math.max(60, Math.round((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
          setExamSecondsLeft(secs);
        }
        if (Array.isArray(data.questions) && data.questions.length > 0) {
          setSelectedLesson((prev) =>
            prev
              ? {
                  ...prev,
                  selfAssessment: data.questions.map((q: any) => ({
                    question: q.question,
                    options: q.options || [],
                  })),
                }
              : prev
          );
        }
      }
    } catch {
      // Allow starting offline/custom topic assessment cleanly
    } finally {
      setIsStartingExam(false);
      setShowAssessment(true);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!selectedLesson || isSubmittingExam) return;
    if (!currentUser) {
      onLogIn();
      return;
    }

    setIsSubmittingExam(true);
    try {
      const res = await secureApiFetch(`/api/exams/${encodeURIComponent(selectedLesson.id)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: examAttemptId,
          answers: studentAnswers,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error || "Could not verify exam submission on server. Please sign in and retry.");
        return;
      }

      const scorePct = typeof data.score === "number" ? data.score : 0;
      const passed = Boolean(data.passed);
      const totalQ = typeof data.totalQuestions === "number" ? data.totalQuestions : selectedLesson.selfAssessment.length;
      const correctCount = typeof data.correctCount === "number" ? data.correctCount : Math.round((scorePct / 100) * totalQ);
      const breakdownMap: Record<number, { selectedIndex: number; correctIndex: number; isCorrect: boolean; explanation?: string }> = {};
      if (Array.isArray(data.breakdown)) {
        data.breakdown.forEach((entry: any, idx: number) => {
          const qIndex = typeof entry.questionIndex === "number" ? entry.questionIndex : idx;
          breakdownMap[qIndex] = {
            selectedIndex: entry.selectedIndex,
            correctIndex: entry.correctIndex,
            isCorrect: Boolean(entry.isCorrect),
            explanation: entry.explanation,
          };
        });
      }

      const userMail = currentUser.email;
      const gradesKey = `WAFULA_STUDENT_GRADES_${userMail}`;
      const existingGradesStr = localStorage.getItem(gradesKey);
      let grades: Record<string, { lessonId: string; topic: string; score: number; passed: boolean; completed: boolean; completedAt: string }> = {};
      if (existingGradesStr) {
        try {
          grades = JSON.parse(existingGradesStr);
        } catch (_) {}
      }
      grades[selectedLesson.id] = {
        lessonId: selectedLesson.id,
        topic: selectedLesson.topic,
        score: scorePct,
        passed,
        completed: true,
        completedAt: new Date().toISOString(),
      };
      localStorage.setItem(gradesKey, JSON.stringify(grades));

      if (passed) {
        onUnlockBadge("badge_3");
      }

      setCongratsScore(scorePct);
      setShowCongratsModal(true);

      setAssessmentResult({
        score: scorePct,
        passed,
        correctCount,
        totalQuestions: totalQ,
        resultsReleased: Boolean(data.resultsReleased),
        breakdown: breakdownMap,
        gradedFeedbackString: passed
          ? `Outstanding Success! Verified server score: ${scorePct}% (${correctCount}/${totalQ}). You have passed Zion Digital academic standards and may request your accredited Graduate Diploma.`
          : `Verified score: ${scorePct}% (${correctCount}/${totalQ}). Zion Digital mandates a minimum of 80% to pass. Review the course syllabus and re-attempt.`
      });
    } catch {
      alert("Unable to reach exam grading server. Please check your connection and retry.");
    } finally {
      setIsSubmittingExam(false);
    }
  };

  // AI-Powered Quiz Generator (Creates dense 10-Question Master Assessment)
  const handleGenerateQuiz10 = async () => {
    if (!selectedLesson) return;
    setIsGeneratingQuiz(true);
    setStudentAnswers({});
    setAssessmentResult(null);

    try {
      const data = await invokeGeminiAction("generate-quiz", "/api/school/generate-quiz", {
        topic: selectedLesson.topic,
        notes: JSON.stringify(selectedLesson.points)
      });
      if (data.success && data.questions) {
        setSelectedLesson(prev => {
          if (prev) {
            return {
              ...prev,
              selfAssessment: data.questions
            };
          }
          return prev;
        });
        setShowAssessment(true);
        alert(`🎓 SCHOLAR SUCCESS! Wafula AI Examiner successfully loaded 10 comprehensive academic questions for ${selectedLesson.topic}!`);
      } else {
        alert("Failed to render AI Quiz. Using high-caliber system fallbacks.");
      }
    } catch (e) {
      console.warn("AI generation offline or connection failed:", e);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };
  const handleCertPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPhone) {
      alert("Please provide valid Safaricom/Telecom mobile number.");
      return;
    }
    setIsPaying(true);
    setTimeout(() => {
      const userMail = currentUser?.email || "guest@wafula.com";
      localStorage.setItem(`WAFULA_CERT_STATUS_${userMail}`, "pending");
      localStorage.setItem("WAFULA_LS_CERT_PAID", "true"); // backup
      
      setCertStatus("pending");
      setIsCertificatePaid(true);
      setIsPaying(false);
      setShowPaymentModal(false);

      // Save to global admin-approver table
      const queue = JSON.parse(localStorage.getItem("WAFULA_CERT_REQUESTS") || "[]");
      const exists = queue.some((r: any) => r.email === userMail);
      if (!exists) {
        queue.push({
          id: "req_" + Date.now(),
          name: currentUser?.name || "Admitted Student",
          email: userMail,
          schoolName: activeSchool === "computer" ? "Zion School of Computer Science & IT" : "Zion School of Leadership & Public Values",
          date: new Date().toISOString().split("T")[0],
          status: "pending"
        });
        localStorage.setItem("WAFULA_CERT_REQUESTS", JSON.stringify(queue));
      }

      alert(`🎓 CONGRATULATIONS! Your filing fee of KES ${certificateFee} has been successfully authorized. Your official Diploma request has been dispatched to Chancellor Kelvin Opara Wafula's active review ledger.`);
    }, 2000);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  // UN-ADMITTED WELCOME VIEW
  if (!isAdmitted) {
    return (
      <div id="school_admissions_portal" className="mx-auto max-w-4xl px-4 py-12">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row transition-colors">
          
          {/* Cover Logo & Info Panel */}
          <div className="bg-[#2C241E] text-white p-8 md:w-1/2 flex flex-col justify-between text-left relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#3B2E25] to-[#1F1B18] opacity-90" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-2">
                <img 
                  src={zionLogo}
                  alt="Zion Digital Seal" 
                  className="h-24 w-24 object-contain rounded-full border-2 border-[#A8421B] shadow-md bg-[#FAF8F4] p-1" 
                />
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase block font-bold">OFFICIAL ACADEMY SEAL</span>
                  <span className="text-xs font-serif italic text-stone-200">Established in Covenant Integrity</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-red-100 bg-red-900/60 w-fit px-3.5 py-1 rounded-full text-[10px] font-bold font-mono border border-red-800/80">
                <GraduationCap className="h-4 w-4" />
                <span>ADMISSIONS ACTIVE FOR COHORT 2026</span>
              </div>
              <h2 className="font-display text-3xl font-black tracking-tight leading-tight">
                Zion Digital Leadership & Bible School
              </h2>
              <p className="text-xs text-red-100/90 leading-relaxed font-sans">
                A prestigious center modeled for absolute scholarly integrity and advanced digital skillsets. Serving with ethical standards to coordinate future statesman and code engineers across developing cohorts.
              </p>
            </div>

            <div className="relative z-10 pt-10 border-t border-red-900/60 space-y-3">
              <div className="flex items-center space-x-2.5 text-xs text-red-100">
                <CheckSquare className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Admissions: Global Executive & Advanced IT</span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs text-red-100">
                <CheckSquare className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Infinite Detailed AI Curriculum Topics</span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs text-red-100">
                <CheckSquare className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Accredited Academic PDF Diplomas</span>
              </div>
            </div>
            
            <p className="relative z-10 text-[9px] text-red-300/80 font-mono mt-8 uppercase tracking-wider">
              AUTHORIZED BY CHANCELLOR KELVIN OPARA WAFULA
            </p>
          </div>

          {/* Registration Admissions Panel */}
          <div className="p-8 md:w-1/2 flex flex-col justify-center text-left bg-stone-50 dark:bg-stone-900 transition-colors">
            <h3 className="text-xl font-black font-display text-stone-900 dark:text-stone-50">
              Apply for Scholar Admission
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-405 mt-1.5 mb-6">
              Establish your verified profile in our secure academy registry. Completing this step immediately unlocks all course syllabus tracks.
            </p>

            <form onSubmit={handleAdmissionSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-stone-400 dark:text-stone-500 font-bold block">
                  Graduate Scholar Name
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Scholar Kelvin Wafula"
                  value={admissionName}
                  onChange={(e) => setAdmissionName(e.target.value)}
                  className="w-full text-xs p-3.5 border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-950 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-stone-400 dark:text-stone-500 font-bold block">
                  Academic Email Address
                </label>
                <input 
                  type="email"
                  required
                  placeholder="scholar@domain.edu"
                  value={admissionEmail}
                  onChange={(e) => setAdmissionEmail(e.target.value)}
                  className="w-full text-xs p-3.5 border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-950 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-stone-400 dark:text-stone-500 font-bold block">
                  Security Passkey code
                </label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={admissionPassword}
                  onChange={(e) => setAdmissionPassword(e.target.value)}
                  className="w-full text-xs p-3.5 border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-950 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-700 text-stone-900 dark:text-stone-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-widest text-stone-400 dark:text-stone-500 block font-bold">
                  Socio-Academic Alignment
                </label>
                <select
                  value={admissionCountry}
                  onChange={(e) => setAdmissionCountry(e.target.value)}
                  className="w-full text-xs p-3.5 border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-950 rounded-xl focus:outline-none text-stone-900 dark:text-stone-100 cursor-pointer"
                >
                  <option value="Kenya">Kenya Alignment (East Africa)</option>
                  <option value="Nigeria">Nigeria Alignment (West Africa)</option>
                  <option value="South Africa">South Africa Alignment</option>
                  <option value="Uganda">Uganda Alignment</option>
                  <option value="United States">International Alignment</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAdmission}
                className="w-full py-3 bg-red-750 hover:bg-red-850 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition cursor-pointer disabled:opacity-50 mt-4 shadow-md flex items-center justify-center space-x-2"
              >
                {isSubmittingAdmission ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Verifying Admissions Registry...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Register Scholar Profile</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ACCREDITED CERTIFICATE DOWNLOAD VIEW (FULL SCREEN PRINTER ELEMENT)
  if (showCertificateView && certStatus === "approved") {
    const isComp = activeSchool === "computer";
    return (
      <div className="fixed inset-0 z-50 bg-stone-900 text-stone-905 flex flex-col overflow-y-auto p-4 sm:p-8 select-none font-sans print:bg-white print:p-0">
        
        {/* Certificate Actions Bar */}
        <div className="max-w-4xl w-full mx-auto bg-stone-800/90 dark:bg-stone-950/70 border border-stone-700/50 p-4 rounded-xl mb-6 flex flex-wrap justify-between items-center gap-3 print:hidden">
          <div className="flex items-center space-x-2.5">
            <GraduationCap className="h-5 w-5 text-amber-500" />
            <span className="text-white font-semibold text-xs uppercase tracking-wider">Accredited Scholar Certificate</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleDownloadCertificatePdf()}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black py-2 px-4 rounded-lg flex items-center space-x-1.5 transition cursor-pointer shadow-md select-none"
            >
              <Download className="h-4 w-4 text-amber-200" />
              <span>Download Direct PDF</span>
            </button>
            <button
              onClick={handlePrintCertificate}
              className="bg-stone-700 hover:bg-stone-605 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Printer className="h-4 w-4 text-stone-300" />
              <span>Print Frame</span>
            </button>
            <button
              onClick={() => setShowCertificateView(false)}
              className="bg-stone-800 hover:bg-stone-750 text-white text-xs font-bold py-2 px-4 rounded-lg transition cursor-pointer border border-stone-700"
            >
              Back to Campus
            </button>
          </div>
        </div>

        {/* HIGH QUALITY PRINT-READY CERTIFICATE SHEETS */}
        <div className="max-w-4xl w-full mx-auto bg-amber-50/15 border-11 border-double border-amber-600 rounded-3xl p-6 sm:p-14 relative shadow-2xl text-stone-900 font-sans aspect-[1.414/1] flex flex-col justify-between overflow-hidden bg-white print:shadow-none print:border-amber-600 print:my-0">
          
          {/* Filigree Corner Accents */}
          <div className="absolute top-4 left-4 h-16 w-16 border-t-4 border-l-4 border-amber-600 rounded-tl-xl opacity-60" />
          <div className="absolute top-4 right-4 h-16 w-16 border-t-4 border-r-4 border-amber-600 rounded-tr-xl opacity-60" />
          <div className="absolute bottom-4 left-4 h-16 w-16 border-b-4 border-l-4 border-amber-600 rounded-bl-xl opacity-60" />
          <div className="absolute bottom-4 right-4 h-16 w-16 border-b-4 border-r-4 border-amber-600 rounded-br-xl opacity-60" />

          {/* Secure Background Seal */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <GraduationCap className="h-[400px] w-[400px] text-amber-700" />
          </div>

          {/* Header */}
          <div className="text-center space-y-2 relative z-10">
            <div className="flex justify-center mb-3">
              <img 
                src="/src/assets/images/zion_digital_logo_1781070536038.png" 
                alt="Zion Digital Seal" 
                className="h-16 w-16 object-contain rounded-full border-2 border-amber-600 shadow-md bg-stone-950" 
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-955 uppercase">
              Zion Digital Leadership & Bible School
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-widest text-amber-800 font-bold">
              ESTABLISHED IN COVENANT EXCELLENCE & SACRED STEWARDSHIP
            </p>
            <div className="h-[1.5px] bg-gradient-to-r from-transparent via-amber-600 to-transparent w-2/3 mx-auto mt-4" />
          </div>

          {/* Core Body */}
          <div className="text-center space-y-6 my-8 relative z-10">
            <p className="font-serif text-xs italic text-stone-600 uppercase tracking-wider">
              On Recommendation of the Academic Faculty & Joint Board of Examiners, Confers Upon
            </p>
            
            <h2 className="font-serif text-3xl sm:text-4xl font-black text-amber-955 underline decoration-amber-600/35 uppercase tracking-tight py-1 font-semibold italic">
              {currentUser?.name || "The Academic Scholar"}
            </h2>

            <p className="font-serif text-xs italic text-stone-600 max-w-2xl mx-auto leading-relaxed">
              This official Graduate Diploma representing outstanding competency and mastery in our advanced, AI-evaluated syllabus study topic of
            </p>

            <h3 className="font-mono text-sm sm:text-base font-extrabold text-stone-900 bg-stone-105 border border-stone-250 py-2.5 px-6 rounded-xl w-fit mx-auto shadow-xs uppercase tracking-wider">
              🏆 {isComp ? "School of Computer Science & IT Syllabus" : "School of Leadership & Public Values Syllabus"}
            </h3>

            <p className="text-[10.5px] text-stone-500 max-w-xl mx-auto leading-normal select-none">
              With all rights, honors, and privileges thereunto appertaining. Satisfied study self-assessments, evaluated quizzes, and continuous learning modules verified automatically by the Zion Academy AI validation core.
            </p>
          </div>

          {/* Footer & Signatures Grid (4 columns) */}
          <div className="grid grid-cols-4 items-end pt-6 border-t border-stone-200 gap-4 relative z-10 text-xs">
            
            {/* Signature 1 */}
            <div className="text-center space-y-1">
              <div className="font-serif italic text-amber-950 font-bold text-sm tracking-wide select-none min-h-[25px] flex items-center justify-center border-b border-stone-300">
                Wafula_ai_Academic
              </div>
              <p className="text-[9px] text-stone-400 font-bold uppercase font-mono block">AI Director Core</p>
            </div>

            {/* Dynamic Verification QR Code Column */}
            <div className="flex flex-col items-center justify-center">
              <div className="bg-white p-1 border border-amber-600/35 rounded-lg flex flex-col items-center shadow-xs">
                {(() => {
                  const certId = `dl_${Date.now()}`;
                  const verifyUrl = `${window.location.origin}/?view=verify&certId=${certId}`;
                  const qrMatrix = QRCodeGenerator.generate(verifyUrl);
                  return (
                    <div className="grid gap-[1px]" style={{ gridTemplateColumns: `repeat(${qrMatrix.length}, minmax(0, 1fr))` }}>
                      {qrMatrix.map((row, rIdx) => 
                        row.map((col, cIdx) => (
                          <div 
                            key={`${rIdx}-${cIdx}`} 
                            className={`w-[1.8px] h-[1.8px] ${col ? 'bg-slate-900' : 'bg-white'}`}
                          />
                        ))
                      )}
                    </div>
                  );
                })()}
                <span className="text-[5.5px] font-mono font-bold text-amber-700 mt-0.5 uppercase tracking-tight">SCAN VERIFICATION</span>
              </div>
            </div>

            {/* Seal Graphic middle */}
            <div className="flex flex-col items-center justify-center relative -top-3">
              <div className="h-16 w-16 border-4 border-white shadow-lg rounded-full flex items-center justify-center overflow-hidden relative outline outline-2 outline-amber-700 bg-stone-950">
                <img 
                  src="/src/assets/images/zion_digital_logo_1781070536038.png" 
                  alt="Zion Golden Stamp" 
                  className="h-full w-full object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[7px] font-mono font-bold text-amber-700 mt-1">CLASS OF 2026</span>
            </div>

            {/* Signature 2 */}
            <div className="text-center space-y-1">
              <div className="font-serif italic text-stone-950 font-bold text-sm tracking-wide select-none min-h-[25px] flex items-baseline justify-center border-b border-stone-300 relative">
                <span className="relative z-10 text-amber-955 opacity-90 tracking-widest text-[#111] font-semibold italic text-base">Kelvin O. Wafula</span>
                <PenTool className="h-4 w-4 text-amber-500/30 absolute right-3 -top-2 shrink-0 pr-1 pr-1" />
              </div>
              <p className="text-[9px] text-stone-400 font-bold uppercase font-mono block">Chancellor & Admin</p>
            </div>

          </div>

          {/* Micro-Citation */}
          <div className="text-center text-[7.5px] font-mono text-stone-400 mt-6 select-none flex justify-between px-2">
            <span>ISSUED AT BUNGOMA KENYA DIVISION GATEWAY</span>
            <span>VERIFICATION STATUS: ACCREDITED ACTIVE</span>
            <span>LEDGER-HASH: ${(currentUser?.name || "SCHOLAR").substring(0, 3).toUpperCase()}-94A3B8-${Date.now().toString().slice(-4)}</span>
          </div>

        </div>
      </div>
    );
  }

  // ADMITTED NORMAL VIEW
  return (
    <div id="admitted_leadership_school" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 transition-colors">
      
      {/* Header Info Banner */}
      <div className="relative mb-10 overflow-hidden rounded-3xl bg-red-950 px-6 py-10 text-white shadow-xl sm:px-12 text-left">
        <div className="absolute inset-0 bg-radial-gradient from-red-900/40 to-red-955 opacity-70" />
        
        <div className="relative z-10 max-w-4xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <img 
              src="/src/assets/images/zion_digital_logo_1781070536038.png" 
              alt="Zion Digital Golden Seal" 
              className="h-20 w-20 object-contain rounded-full border-2 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.35)] bg-stone-950 shrink-0 self-center sm:self-start" 
              referrerPolicy="no-referrer"
            />
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-2 rounded-full bg-red-800/60 px-3.5 py-1 w-fit text-red-200 text-[10px] font-bold tracking-wider uppercase mb-3 border border-red-800/80 mx-auto sm:mx-0">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                <span>Zion Digital Academic Center of Excellence</span>
              </div>
              <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl leading-tight">
                Zion Digital Leadership & Bible School
              </h2>
              <p className="mt-2 text-sm text-red-200/90 font-medium italic">
                "Equipping administrative statesmen and skilled developers to serve with absolute dignity."
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-2.5 bg-red-900/30 p-4 rounded-2xl border border-red-800/45 shrink-0 max-w-xs text-xs">
            <div className="flex items-center justify-between gap-5">
              <span>Account Status:</span>
              <span className="font-mono font-bold text-green-300">ADMITTED COHORT</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Class Tuition:</span>
              <span className="font-mono font-bold text-yellow-300 uppercase">100% Free Study</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Accredited Diploma:</span>
              {certStatus === "approved" ? (
                <button
                  onClick={() => setShowCertificateView(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-2.5 py-0.5 rounded font-black cursor-pointer uppercase text-[9px] tracking-wider transition shadow-sm flex items-center space-x-0.5"
                >
                  <Eye className="h-2.5 w-2.5 inline" />
                  <span>View Diploma</span>
                </button>
              ) : certStatus === "pending" ? (
                <span className="font-mono font-bold text-amber-300 uppercase animate-pulse">Pending Overseer</span>
              ) : (
                <button 
                  onClick={() => setShowPaymentModal(true)}
                  className="text-[9px] bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-0.5 rounded font-black cursor-pointer uppercase tracking-wider"
                >
                  Pay KES {certificateFee}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Portals Navigation Bar Slider (Filtered dynamically by Authorized User Roles) */}
      <div className="flex border-b border-stone-200 dark:border-stone-850 mb-8 pb-3.5 space-x-3 overflow-x-auto scrollbar-none text-left">
        {[
          { id: "student", label: "👤 Student Classroom Desk", desc: `Overseer: ${headStudent}` },
          ...(isAuthorizedTeacher ? [
            { id: "teacher", label: "🧑‍🏫 Teacher Admin Desk", desc: `Overseer: ${headTeacher}` }
          ] : []),
          ...(isUserAdminOrSeniorTeacher ? [
            { id: "financial", label: "💸 Financial & Tuition Portal", desc: `Overseer: ${headFinance}` },
            { id: "certificate", label: "🎖️ Certificate & Academic Grades", desc: `Overseer: ${headCertificate}` }
          ] : []),
          ...(isAuthorizedTeacher ? [
            { id: "aichat", label: "🤖 AI Support Desk", desc: "Permanent search & research history" }
          ] : []),
          { id: "library", label: "📚 Bookshelf Library Sector", desc: `Overseer: ${headLibrary}` }
        ].map(portal => (
          <button
            key={portal.id}
            type="button"
            onClick={() => {
              setActivePortal(portal.id as any);
              setSelectedLesson(null);
              setShowAssessment(false);
              setAssessmentResult(null);
            }}
            className={`px-5 py-3 text-xs font-bold rounded-xl transition-all flex flex-col items-start space-y-0.5 shrink-0 cursor-pointer ${
              activePortal === portal.id
                ? "bg-red-800 text-white shadow-md scale-102"
                : "bg-stone-50 text-stone-700 hover:bg-stone-105 dark:bg-stone-900/60 dark:text-stone-350 border border-stone-150 dark:border-stone-800 dark:hover:bg-stone-900"
            }`}
          >
            <span className="font-display font-black tracking-wide text-[10.5px] uppercase">{portal.label}</span>
            <span className="text-[8.5px] font-mono font-medium block opacity-75">{portal.desc}</span>
          </button>
        ))}
      </div>

      {activePortal === "student" && (
        <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left Hand Sidebar: Course Syllabus Selector */}
        <div className="lg:col-span-4 space-y-5">
          
          <div className="rounded-2xl border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-950 p-5 text-left shadow-sm transition-colors">
            
            {/* School selection tabs */}
            <div className="flex border-b border-stone-150 dark:border-stone-850 mb-4 text-[10.5px] font-bold text-stone-500 gap-1 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setActiveSchool("leadership");
                  localStorage.setItem("WAFULA_ACTIVE_SCHOOL", "leadership");
                  setSelectedLesson(null);
                  setShowAssessment(false);
                  setAssessmentResult(null);
                }}
                className={`pb-2.5 px-2 text-center border-b-2 transition uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                  activeSchool === "leadership" ? "text-red-700 border-red-700 font-black dark:text-red-400 dark:border-red-400" : "border-transparent hover:text-stone-850 dark:hover:text-stone-250"
                }`}
              >
                🎓 Leadership
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSchool("bible");
                  localStorage.setItem("WAFULA_ACTIVE_SCHOOL", "bible");
                  setSelectedLesson(null);
                  setShowAssessment(false);
                  setAssessmentResult(null);
                }}
                className={`pb-2.5 px-2 text-center border-b-2 transition uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                  activeSchool === "bible" ? "text-amber-600 border-amber-600 font-black dark:text-amber-400 dark:border-amber-400" : "border-transparent hover:text-stone-850 dark:hover:text-stone-250"
                }`}
              >
                📖 Bible School
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSchool("all");
                  localStorage.setItem("WAFULA_ACTIVE_SCHOOL", "all");
                  setSelectedLesson(null);
                  setShowAssessment(false);
                  setAssessmentResult(null);
                }}
                className={`pb-2.5 px-2 text-center border-b-2 transition uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                  activeSchool === "all" ? "text-purple-705 border-purple-700 font-black dark:text-purple-400 dark:border-purple-400" : "border-transparent hover:text-stone-850 dark:hover:text-stone-250"
                }`}
              >
                🪐 All
              </button>
            </div>

            <h3 className="font-display text-xs font-extrabold text-stone-900 dark:text-stone-101 mb-4 flex items-center space-x-2 border-b border-stone-100 dark:border-stone-900 pb-2.5">
              <BookCheck className={`h-4.5 w-4.5 ${activeSchool === "all" ? "text-purple-600 dark:text-purple-450" : (activeSchool === "bible" ? "text-amber-600 dark:text-amber-400" : "text-red-700 dark:text-red-400")}`} />
              <span>{activeSchool === "all" ? "Combined Syllabus Core" : (activeSchool === "bible" ? "Bible School Theological Syllabus" : "Leadership Core Syllabus")}</span>
            </h3>

            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {activeLessonsList.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleStartLesson(l)}
                  className={`flex w-full items-start justify-between rounded-xl p-3.5 text-left border transition cursor-pointer ${
                    selectedLesson?.id === l.id 
                      ? BIBLE_LESSONS.some(comp => comp.id === l.id)
                        ? "border-amber-450 bg-amber-50/50 dark:bg-amber-950/25 text-amber-950 dark:text-amber-300"
                        : "border-red-450 bg-red-50/50 dark:bg-red-950/25 text-red-950 dark:text-red-300" 
                      : "border-stone-200 dark:border-stone-850 bg-stone-50 dark:bg-stone-900/60 hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-850 dark:text-stone-200"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-1.5">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {l.courseCode && (
                        <span className="font-mono text-[9px] font-black uppercase tracking-wider bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded leading-none shrink-0 border border-stone-300/30">
                          {l.courseCode}
                        </span>
                      )}
                      {l.courseFee !== undefined && (
                        <span className="font-mono text-[9.5px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1 py-0.5 rounded leading-none">
                          KES {l.courseFee.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <h4 className="text-[11.5px] font-black uppercase tracking-wide text-stone-900 dark:text-stone-50 leading-snug">{l.topic}</h4>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">{l.slogan}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 mt-1" />
                </button>
              ))}
            </div>

            {/* Course Enrollment Portal section (Continuing & Repeat Courses) */}
            <div className="border-t border-stone-200 dark:border-stone-850 pt-4 mt-4 space-y-3">
              <div className="bg-stone-50 dark:bg-stone-900/55 p-3.5 rounded-2xl border border-stone-250 dark:border-stone-800">
                <span className="text-[8.5px] uppercase tracking-widest font-mono font-extrabold text-stone-400 dark:text-stone-500 block mb-1">OFFICE OF THE REGISTRAR</span>
                <h4 className="text-xs font-black text-stone-905 dark:text-stone-105 uppercase tracking-tight mb-2">Continuing & Repeat Course Enrollment</h4>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed mb-3">Register officially for core, continuing, or repeat/supplementary leadership and Bible school classes with certified Zion code indices.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!enrolmentSelectedCourseId && PREBUILT_LESSONS.length > 0) {
                      setEnrolmentSelectedCourseId(PREBUILT_LESSONS[0].id);
                    }
                    setShowEnrolmentModal(true);
                  }}
                  className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer text-center block shadow-sm border border-blue-800/20"
                >
                  📝 Open Enrollment Form
                </button>
              </div>

              {/* Student active enrollment ledger logs */}
              {enrolmentList.length > 0 && (
                <div className="bg-white dark:bg-stone-950 p-3 shadow-xs rounded-xl border border-stone-200 dark:border-stone-850">
                  <span className="text-[8.5px] font-mono tracking-widest text-emerald-600 dark:text-emerald-400 font-extrabold block uppercase mb-2">● Active Course Registrations ({enrolmentList.length})</span>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5">
                    {enrolmentList.map((enr: any) => (
                      <div key={enr.id} className="p-2 border border-stone-150 dark:border-stone-850 bg-stone-50/50 dark:bg-stone-900/30 rounded-lg text-left text-[10px]">
                        <div className="flex justify-between font-bold text-stone-800 dark:text-stone-200">
                          <span className="truncate max-w-[130px]">{enr.courseTopic}</span>
                          <span className="font-mono text-stone-605 dark:text-stone-395 shrink-0">{enr.courseCode.split('/')[0]}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-stone-500 dark:text-stone-400 mt-1 font-mono">
                          <span>Index: {enr.admNo}</span>
                          <span className="uppercase text-emerald-600 dark:text-emerald-400 font-bold">Registered</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Teacher Custom Topic Generator (Completely Overhauled - Teacher restricted block) */}
          <div className="rounded-2xl border border-stone-250 bg-gradient-to-br from-stone-50 to-white p-5 text-left space-y-4 shadow-sm transition-colors light-only">
            <div className="flex items-center space-x-1.5 text-red-700 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>AI Elite Course Generator</span>
            </div>
            
            {!isAuthorizedTeacher ? (
              <div className="p-3 bg-stone-50 border rounded-xl text-center space-y-1.5">
                <ShieldAlert className="h-5 w-5 text-red-700 mx-auto animate-pulse" />
                <span className="text-[10px] font-bold text-stone-700 block uppercase tracking-wide">FACULTY ONLY AI TOOL</span>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Only premium teachers and lead VC chancellors are authorized to run custom AI subject compilers in Zion.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-stone-500 leading-relaxed font-sans">
                  Enter any leadership challenge or custom technology platform. The high-capacity AI will build comprehensive detailed notes and a dynamic 5-question automated marked assessment. <strong className="text-emerald-600 block mt-1">✓ Unlimited Free AI: All companion illustrations and lessons generated by the school AI are 100% free with no limits.</strong>
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g. serverless routing or public finance"
                    className="w-full rounded-xl border border-stone-250 bg-white px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-red-700 cursor-text text-stone-850 placeholder-stone-400"
                  />
                  <button
                    onClick={handleGenerateCustom}
                    disabled={isGeneratingCustom || !customTopic.trim()}
                    className="w-full flex items-center justify-center space-x-1 rounded-xl bg-red-700 hover:bg-red-850 py-3 text-xs font-extrabold text-white transition disabled:opacity-40 cursor-pointer shadow-xs uppercase tracking-wider"
                  >
                    {isGeneratingCustom ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Formulating Scholarly Notes...</span>
                      </>
                    ) : (
                      <>
                        <Sparkle className="h-3.5 w-3.5 shrink-0" />
                        <span>Synthesize Custom Class</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Center/Right Hand Display: Learning notes, illustration photos, and assessments */}
        <div className="lg:col-span-8 space-y-6 text-left">
          
          {/* Ask AI Teacher Solver panel */}
          <div className="rounded-2xl border border-stone-250 bg-white p-5 shadow-xs transition-colors light-only">
            <h3 className="font-display text-xs font-extrabold uppercase text-red-700 tracking-wider flex items-center mb-3">
              <Sparkle className="h-4.5 w-4.5 mr-1 text-red-700 shrink-0" />
              <span>AI Problem Solver & Classroom Tutor</span>
            </h3>

            {!isAuthorizedTeacher ? (
              <div className="p-4 bg-stone-50 border border-dashed rounded-xl text-center space-y-1">
                <ShieldAlert className="h-5 w-5 text-red-650 mx-auto animate-pulse" />
                <span className="text-[10.5px] font-bold text-stone-700 block uppercase">SECURE TUTOR ENCRYPTED</span>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  Active AI classroom tutoring and smart analytical guidance are reserved exclusively for school teachers, VC Chancellor, and senior coordinators.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-stone-500 leading-relaxed mb-4 font-sans">
                  Solve complex coding loops, organization conflicts, mathematical formulations, or seek administrative guidance instantly.
                </p>
                <div className="flex gap-2.5">
                  <input 
                    type="text"
                    placeholder="Ask teacher a custom leadership or technical question..."
                    value={aiTeacherQuestion}
                    onChange={(e) => setAiTeacherQuestion(e.target.value)}
                    className="flex-grow text-xs rounded-xl border border-stone-250 bg-stone-50 px-4 py-3 cursor-text text-stone-905 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-700"
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={isAskingAi || !aiTeacherQuestion.trim()}
                    className="bg-red-700 hover:bg-red-850 text-white font-black text-xs uppercase tracking-wider rounded-xl px-4.5 shrink-0 transition cursor-pointer disabled:opacity-45 shadow-sm"
                  >
                    {isAskingAi ? "Solving..." : "Ask AI Teacher"}
                  </button>
                </div>

                {aiTeacherAnswer && (
                  <div className="mt-4 p-4 rounded-xl bg-orange-50/40 border border-orange-200/35 text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                    <span className="font-bold text-orange-950 block mb-1">🎓 AI Teacher Solver:</span>
                    {aiTeacherAnswer}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Main Study Desk Panel */}
          {selectedLesson ? (
            <div className="rounded-2xl border border-stone-250 dark:border-stone-805 bg-white dark:bg-stone-950 p-6 shadow-sm space-y-6 transition-colors">
              
               {/* Slogan Title banner */}
              <div className="border-b border-stone-100 dark:border-stone-900 pb-4 flex justify-between items-start gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[9px] uppercase tracking-widest font-mono font-extrabold text-stone-400">LECTURE STUDY BRIEF</span>
                    {selectedLesson.courseCode && (
                      <span className="text-[9.5px] font-mono font-black bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-350 px-2 py-0.5 rounded border border-amber-500/20">
                        CODE: {selectedLesson.courseCode}
                      </span>
                    )}
                    {selectedLesson.courseFee !== undefined && (
                      <span className="text-[9.5px] font-mono font-black bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-350 px-2 py-0.5 rounded border border-emerald-500/20">
                        TUITION: KES {selectedLesson.courseFee.toLocaleString()}
                      </span>
                    )}
                    {selectedLesson.duration && (
                      <span className="text-[9.5px] font-mono font-bold bg-blue-500/10 text-blue-700 dark:bg-blue-400/15 dark:text-blue-350 px-2 py-0.5 rounded border border-blue-500/20">
                        DURATION: {selectedLesson.duration}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-2xl font-black text-stone-905 dark:text-stone-50">{selectedLesson.topic}</h3>
                  <p className="text-xs font-mono font-bold text-red-700 dark:text-rose-400 uppercase tracking-widest mt-1">"{selectedLesson.slogan}"</p>
                </div>
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="text-[10px] font-bold text-stone-450 hover:text-stone-900 dark:hover:text-white px-2 py-1 rounded border border-stone-200 dark:border-stone-800"
                >
                  Close Topic
                </button>
              </div>

              {/* DYNAMIC COMPANION ILLUSTRATION PHOTO */}
              {(selectedLesson.imageUrl || isGeneratingIllustration) && (
                <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 h-64 relative flex items-center justify-center">
                  {isGeneratingIllustration ? (
                    <div className="space-y-2 text-center text-xs text-stone-400">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-red-700" />
                      <p className="font-mono uppercase font-bold text-[10px] tracking-widest">AI Generating Companion Photo Visual...</p>
                    </div>
                  ) : (
                    selectedLesson.imageUrl && (
                      <img 
                        src={selectedLesson.imageUrl} 
                        alt="Course Illustration" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )
                  )}
                </div>
              )}

              {/* Comprehensive Detailed Notes Presentation */}
              <div className="space-y-4">
                <div className="text-stone-600 dark:text-stone-400 text-xs leading-relaxed italic border-l-4 border-red-700 dark:border-rose-400 pl-3.5">
                  {selectedLesson.intro}
                </div>

                <div className="space-y-4 pt-1">
                  <h4 className="text-xs font-black text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center">
                    <BookOpen className="h-4 w-4 mr-1 text-red-700" />
                    <span>Extensive Curriculum Lesson Chapters</span>
                  </h4>
                  <div className="space-y-3.5">
                    {selectedLesson.points.map((pt, idx) => {
                      const sectionKey = `${selectedLesson.id}_${idx}`;
                      const isGeneratingThisSec = generatingSectionKey === sectionKey;
                      const hasNotesForThisSec = !!generatedSectionNotes[sectionKey];

                      const isComp = activeSchool === "computer";
                      const isBible = activeSchool === "bible";
                      const themeBtnBg = isComp 
                        ? "bg-blue-50 hover:bg-blue-100/80 text-blue-700 dark:bg-blue-950/35 dark:text-blue-300 dark:hover:bg-blue-900/40 border-blue-100 dark:border-blue-900/50" 
                        : (isBible ? "bg-amber-50 hover:bg-amber-100/80 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300 dark:hover:bg-amber-900/40 border-amber-100 dark:border-amber-900/50" : "bg-red-50 hover:bg-red-100/80 text-red-750 dark:bg-red-950/35 dark:text-red-300 dark:hover:bg-red-900/40 border-red-100 dark:border-red-900/50");

                      return (
                        <div key={idx} className="p-4.5 rounded-xl border border-stone-150 dark:border-stone-850 bg-stone-50/50 dark:bg-stone-900/40 text-xs flex flex-col gap-3 transition hover:shadow-xs">
                          <div>
                            <div className="font-bold text-stone-900 dark:text-stone-105 mb-1 uppercase font-mono tracking-wider flex items-center justify-between">
                              <span>Section {idx + 1}: {pt.split(":")[0]}</span>
                              {hasNotesForThisSec && (
                                <span className="text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest animate-pulse">
                                  Notes Compiled
                                </span>
                              )}
                            </div>
                            <p className="text-stone-700 dark:text-stone-305 leading-relaxed text-justify">
                              {pt.split(":").slice(1).join(":") || pt}
                            </p>
                          </div>

                          {/* Interactive Notes Interface */}
                          <div className="border-t border-stone-200/65 dark:border-stone-800/80 pt-3 mt-1 space-y-3">
                            {hasNotesForThisSec ? (
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[9px] uppercase font-black text-stone-400 tracking-wider flex items-center">
                                    <Sparkles className="h-3 w-3 mr-1 text-amber-500 animate-bounce" />
                                    <span>Detailed Section Study-Guide</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGeneratedSectionNotes(prev => {
                                        const next = { ...prev };
                                        delete next[sectionKey];
                                        return next;
                                      });
                                    }}
                                    className="text-[10px] font-bold text-stone-450 hover:text-red-600 uppercase tracking-tight cursor-pointer transition font-mono"
                                  >
                                    Collapse notes [x]
                                  </button>
                                </div>
                                <div className="p-4 bg-white dark:bg-stone-950 rounded-xl border border-stone-150 dark:border-stone-850 space-y-2 selection:bg-red-200 dark:selection:bg-red-800 leading-relaxed font-sans text-stone-700 dark:text-stone-300 text-left border-l-4 border-l-emerald-505 max-h-[300px] overflow-y-auto shadow-xs text-justify">
                                  {parseMarkdownToReact(generatedSectionNotes[sectionKey])}
                                </div>
                              </div>
                            ) : isGeneratingThisSec ? (
                              <div className="flex items-center justify-center space-x-2 py-3.5 bg-stone-100/50 dark:bg-stone-950/30 rounded-xl border border-stone-200/40 dark:border-stone-850/40">
                                <RefreshCw className={`h-4.5 w-4.5 animate-spin ${isComp ? "text-blue-500" : (isBible ? "text-amber-500" : "text-red-700")}`} />
                                <span className="font-mono font-bold text-[10.5px] text-stone-500 uppercase tracking-widest">
                                  AI Academic Compiler formulating lecture notes...
                                </span>
                              </div>
                            ) : (
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleGenerateSectionNotes(pt, idx)}
                                  className={`flex items-center space-x-1.5 rounded-lg border px-3 py-1.5 text-[10.5px] font-bold tracking-wide uppercase transition cursor-pointer ${themeBtnBg}`}
                                >
                                  <BookOpen className="h-3 w-3.5" />
                                  <span>Compile Exhaustive Section Notes</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ADVANCED STUDY NOTES COMPILER PANEL */}
                <div className="border-t border-stone-200 dark:border-stone-800 pt-5 mt-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-stone-50 dark:bg-stone-900/60 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 mt-2">
                    <div className="space-y-1 text-left">
                      <h4 className="font-bold text-stone-900 dark:text-stone-105 text-sm">Draft Comprehensive Course Study Notes</h4>
                      <p className="text-stone-500 dark:text-stone-400 text-[11px]">Generate high-fidelity exhaustive academic lecture volumes based on this topic's guidelines using our advanced AI scholar.</p>
                    </div>
                    <button
                      type="button"
                      disabled={isGeneratingNotes}
                      onClick={handleGenerateDetailedNotes}
                      className="flex items-center justify-center space-x-1.5 shrink-0 rounded-xl bg-red-750 text-white font-bold py-2.5 px-4 text-xs hover:bg-stone-900 dark:hover:bg-stone-800 transition shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingNotes ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                          <span>Generating Notes...</span>
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Generate Detailed AI Notes</span>
                        </>
                      )}
                    </button>
                  </div>

                  {detailedStudyNotes && (
                    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xs animate-in fade-in duration-200 text-left text-xs max-h-[500px] overflow-y-auto font-sans leading-relaxed">
                      <div className="flex justify-between items-center border-b border-stone-150 dark:border-stone-850 pb-3 mb-4">
                        <span className="font-mono text-[10px] uppercase text-emerald-600 font-bold tracking-widest flex items-center">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                          Grounded Scholar Release
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetailedStudyNotes(null)}
                          className="text-stone-400 hover:text-stone-600 p-1 text-[11px] font-mono cursor-pointer"
                        >
                          Clear Notes [x]
                        </button>
                      </div>
                      <div className="space-y-1.5 selection:bg-red-200 dark:selection:bg-red-800">
                        {parseMarkdownToReact(detailedStudyNotes)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* EXAM MODULE BUTTON / VIEW TRIGGER */}
              {!showAssessment ? (
                <div className="p-5 rounded-2xl bg-[#2C241E] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-[#E7E1D8]">
                  <div className="flex-1 text-left">
                    <h4 className="font-bold text-sm uppercase">Faculty-Evaluated Scholarly Assessment</h4>
                    <p className="text-[11px] text-[#E7E1D8] mt-1 max-w-md">Challenge yourself with the timed multiple choice test verified by our server grading engine.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5 shrink-0">
                    <button
                      onClick={handleBeginAssessment}
                      disabled={isStartingExam}
                      className="bg-[#A8421B] hover:bg-[#8F3614] text-white font-bold text-[11px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition cursor-pointer shadow disabled:opacity-50"
                    >
                      {isStartingExam ? "Starting Exam..." : `Start Regular Test (${selectedLesson.selfAssessment.length} Qs)`}
                    </button>

                    <button
                      onClick={handleGenerateQuiz10}
                      disabled={isGeneratingQuiz}
                      className="bg-amber-400 hover:bg-amber-500 text-stone-950 font-black text-[11px] uppercase tracking-wider py-2.5 px-4 rounded-xl transition cursor-pointer shadow flex items-center space-x-1.5 disabled:opacity-50"
                    >
                      {isGeneratingQuiz ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Generating master exam...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 animate-pulse" />
                          <span>Generate 10-Question Master AI Exam</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-red-200/40 dark:border-stone-800 bg-red-50/15 dark:bg-stone-900/20 p-5 space-y-6">
                  
                  {/* Exam Heading */}
                  <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-800 pb-3">
                    <div className="flex items-center space-x-1.5 text-red-750 dark:text-rose-400">
                      <GraduationCap className="h-5 w-5 shrink-0" />
                      <span className="font-display font-black text-xs uppercase tracking-wider">Campus Exam Desk: {selectedLesson.topic}</span>
                    </div>
                    <button 
                      onClick={() => setShowAssessment(false)}
                      className="text-stone-400 hover:text-stone-700 text-xs font-bold"
                    >
                      Exit Exam
                    </button>
                  </div>

                  {/* Scrolling Exam Questions Sheet */}
                  <div className="space-y-6">
                    {selectedLesson.selfAssessment.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-3.5 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 text-xs text-left">
                        <span className="font-mono text-[9px] font-bold text-stone-400 tracking-widest uppercase">QUESTION {qIdx + 1} OF {selectedLesson.selfAssessment.length}</span>
                        <p className="font-bold text-stone-900 dark:text-stone-100 leading-relaxed">{q.question}</p>
                        
                        <div className="space-y-2">
                          {q.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              type="button"
                              disabled={assessmentResult !== null}
                              onClick={() => setStudentAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                              className={`flex w-full items-center space-x-2.5 rounded-xl p-3.5 text-left border transition cursor-pointer ${
                                studentAnswers[qIdx] === oIdx
                                  ? "border-red-650 bg-red-50 dark:bg-red-950/20 text-red-950 dark:text-red-350 font-bold"
                                  : "border-stone-200 dark:border-stone-850 bg-stone-50 dark:bg-stone-900/60 hover:bg-stone-100 dark:hover:bg-stone-900 text-stone-750 dark:text-stone-300"
                              }`}
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-[10px] font-mono font-bold text-neutral-800 dark:text-neutral-300">
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          ))}
                        </div>

                        {/* Show diagnostic validation only after authorized server result release */}
                        {assessmentResult && assessmentResult.resultsReleased && assessmentResult.breakdown?.[qIdx] && (() => {
                          const detail = assessmentResult.breakdown![qIdx];
                          return (
                            <div className={`mt-3 p-3.5 rounded-xl text-[11px] leading-relaxed border ${
                              detail.isCorrect
                                ? "bg-green-50/50 dark:bg-green-950/15 border-green-200/40 text-green-900 dark:text-green-300"
                                : "bg-red-50/50 dark:bg-red-950/15 border-red-200/40 text-red-900 dark:text-red-300"
                            }`}>
                              <span className="font-bold block mb-1">
                                {detail.isCorrect ? "Correct Option" : "Discrepancy Found"}
                              </span>
                              <p className="mb-1 italic">Approved Choice: {String.fromCharCode(65 + detail.correctIndex)}</p>
                              {detail.explanation && <p className="font-sans leading-normal">{detail.explanation}</p>}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>

                  {/* Exam submission results */}
                  {assessmentResult ? (
                    <div className="space-y-4">
                      <div className={`rounded-2xl p-5 border-l-4 ${
                        assessmentResult.passed
                          ? "bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300 border-green-600"
                          : "bg-red-55 dark:bg-red-950/20 text-red-800 dark:text-red-300 border-red-600"
                      }`}>
                        <span className="font-black block text-sm uppercase mb-1.5Tracking-wide">
                          {assessmentResult.passed ? "🏆 TEST MARKS GRADING: PASS / FELLOW" : "❌ MANDATE RE-STUDY: NOT SATISFIED"}
                        </span>
                        <p className="text-xs leading-relaxed font-sans">{assessmentResult.gradedFeedbackString}</p>
                        
                        {assessmentResult.passed && certStatus !== "approved" && (
                          <div className="mt-4 pt-3.5 border-t border-green-250/20">
                            <p className="text-[11px] mb-2 leading-relaxed">Your Fellow Credits have been securely backed up inside your student ledger. Request your full physical Certificate by processing the filing fee.</p>
                            <button
                              onClick={() => setShowPaymentModal(true)}
                              className="bg-stone-900 hover:bg-stone-955 text-white dark:bg-stone-800 dark:hover:bg-stone-750 font-bold text-xs px-4.5 py-2.5 rounded-xl cursor-pointer"
                            >
                              Authorize Filing Fee (KES {certificateFee})
                            </button>
                          </div>
                        )}

                        {assessmentResult.passed && certStatus === "approved" && (
                          <div className="mt-4 pt-3.5 border-t border-green-250/20">
                            <p className="text-[11px] mb-2 font-semibold">Your Certificate of Academic Diploma has been signed by the Chancellor!</p>
                            <button
                              onClick={() => setShowCertificateView(true)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4.5 py-2.5 rounded-xl cursor-pointer"
                            >
                              Open & Print Certificate
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-4">
                        <button
                          onClick={() => {
                            setStudentAnswers({});
                            setAssessmentResult(null);
                          }}
                          className="text-xs font-bold text-neutral-800 hover:text-neutral-950 dark:text-stone-400 dark:hover:text-white underline cursor-pointer"
                        >
                          Re-Take Assessment Exam
                        </button>
                        <button
                          onClick={() => setShowAssessment(false)}
                          className="text-xs font-bold text-stone-450 hover:text-stone-600"
                        >
                          Close Exam Panel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSubmitAssessment}
                      disabled={Object.keys(studentAnswers).length < selectedLesson.selfAssessment.length}
                      className="w-full bg-red-750 hover:bg-red-850 dark:bg-rose-600 dark:hover:bg-rose-700 text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition cursor-pointer disabled:opacity-45"
                    >
                      {Object.keys(studentAnswers).length < selectedLesson.selfAssessment.length 
                        ? `Answer All Questions First (${Object.keys(studentAnswers).length}/${selectedLesson.selfAssessment.length})`
                        : "Submit Answers to AI Teacher"
                      }
                    </button>
                  )}

                </div>
              )}

            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-950 p-12 text-center flex flex-col items-center justify-center space-y-4 transition-colors">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-rose-400">
                <GraduationCap className="h-7 w-7 animate-bounce" />
              </div>
              <div>
                <h3 className="font-display text-base font-black text-stone-905 dark:text-stone-100 uppercase tracking-wider">
                  Select Study Topic or Concept
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-401 mt-2.5 max-w-sm mx-auto leading-relaxed">
                  Welcome to the admitted cohorts! Click any prebuilt syllabus topic on the left sidebar, or use our customized AI Course Generator to compose notes and evaluations for any custom topic.
                </p>
              </div>
            </div>
          )}

          {/* Dynamic Certificate Progress Banner */}
          {certStatus !== "none" && (
            <div className={`rounded-3xl border p-6 text-left space-y-4 animate-in fade-in-25 duration-300 ${
              certStatus === "approved" 
                ? "border-green-200 bg-green-50/40 dark:bg-green-950/15" 
                : "border-amber-200 bg-amber-50/40 dark:bg-amber-950/10"
            }`}>
              <div className="flex items-center space-x-2">
                <GraduationCap className={`h-6 w-6 shrink-0 ${certStatus === "approved" ? "text-green-700 dark:text-green-400" : "text-amber-600 animate-pulse"}`} />
                <h3 className={`font-display font-black text-base uppercase ${
                  certStatus === "approved" ? "text-green-900 dark:text-green-350" : "text-amber-800 dark:text-amber-300"
                }`}>
                  {certStatus === "approved" ? "Accredited Graduate Diploma confimed" : "Diploma Status: Pending Chancellor Review"}
                </h3>
              </div>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-sans">
                {certStatus === "approved"
                  ? "This certifies that your curriculum coursework ledger satisfies the Joint Senate guidelines. Your professional printed diploma is fully signed on site."
                  : "Thank you for confirming your administrative credential filing process! Chancellor Kelvin Opara Wafula is currently verifying your self-assessments score hashes against the Zion Digital Ledger. Your full PDF certificate will unlock instantly upon signoff."
                }
              </p>
              <div className="border border-stone-200/40 dark:border-stone-800 p-4 bg-white dark:bg-stone-950 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-700 dark:text-stone-250 block uppercase">Status: {certStatus}</span>
                  <span className="font-mono text-[10px] text-stone-405">Academic ID: CERT-${(currentUser?.name || "SCHOLAR").substring(0, 3).toUpperCase()}-94A3B8</span>
                </div>
                {certStatus === "approved" ? (
                  <button 
                    onClick={() => setShowCertificateView(true)}
                    className="bg-green-700 hover:bg-green-850 text-white font-bold font-mono text-[10px] px-4.5 py-2.5 rounded-lg uppercase cursor-pointer transition shadow-sm"
                  >
                    Open & Print Diploma Certificate
                  </button>
                ) : (
                  <div className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-mono text-[9px] font-bold px-3 py-1.5 rounded-lg border border-amber-200/40 uppercase tracking-widest">
                    ⏳ Processing Signatures
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
      )}

      {/* --- TEACHER FACULTY PORTAL --- */}
      {activePortal === "teacher" && (
        <div className="space-y-6 text-left my-4">
          <div className="border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-950 p-6 rounded-2xl text-left space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="text-[10px] tracking-wider font-mono font-bold text-stone-400 block uppercase">ACADEMIC SUPERIOR WORKSPACE</span>
                <h3 className="font-display text-xl font-bold uppercase text-stone-900 dark:text-white-80 shadow-2xs">Assigned Head: {headTeacher}</h3>
              </div>
              <span className="bg-red-50 text-red-700 dark:bg-red-955 dark:text-red-300 border border-red-200 dark:border-red-800 text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl uppercase">ACTIVE FACULTY PORTAL</span>
            </div>

            {!isLibraryPaid ? (
              <div className="p-6 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800 text-center space-y-3 font-sans">
                <BookOpen className="h-8 w-8 text-amber-600 mx-auto animate-bounce shrink-0" />
                <h4 className="font-extrabold text-[#7c2d12] dark:text-stone-100 uppercase text-xs">Library Matriculation Registration Pending</h4>
                <p className="text-[11px] text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Zion Academic Code requires that teachers, tutors, and curriculum builders must have completed the standard library enrollment registration of <strong>KES 250</strong> preceding admission into the faculty portal.
                </p>
                <button 
                  onClick={() => setActivePortal("library")}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 px-5 rounded-xl transition cursor-pointer"
                >
                  Settle Library Registration (KES 250)
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                  <div className="grid md:grid-cols-11 gap-6 bg-[#fcfcfa] dark:bg-stone-900/10 p-5 rounded-2xl border border-stone-200 dark:border-stone-850">
                      <div className="md:col-span-7 space-y-4 text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-2.5 gap-2">
                          <div>
                            <h4 className="font-extrabold text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wide">✍️ Syllabus Workshop & Exam Compiler</h4>
                            <p className="text-[10px] text-stone-500">Employed tutors and faculty deans author courses, customize notes, and formulate test questions.</p>
                          </div>
                          <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 px-2 py-1 rounded shrink-0">ROLE: FACULTY COVENANT OVERSEER</span>
                        </div>

                        {/* MODE / SYLLABUS SELECTOR DROPDOWN */}
                        <div className="space-y-1.5 p-3.5 bg-white dark:bg-stone-950 rounded-xl border border-stone-150 dark:border-stone-850">
                          <label className="block text-[9.5px] font-mono uppercase font-bold text-stone-500">Select Syllabus Module to Edit/Update:</label>
                          <select
                            value={teacherSelectedLessonId}
                            onChange={(e) => {
                              const v = e.target.value;
                              setTeacherSelectedLessonId(v);
                              handleSelectLessonToUpdate(v);
                            }}
                            className="w-full bg-stone-50 text-stone-900 dark:bg-stone-900 dark:text-stone-100 border px-3 py-2 rounded-lg text-xs font-bold leading-relaxed focus:bg-white"
                          >
                            <option value="">➕ [CREATE BRAND NEW COURSE LECTURE MODULE]</option>
                            {activeLessonsList.map(item => (
                              <option key={item.id} value={item.id}>
                                📝 {item.topic} ({item.courseCode || (item as any).category?.toUpperCase()})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* STUDY FORM */}
                        <div className="space-y-3.5 text-xs text-left">
                           <div className="grid sm:grid-cols-2 gap-3">
                             <div className="space-y-1">
                               <label className="block text-[9.5px] uppercase font-bold text-stone-500 dark:text-stone-400">Course Topic Title:</label>
                               <input 
                                 type="text" 
                                 value={teacherLessonTopic}
                                 onChange={(e) => setTeacherLessonTopic(e.target.value)}
                                 placeholder="e.g. History of the Early Church" 
                                 className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border px-3 py-2 rounded-lg placeholder-stone-400" 
                                 required 
                               />
                             </div>
                             <div className="space-y-1 font-sans">
                               <label className="block text-[9.5px] uppercase font-bold text-stone-500 dark:text-stone-400">Context / Slogan:</label>
                               <input 
                                 type="text" 
                                 value={teacherLessonSlogan}
                                 onChange={(e) => setTeacherLessonSlogan(e.target.value)}
                                 placeholder="e.g. Analyzing theological shifts in the first century" 
                                 className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border px-3 py-2 rounded-lg placeholder-stone-400" 
                               />
                             </div>
                           </div>

                           <div className="grid sm:grid-cols-2 gap-3">
                             <div className="space-y-1">
                               <label className="block text-[9.5px] uppercase font-bold text-stone-500 dark:text-stone-400">Curriculum Academy Track Track:</label>
                               <select 
                                 value={teacherLessonTrack}
                                 onChange={(e) => setTeacherLessonTrack(e.target.value as any)}
                                 className="w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border px-3 py-2 rounded-lg font-bold"
                               >
                                  <option value="leadership">🎓 Strategic Leadership School</option>
                                  <option value="computer">💻 Computer Science & IT School</option>
                                  <option value="bible">📖 Bible school Track</option>
                               </select>
                             </div>
                             <div className="space-y-1 flex flex-col justify-end">
                               {/* AI Questions generation call button */}
                               <button
                                 type="button"
                                 onClick={handleCompileAILessonQuestions}
                                 disabled={isCompilingAILesson || !teacherLessonTopic.trim() || !teacherLessonNotes.trim()}
                                 className="w-full text-center bg-stone-900 hover:bg-stone-950 text-white font-extrabold text-[11px] py-2 px-3.5 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-40 border border-stone-800 dark:border-stone-700"
                               >
                                 {isCompilingAILesson ? (
                                   <>
                                     <RefreshCw className="h-3.5 w-3.5 animate-spin text-yellow-500" />
                                     <span>Syncing with AI Model...</span>
                                   </>
                                 ) : (
                                   <>
                                     <Sparkles className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
                                     <span>Compile MCQ Questions with AI</span>
                                   </>
                                 )}
                               </button>
                             </div>
                           </div>

                           <div className="space-y-1">
                             <label className="block text-[9.5px] uppercase font-bold text-stone-500 dark:text-stone-400">Lecture Notes Content (Untouched upon uploads):</label>
                             <textarea 
                               rows={7} 
                               value={teacherLessonNotes}
                               onChange={(e) => setTeacherLessonNotes(e.target.value)}
                               placeholder="Paste/write raw lecture text. Students will study this without any changes or omissions. Separate paragraphs with double-spaces." 
                               className="w-full bg-white dark:bg-stone-900 text-stone-905 dark:text-stone-100 border px-3 py-2.5 rounded-lg text-xs leading-relaxed font-sans cursor-text focus:outline-none focus:border-red-850"
                               required
                             />
                           </div>

                           {/* Generated AI questions preview */}
                           {teacherCustomQuestions.length > 0 && (
                             <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-xl border border-emerald-100 dark:border-emerald-800 space-y-2 text-left">
                               <span className="text-[10px] font-mono text-emerald-850 dark:text-emerald-400 font-extrabold block uppercase tracking-wider">✓ PROCESSED AI QUESTIONS PREVIEW ({teacherCustomQuestions.length})</span>
                               <div className="space-y-2 text-[10.5px]">
                                 {teacherCustomQuestions.map((q, qIndex) => (
                                   <div key={qIndex} className="p-2 border border-stone-150 dark:border-stone-850 rounded bg-white dark:bg-stone-950">
                                     <div className="font-bold text-stone-850 dark:text-stone-200">Q{qIndex+1}: {q.question}</div>
                                     <div className="grid grid-cols-2 gap-1.5 mt-1.5 text-[9.5px] text-stone-500 font-mono">
                                       {q.options?.map((opt: string, optIdx: number) => (
                                         <div key={optIdx} className={optIdx === teacherDraftAnswerKeys[qIndex]?.correctIndex ? "text-emerald-650 font-bold font-sans" : ""}>
                                           {optIdx}. {opt} {optIdx === teacherDraftAnswerKeys[qIndex]?.correctIndex && "✓"}
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           )}

                           <button 
                             type="button"
                             onClick={handlePublishOrUpdateSyllabus}
                             className="w-full bg-red-800 hover:bg-red-850 text-white font-extrabold py-3 px-4 rounded-xl transition cursor-pointer text-xs uppercase tracking-wide"
                           >
                              {teacherSelectedMode === "update" ? "🔄 Publish & Propagate Syllabus Updates" : "✨ Process & Publish Syllabus Lesson"}
                           </button>
                        </div>
                      </div>

                      <div className="md:col-span-4 space-y-3 text-left font-sans">
                        <h4 className="font-extrabold text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wide">💼 Faculty & Employee Registry</h4>
                        <p className="text-[11px] text-stone-550">View commissioned instructors and monthly salaries assigned by the Manager Admin.</p>
                        
                        <div className="space-y-2 border rounded-xl p-3 max-h-[290px] overflow-y-auto bg-white dark:bg-stone-950">
                           {(() => {
                              const workers = JSON.parse(localStorage.getItem("ZION_WORKERS") || "[]");
                              const defaultWorkers = [
                                 { id: "def-e1", name: "Dr. Catherine Nekesa", role: "Professor", school: "Computer School", salary: 29500, isAppointed: true, pendingApproval: false },
                                 { id: "def-e2", name: "Prof. Edwin Muliro", role: "Professor", school: "Leadership School", salary: 28000, isAppointed: true, pendingApproval: false },
                                 { id: "def-e3", name: "Pastor Andrew Welime", role: "Theology Tutor", school: "Bible School", salary: 24000, isAppointed: true, pendingApproval: false },
                                 { id: "def-e4", name: "Scolastica Nabutola", role: "Financial Comptroller", school: "Financial Portal", salary: 19550, isAppointed: true, pendingApproval: false }
                              ];
                              const list = workers.length === 0 ? defaultWorkers : workers;
                              return list.map((tc: any) => (
                                 <div key={tc.id} className="p-2.5 border-b last:border-0 border-stone-100 dark:border-stone-850 flex justify-between items-center text-[11px] font-sans">
                                    <div>
                                       <span className="font-bold text-stone-808 dark:text-stone-200 block">{tc.name}</span>
                                       <span className="text-[9.5px] text-stone-500 uppercase tracking-wider block">{tc.school} • {tc.role}</span>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded">KES {tc.salary.toLocaleString()}</span>
                                 </div>
                              ));
                           })()}
                        </div>
                     </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- FINANCIAL PORTAL --- */}
      {activePortal === "financial" && (
        <div className="space-y-6 text-left my-4">
          <div className="border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-950 p-6 rounded-2xl text-left space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="text-[10px] tracking-wider font-mono font-bold text-stone-400 block uppercase">DEPARTMENT OF STUDENT ACCOUNTS & TREASURY</span>
                <h3 className="font-display text-xl font-bold uppercase text-stone-900 dark:text-white">Assigned Head: {headFinance}</h3>
              </div>
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl uppercase">ACTIVE FINANCIAL PORTAL</span>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 font-sans">
              <div className="bg-stone-50 dark:bg-stone-900/60 p-4 rounded-xl border border-stone-200/60 text-left">
                 <span className="text-[10px] text-stone-404 font-mono font-bold uppercase tracking-wider">Total Enrollment Revenue</span>
                 <span className="block text-xl font-bold text-stone-900 dark:text-stone-101 mt-1">
                    KES {(() => {
                       const libTransactions = JSON.parse(localStorage.getItem("ZION_LIBRARY_FEE_ENTRIES") || "[]");
                       const count = libTransactions.length;
                       const base = count * 250;
                       return (base + 38250).toLocaleString();
                    })()}
                 </span>
                 <span className="text-[9px] text-green-600 block mt-1">↑ Direct library collection reconciled</span>
              </div>

              <div className="bg-stone-50 dark:bg-stone-900/60 p-4 rounded-xl border border-stone-200/60 text-left">
                 <span className="text-[10px] text-stone-404 font-mono font-bold uppercase tracking-wider">Salary Disbursed Expense</span>
                 <span className="block text-xl font-bold text-stone-900 dark:text-stone-101 mt-1">
                    KES {(() => {
                       const paymentHistory = JSON.parse(localStorage.getItem("ZION_PAYMENT_HISTORY") || "[]");
                       const disbursed = paymentHistory.reduce((sum: number, pay: any) => sum + pay.salary, 0);
                       return (disbursed + 137400).toLocaleString();
                    })()}
                 </span>
                 <span className="text-[9px] text-red-605 block mt-1">↓ Reconciled Payroll Ledger</span>
              </div>

              <div className="bg-stone-50 dark:bg-stone-900/60 p-4 rounded-xl border border-stone-200/60 text-left">
                 <span className="text-[10px] text-stone-404 font-mono font-bold uppercase tracking-wider">Tuition Fees Waived</span>
                 <span className="block text-xl font-bold text-yellow-600 dark:text-yellow-450 mt-1">100% Scholarship</span>
                 <span className="text-[9px] text-stone-400 block mt-1">Zion Spiritual Covenant Endowment</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-2 font-display">
               <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase text-stone-800 dark:text-stone-250">📚 Library Matriculation Subscriptions (Ksh 250)</h4>
                  <div className="border border-stone-150 rounded-xl max-h-[220px] overflow-y-auto bg-white dark:bg-stone-950 p-2.5">
                     {(() => {
                        const libEntries = JSON.parse(localStorage.getItem("ZION_LIBRARY_FEE_ENTRIES") || "[]");
                        if (libEntries.length === 0) {
                          return (
                            <div className="text-center py-6 text-stone-400 italic text-[10.5px]">
                               No new library matriculations recorded. Give it a try in the Library portal!
                            </div>
                          );
                        }
                        return libEntries.map((entry: any) => (
                           <div key={entry.id} className="p-2 border-b last:border-0 border-stone-100 dark:border-stone-850 flex justify-between text-[10.5px]">
                              <div>
                                 <span className="font-bold text-stone-805 dark:text-stone-205 block">{entry.studentName}</span>
                                 <span className="text-stone-400 font-mono text-[9.5px] block">M-Pesa: {entry.studentPhone} • {entry.date}</span>
                              </div>
                              <span className="text-green-700 font-black shrink-0 font-mono">+ KES {entry.amount}</span>
                           </div>
                        ));
                     })()}
                  </div>
               </div>

               <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase text-stone-800 dark:text-stone-250">💳 Worker Payroll Ledger Disbursed</h4>
                  <div className="border border-stone-150 rounded-xl max-h-[220px] overflow-y-auto bg-white dark:bg-stone-950 p-2.5">
                     {(() => {
                        const pays = JSON.parse(localStorage.getItem("ZION_PAYMENT_HISTORY") || "[]");
                        if (pays.length === 0) {
                          return (
                            <div className="text-center py-6 text-stone-400 italic text-[10.5px]">
                               No salary payouts recorded this period. Complete disburser transactions inside Admin Panel!
                            </div>
                          );
                        }
                        return pays.map((pay: any) => (
                           <div key={pay.id} className="p-2 border-b last:border-0 border-stone-100 dark:border-stone-850 flex justify-between text-[10.5px]">
                              <div>
                                 <span className="font-bold text-stone-805 dark:text-stone-205 block">{pay.workerName}</span>
                                 <span className="text-stone-400 text-[9.5px] block font-mono">Designation: {pay.workerRole} • Paid by Admin at {pay.date}</span>
                              </div>
                              <span className="text-red-700 font-bold shrink-0 font-mono">- KES {pay.salary.toLocaleString()}</span>
                           </div>
                        ));
                     })()}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CERTIFICATE TRANSCRIPTS PORTAL --- */}
      {activePortal === "certificate" && (
        <div className="space-y-6 text-left my-4 font-display">
          <div className="border border-stone-250 dark:border-stone-800 bg-white dark:bg-stone-950 p-6 rounded-2xl text-left space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="text-[10px] tracking-wider font-mono font-bold text-stone-400 block uppercase">REGISTRAR ACADEMIC TRANSCRIPT PORTAL</span>
                <h3 className="font-display text-xl font-bold uppercase text-stone-900 dark:text-white">Assigned Head: {headCertificate}</h3>
              </div>
              <span className="bg-amber-50 text-amber-700 border border-amber-205 text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl uppercase animate-pulse">ACTIVE CERTIFICATE PORTAL</span>
            </div>

            <div className="space-y-4">
               <h4 className="font-bold text-xs uppercase text-stone-800 dark:text-stone-250 tracking-wider">📜 Completed Coursework Credentials Status Tracker</h4>
               
               <div className="grid md:grid-cols-2 gap-4 font-sans">
                  {[
                    { tag: "leadership", title: "Strategic Leadership & Public Values", code: "LEAD/STRAT" },
                    { tag: "bible", title: "Theology & Pastoral Covenant Studies", code: "BIBLE/MIN" }
                  ].map(track => {
                     const userMail = currentUser?.email || "guest@wafula.com";
                     const gradesStr = localStorage.getItem(`WAFULA_STUDENT_GRADES_${userMail}`) || "{}";
                     let grades: any = {};
                     try { grades = JSON.parse(gradesStr); } catch(e){}
                     
                     const trackLessons = track.tag === "bible" 
                       ? BIBLE_LESSONS 
                       : PREBUILT_LESSONS;

                     const completedCount = trackLessons.filter(l => grades[l.id] && grades[l.id].passed).length;
                     const totalCount = trackLessons.length;

                     const hasPassed = trackLessons.length > 0 && trackLessons.every(l => {
                       return grades[l.id] && grades[l.id].passed;
                     }) && Object.values(grades).some((g: any) => {
                        if (track.tag === "bible") {
                           return BIBLE_LESSONS.some(bl => bl.id === g.lessonId) && g.passed;
                        } else {
                           return PREBUILT_LESSONS.some(pl => pl.id === g.lessonId) && g.passed;
                        }
                     });

                     return (
                        <div key={track.tag} className="p-4 border rounded-xl space-y-3 bg-stone-50/50 dark:bg-stone-900/30 text-left">
                           <div className="flex justify-between items-start">
                              <span className="font-mono text-[9px] bg-stone-200 text-stone-700 rounded px-1.5 font-bold uppercase">{track.code}</span>
                              <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-white ${hasPassed ? "bg-green-600 font-extrabold" : "bg-stone-300 font-bold"}`}>
                                 ✓
                              </span>
                           </div>
                           <div>
                              <h5 className="font-black text-xs text-stone-900 dark:text-stone-101 uppercase tracking-tight leading-tight">{track.title}</h5>
                              <span className="text-[10px] text-stone-405 font-mono block mt-1">Syllabus Status: {hasPassed ? "Passed Final MCQ (75%+)" : "No grade recorded"}</span>
                           </div>

                           {hasPassed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSchool(track.tag as any);
                                  const userMail = currentUser?.email || "guest@wafula.com";
                                  localStorage.setItem(`WAFULA_CERT_STATUS_${userMail}`, "approved");
                                  setCertStatus("approved");
                                  setShowCertificateView(true);
                                }}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] py-1.5 px-2 rounded-lg text-center uppercase tracking-wider block transition cursor-pointer"
                              >
                                 Claim & Print Diploma
                              </button>
                           ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePortal("student");
                                  setActiveSchool(track.tag as any);
                                  alert(`Please complete any assessment question block inside the student classroom under the ${track.title} track with 75%+ marks to unlock this certified diploma certificate!`);
                                }}
                                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-[9px] py-1.5 px-2 rounded-lg text-center uppercase block transition"
                              >
                                 Study Syllabus Course
                              </button>
                           )}
                        </div>
                     );
                  })}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* --- REVOLUTIONARY AI SUPPORT CHAT PORTAL --- */}
      {activePortal === "aichat" && (
        <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-850 space-y-4 text-left bg-white dark:bg-stone-950 p-6 rounded-3xl border shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
            <div>
              <span className="text-[10px] tracking-wider font-mono font-bold text-stone-400 block uppercase">Zion Faculty Companion Neural Engine</span>
              <h3 className="font-display text-xl font-bold uppercase text-stone-900 dark:text-white">🤖 Permanent Neural Research Terminal</h3>
              <p className="text-xs text-stone-550 dark:text-stone-300 mt-1">This terminal preserves your search history permanently and supports professional publication formatting and media extraction.</p>
            </div>
            <span className="bg-red-50 text-red-750 dark:bg-red-950/40 dark:text-red-300 border border-red-200 text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl uppercase shrink-0">ACTIVE INTELLIGENT COMPANION</span>
          </div>

          <div className="p-1.5 border border-stone-150 dark:border-stone-800 rounded-2xl bg-stone-50/40 dark:bg-stone-900/10">
            <AIChat currentUser={currentUser} onUnlockBadge={(badgeId) => console.log("Unlocked badge:", badgeId)} />
          </div>
        </div>
      )}

      {/* --- ACADEMIC WORKSPACE REFERENCE LIBRARY --- */}
      {activePortal === "library" && (
        <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-850 space-y-8 text-left bg-white dark:bg-stone-950 p-6 rounded-3xl border">
          {/* Header Portal Title */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
            <div>
              <span className="text-[10px] tracking-wider font-mono font-bold text-stone-400 block uppercase">ZION INTEGRATED CAMPUS KNOWLEDGE STORAGE</span>
              <h3 className="font-display text-xl font-bold uppercase text-stone-900 dark:text-white">Assigned Head: {headLibrary}</h3>
              <p className="text-xs text-stone-500 mt-1">Study official syllabus manuals, student-contributed whitepapers, and accredited textbooks curated for all active academic tracks.</p>
            </div>
            <span className="bg-[#fffbeb] text-amber-805 border border-amber-200 text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl uppercase shrink-0">CAMPUS REFERENCE LIBRARY</span>
          </div>

          {!isLibraryPaid ? (
            /* locked screen matriculation */
            <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/20 p-8 text-center space-y-5 max-w-lg mx-auto my-10 shadow-xs">
              <div className="h-14 w-14 bg-amber-100/80 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <BookOpen className="h-6 w-6 animate-pulse" />
              </div>
              <h4 className="font-display text-base font-black text-amber-950 uppercase tracking-wider">Library Matriculation Required</h4>
              <p className="text-xs text-stone-600 leading-relaxed font-sans">
                Academic council policy mandates that all scholars, readers, or apprentice teachers must settle a library enrollment fee of <strong>KES 250</strong> preceding access to research materials, worksheets, and books.
              </p>
              <div className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 text-left space-y-3.5 max-w-sm mx-auto">
                <label className="block text-[10px] font-mono font-bold text-stone-500 dark:text-stone-300 uppercase tracking-widest">Safaricom/Airtel M-Pesa Phone</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={libraryPhone}
                    onChange={(e) => setLibraryPhone(e.target.value)}
                    placeholder="e.g. 0712345678"
                    className="flex-1 bg-stone-50 dark:bg-stone-955 text-stone-900 dark:text-stone-105 border border-stone-200 dark:border-stone-850 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                  />
                  <button
                    onClick={handleLibraryRegister}
                    disabled={isProcessingLibraryPayment}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] uppercase tracking-wider px-4 rounded-xl transition cursor-pointer disabled:opacity-40"
                  >
                    {isProcessingLibraryPayment ? "Processing..." : "Pay KES 250"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
             <div className="space-y-8 animate-in fade-in duration-300">
                {/* Visual Category Directory for Outreach Videos */}
                <div className="space-y-3.5 font-sans">
                   <h4 className="font-bold text-xs uppercase tracking-widest text-[#7c2d12] dark:text-amber-500 flex items-center gap-1.5 pb-2 border-b">
                      📺 OUTREACH MEDIA & VIDEO PLAYLIST DIRECTORY
                   </h4>
                   <p className="text-[11.5px] text-stone-550 leading-relaxed font-sans">
                      Watch instructional sermon archives, advanced computer engineering laboratories, and leadership panel podcasts filtered by student interest:
                   </p>
                   
                   <div className="grid sm:grid-cols-4 gap-4 pb-2">
                      {[
                        { id: "rel", label: "Religion & Ministerial Outreach", desc: "Theological lectures, devotionals, and church administration forums.", views: "Religion", fileCount: 4 },
                        { id: "lead", label: "Strategic Leadership", desc: "Ethics in management, strategic decisions, and civic coordination.", views: "Leadership", fileCount: 3 },
                        { id: "fun", label: "Enjoyment & Creative Artistry", desc: "Sermonic poetry, sacred acoustics, and creative design.", views: "Enjoyment/Fun", fileCount: 2 },
                        { id: "tech", label: "Technology Labs", desc: "Database structures, terminal compilations, and React hooks.", views: "Technology", fileCount: 5 }
                      ].map(ch => (
                         <div key={ch.id} className="p-4 border border-stone-150 dark:border-stone-850 rounded-xl bg-[#fafbfc] dark:bg-stone-900/10 hover:bg-stone-50 dark:hover:bg-stone-900 hover:shadow-2xs transition text-left cursor-pointer" onClick={() => {
                           alert(`Streaming dynamic, continuous lecture recordings in the outreach section for: ${ch.label}. Keep studying!`);
                         }}>
                            <span className="text-[8px] font-mono font-bold bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 px-2 py-0.5 rounded uppercase tracking-wider">{ch.views}</span>
                            <h5 className="font-extrabold text-xs text-stone-900 dark:text-white mt-2 uppercase leading-snug">{ch.label}</h5>
                            <p className="text-[10px] text-stone-500 mt-1 lines-clamp-2 leading-relaxed">{ch.desc}</p>
                            <span className="text-[9px] text-amber-700 dark:text-amber-400 block mt-2.5 font-bold font-mono"> ▶ PLAY VIDEO CHANNELS ({ch.fileCount} clips)</span>
                         </div>
                      ))}
                   </div>
                </div>

        {/* Success Message Banner */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-green-50/90 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-300 text-xs flex justify-between items-center shadow-xs animate-in slide-in-from-top duration-200">
            <span className="font-medium">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="font-bold underline cursor-pointer hover:opacity-80 px-2">Dismiss</button>
          </div>
        )}

        {/* Title Header banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-[9.5px] tracking-widest font-mono font-bold text-red-700 dark:text-rose-400 uppercase">ACADEMIC RESOURCE ARCHIVE</span>
            <h3 className="font-display text-2xl font-black text-stone-900 dark:text-white">Classroom Reference Bookshelf</h3>
            <p className="text-xs text-stone-500 leading-relaxed max-w-xl">
              Study official syllabus manuals, student-contributed whitepapers, and accredited textbooks curated specifically for {activeSchool === "both" ? "both academic divisions" : (activeSchool === "computer" ? "Computer Science & Information Technology" : "Ethical Leadership & Strategic Public Service")}.
            </p>
          </div>
          
          <button
            type="button"
            onClick={handleSimulateBatchBooks}
            className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-900 dark:text-stone-100 font-extrabold text-[11px] uppercase tracking-wide px-4 py-2.5 rounded-xl border border-stone-205 dark:border-stone-750 shrink-0 transition cursor-pointer flex items-center space-x-1 shadow-2xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-yellow-500 shrink-0 animate-pulse" />
            <span>Simulate 3 Reference eBooks</span>
          </button>
        </div>

        {/* 2-Column Section: Uploader Form and Books Shelf */}
        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Uploader Desk Column: Multi-File Selection & Categorization Form */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-850 bg-stone-50/55 dark:bg-stone-900/40 p-5 space-y-4">
              <div className="flex items-center space-x-1.5 text-stone-900 dark:text-stone-100 font-black text-xs uppercase tracking-wider">
                <UploadCloud className="h-4.5 w-4.5 text-red-750 dark:text-rose-400" />
                <span>Batch Book Uploader</span>
              </div>
              
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Select multiple books, reports, or research sheets. Give each ebook its specific division focus (Ethical Leadership or Computer Tech) for correct placement.
              </p>

              {/* HTML5 Drag-and-Drop Batch File selector */}
              <div className="border border-dashed border-stone-300 dark:border-stone-750 bg-white dark:bg-stone-950 p-6 rounded-xl text-center space-y-2 relative focus-within:ring-2 focus-within:ring-red-700">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.doc,.docx"
                  id="classroom_multi_book_selector"
                  onChange={handleMultipleFilesSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <UploadCloud className="h-8 w-8 text-stone-400 animate-pulse mb-1" />
                  <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">Click or Drop Multiple Files</span>
                  <span className="text-[9px] text-stone-450 block">supporting PDF, TXT, DOCX</span>
                </div>
              </div>

              {/* Pending Batch List */}
              {pendingBooks.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-800 pb-1.5">
                    <span className="text-[10px] uppercase font-mono tracking-widest font-black text-stone-400">{pendingBooks.length} Books to Publish</span>
                    <button 
                      onClick={() => setPendingBooks([])} 
                      className="text-[9px] text-stone-400 hover:text-red-650 uppercase font-mono font-bold cursor-pointer"
                    >
                      Clear [x]
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                    {pendingBooks.map((pb, index) => (
                      <div key={pb.tempId} className="bg-white dark:bg-stone-950 rounded-xl p-3 border border-stone-200 dark:border-stone-800 text-xs space-y-2 relative shadow-2xs">
                        
                        <button
                          type="button"
                          onClick={() => handleRemovePendingBook(pb.tempId)}
                          className="absolute top-2.5 right-2.5 text-stone-405 hover:text-red-600 cursor-pointer p-0.5"
                          title="Remove book"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        
                        <div className="pr-5">
                          <span className="text-[9px] font-mono font-extrabold text-stone-400 block uppercase">Ebook {index+1} • {pb.fileSize}</span>
                          <input
                            type="text"
                            value={pb.title}
                            onChange={(e) => {
                              const t = e.target.value;
                              setPendingBooks(prev => prev.map(x => x.tempId === pb.tempId ? { ...x, title: t } : x));
                            }}
                            placeholder="Book Title"
                            className="w-full font-bold bg-transparent text-stone-900 dark:text-white border-b border-dashed border-stone-200 hover:border-stone-450 focus:border-red-700 focus:outline-none py-0.5 text-xs text-ellipsis placeholder-stone-400"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8.5px] uppercase font-mono font-bold text-stone-400 block">Author</label>
                            <input
                              type="text"
                              value={pb.author}
                              onChange={(e) => {
                                const a = e.target.value;
                                setPendingBooks(prev => prev.map(x => x.tempId === pb.tempId ? { ...x, author: a } : x));
                              }}
                              placeholder="Author Name"
                              className="w-full bg-transparent border-b border-dashed border-stone-200 hover:border-stone-450 focus:border-red-700 text-stone-800 dark:text-stone-200 focus:outline-none py-0.5 text-[10px]"
                            />
                          </div>
                          
                          <div>
                            <label className="text-[8.5px] uppercase font-mono font-bold text-stone-400 block">Focus School</label>
                            <select
                              value={pb.category}
                              onChange={(e) => {
                                const c = e.target.value as any;
                                setPendingBooks(prev => prev.map(x => x.tempId === pb.tempId ? { ...x, category: c } : x));
                              }}
                              className="w-full bg-transparent border-b border-dashed border-stone-200 focus:border-red-700 text-stone-800 dark:text-stone-200 focus:outline-none py-0.5 text-[10px] cursor-pointer"
                            >
                              <option value="Leadership" className="dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100">🎓 Leadership</option>
                              <option value="Technology" className="dark:bg-stone-950 text-xs text-stone-900 dark:text-stone-100">💻 Technology</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[8.5px] uppercase font-mono font-bold text-stone-400 block">Description Summary</label>
                          <textarea
                            value={pb.description}
                            onChange={(e) => {
                              const d = e.target.value;
                              setPendingBooks(prev => prev.map(x => x.tempId === pb.tempId ? { ...x, description: d } : x));
                            }}
                            placeholder="Concise outline..."
                            rows={2}
                            className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded p-1 text-[10.5px] text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-1 focus:ring-red-700 mt-0.5"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handlePublishBatchBooks}
                    className="w-full bg-red-750 hover:bg-red-850 dark:bg-rose-600 dark:hover:bg-rose-700 text-white py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition shadow-sm cursor-pointer block"
                  >
                    Verify & Publish {pendingBooks.length} Reference Books
                  </button>
                </div>
              ) : (
                <div className="py-6 text-center text-[11px] text-stone-400 italic">
                  No pending batch files in your publisher workspace. Drop files or use the simulator above to quickly compose a set.
                </div>
              )}

            </div>
          </div>

          {/* Bookshelves Display Column: Filtered, Searchable Shelf Grid */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Search & Filter controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/70 dark:bg-stone-900/40 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800">
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search syllabus books or student whitepapers..."
                className="text-xs bg-white dark:bg-stone-950 px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-850 focus:outline-none focus:ring-1 focus:ring-red-700 w-full sm:max-w-xs cursor-text text-stone-905 focus:bg-white dark:focus:bg-stone-950 dark:text-stone-100"
              />

              <div className="flex items-center space-x-2 text-[11px]">
                <span className="font-mono text-stone-400 font-bold uppercase tracking-wider hidden sm:inline">Active Track Filter:</span>
                <span className="font-bold text-stone-700 dark:text-stone-300 font-mono text-[10.5px] bg-stone-200/50 dark:bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-750">
                  {activeSchool === "both" ? "Dual Syllabus Library" : (activeSchool === "computer" ? "Computer IT Library Only" : "Leadership Library Only")}
                </span>
              </div>
            </div>

            {/* Filtered Books Shelf Rendering */}
            {(() => {
              // Filter books array
              const filtered = books.filter(b => {
                // Match search
                if (librarySearch.trim() && !b.title.toLowerCase().includes(librarySearch.toLowerCase()) && !b.author.toLowerCase().includes(librarySearch.toLowerCase())) {
                  return false;
                }
                
                // If we're on computerized school track, default we filter and elevate Technology / Science books
                if (activeSchool === "computer") {
                  return b.category === "Technology" || b.category === "Science" || b.category === "Business";
                }
                // If we're on leadership track, elevate Leadership / Non-Fiction / Self-Help / Education
                if (activeSchool === "leadership") {
                  return b.category === "Leadership" || b.category === "Business" || b.category === "Self-Help" || b.category === "Education" || b.category === "Non-Fiction";
                }
                // Both tracks shown
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="rounded-2xl border border-stone-200 dark:border-stone-850 bg-white dark:bg-stone-950 p-10 text-center text-stone-450 text-xs italic">
                    No specialized reference books match your active division filter or search keyword in this layout view. Publish custom chapters using the Batch Uploader on the left!
                  </div>
                );
              }

              return (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filtered.map(b => (
                    <div key={b.id} className="rounded-2xl border border-stone-200 dark:border-stone-850 bg-white dark:bg-stone-950 p-4 flex gap-4 transition-all hover:bg-stone-50/20 dark:hover:bg-stone-900/40 text-xs">
                      <div className="h-28 w-20 rounded-lg overflow-hidden bg-stone-100 border border-stone-200/60 shrink-0 relative flex items-center justify-center">
                        <img src={b.coverImage} className="w-full h-full object-contain" referrerPolicy="no-referrer" alt={b.title} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
                        <span className="absolute bottom-1 right-1 text-[8.5px] font-mono text-white bg-red-950/80 px-1 py-0.5 rounded font-black uppercase">
                          {b.category}
                        </span>
                      </div>
                      
                      <div className="flex flex-col justify-between min-w-0 flex-1 text-left">
                        <div>
                          <span className="text-[9px] font-mono uppercase bg-stone-105 dark:bg-stone-900 border border-stone-200/65 dark:border-stone-800 text-stone-500 dark:text-stone-400 rounded px-1.5 py-0.5 font-bold w-fit block mb-1">
                            {b.pages} Pages • {b.fileSize || "1.2MB"}
                          </span>
                          <h4 className="font-extrabold text-stone-900 dark:text-stone-100 line-clamp-1 text-[13px]">{b.title}</h4>
                          <span className="text-[10.5px] text-stone-550 italic block mb-1">by {b.author}</span>
                          <p className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-normal line-clamp-2">{b.description}</p>
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setActiveReadingBook(b)}
                            className="w-full flex items-center justify-center space-x-1.5 rounded-lg bg-stone-900 hover:bg-red-750 text-white dark:bg-stone-850 dark:hover:bg-rose-700 font-bold py-1.5 px-3 text-[10.5px] transition cursor-pointer"
                          >
                            <BookOpen className="h-3.5 w-3.5 shrink-0" />
                            <span>Open Reference Text</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

          </div>

        </div>

        {/* Dynamic Inline eBook Reader Modal Overlay if a book is open */}
        {activeReadingBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs select-none p-4">
            <div className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95">
              
              {/* Reader Header */}
              <div className="bg-stone-900 text-white p-5 flex items-center justify-between border-b border-stone-800 text-xs">
                <div className="flex items-center space-x-3.5 min-w-0 text-left">
                  <div className="h-10 w-7 shrink-0 rounded bg-stone-850 overflow-hidden flex items-center justify-center">
                    <img src={activeReadingBook.coverImage} className="w-full h-full object-contain" alt="" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[8.5px] font-mono uppercase bg-red-950/90 text-red-200 rounded px-1.5 py-0.5 font-black border border-red-800/80">
                      {activeReadingBook.category} reference book
                    </span>
                    <h4 className="font-extrabold text-white truncate text-xs sm:text-sm mt-0.5">{activeReadingBook.title}</h4>
                    <p className="text-[10px] text-stone-400">Authored by {activeReadingBook.author} • Curated Free Access</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setActiveReadingBook(null)}
                  className="text-stone-400 hover:text-white rounded-lg p-1 transition cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Reader Spine/Body */}
              <div className="p-6 overflow-y-auto font-sans leading-relaxed text-xs text-left text-stone-800 dark:text-stone-200 space-y-4 max-h-[50vh] scrollbar text-justify">
                {activeReadingBook.content ? (
                  <div className="space-y-3.5 selection:bg-red-200 dark:selection:bg-red-800 leading-relaxed text-stone-700 dark:text-stone-300">
                    {parseMarkdownToReact(activeReadingBook.content)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-display font-black text-sm uppercase border-b border-stone-100 dark:border-stone-800 pb-2 text-stone-900 dark:text-white">
                      {activeReadingBook.title.toUpperCase()} — SYLLABUS DISCOURSE
                    </h3>
                    <p className="font-bold italic">Reference Companion Study Materials | Registered Archive {activeReadingBook.id}</p>
                    <p>
                      You are currently viewing a verified, free-access academic publication registered inside the digital school's library ledger. This textbook features direct, complete, page-by-page guidelines on {activeReadingBook.category === "Leadership" ? "ethical governance structures, political organization theory, and the implementation guidelines of servant statesmanship" : "computer server-side routing, high-performance runtime optimization, sandboxed interpreters, and decentralized informatics systems in rural regions like Bungoma, Kenya"}.
                    </p>
                    <h3 className="font-bold text-stone-900 dark:text-white pt-2 text-xs uppercase font-mono">Chapter 1: Foundational Paradigm & System Dynamics</h3>
                    <p>
                      Curated materials suggest that modern administrative paradigms must integrate technological speed with solid, transparent ethics. High-concurrency operations require robust sandbox testing processes, ensuring all container ports and networks bind only under authorized security scopes. Offline capabilities serve as a crucial resilience strategy, guaranteeing that local libraries function autonomously during internet disruptions.
                    </p>
                    <h3 className="font-bold text-stone-900 dark:text-white pt-2 text-xs uppercase font-mono">Chapter 2: Tactical Implementations</h3>
                    <p>
                      Students are advised to review these chapters alongside the prebuilt academic lecture courses available in the left sidebar directory. Always perform self-assessments periodically to grade your retention against high-capacity standards. For official diplomas, file your coursework credits through the registrar payment portal.
                    </p>
                  </div>
                )}
              </div>

              {/* Reading footer */}
              <div className="bg-stone-55 dark:bg-stone-850 p-4 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center text-[10.5px] text-stone-400 font-mono">
                <span>PAGES: 1 - {activeReadingBook.pages || 150} INCLUSIVE</span>
                <span>VERIFICATION STATE: APPROVED SCHOLASTIC MANUAL</span>
              </div>

            </div>
          </div>
        )}

             </div>
          )}
      </div>
      )}

      {/* SAFARICOM M-PESA STK MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
          <div className="bg-white dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl p-6 max-w-md w-full text-left space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-900 pb-3">
              <div className="flex items-center space-x-1.5 text-stone-905 dark:text-stone-105">
                <Landmark className="h-5 w-5 text-emerald-600" />
                <span className="font-display font-black text-xs uppercase tracking-wider">M-Pesa Web STK Gateway</span>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-stone-450 hover:text-stone-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-401 leading-relaxed font-sans">
              Tuition and lectures are completely free on Zion Digital Academy. To award collegiate credits, verify academic assessments, and unlock your printed credential assets, submit the standard filing fee.
            </p>

            <div className="bg-stone-50 dark:bg-stone-900 rounded-xl p-3.5 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs transition-colors">
              <div>
                <span className="font-bold text-stone-550 block text-[10px] uppercase font-mono tracking-wider">Credential Plan:</span>
                <span className="font-extrabold text-[#111] dark:text-[#eee]">Graduate Scholar Fellowship Diploma</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-stone-550 block text-[10px] uppercase font-mono tracking-wider">Filing cost:</span>
                <span className="font-bold text-emerald-605 text-sm">KES {certificateFee}</span>
              </div>
            </div>

            <form onSubmit={handleCertPaymentSubmit} className="space-y-3.5 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono text-stone-400 dark:text-stone-500 tracking-wider font-bold block">
                  Safaricom M-Pesa Phone Number
                </label>
                <input 
                  type="text"
                  required
                  placeholder="0712345678"
                  value={checkoutPhone}
                  onChange={(e) => setCheckoutPhone(e.target.value)}
                  className="w-full text-xs p-3.5 border border-stone-250 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 rounded-xl text-stone-900 dark:text-stone-105 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isPaying}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider transition cursor-pointer flex items-center justify-center space-x-1 shadow-sm"
              >
                {isPaying ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1 shrink-0" />
                    <span>Processing Secure Gateway STK...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Payment of KES {certificateFee}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ⚖️ Zion Constituent Schools Compliance & Legal Policy Footer */}
      <div id="zion_legal_compliance_footer" className="mt-16 pt-8 border-t border-stone-200 dark:border-stone-850 text-center space-y-4 font-sans select-none pb-8">
        <div className="flex flex-wrap justify-center gap-6 text-[10.5px] font-bold text-stone-600 dark:text-stone-400 font-display uppercase tracking-widest">
          <button 
            type="button" 
            onClick={() => setShowComplianceModal("terms")} 
            className="hover:text-red-750 dark:hover:text-amber-500 hover:scale-[1.01] cursor-pointer transition underline decoration-dotted decoration-stone-400 decoration-1"
          >
            📜 Terms & Academic Integrity Policy
          </button>
          <span className="text-stone-300 dark:text-stone-800">•</span>
          <button 
            type="button" 
            onClick={() => setShowComplianceModal("privacy")} 
            className="hover:text-red-750 dark:hover:text-amber-500 hover:scale-[1.01] cursor-pointer transition underline decoration-dotted decoration-stone-400 decoration-1"
          >
            🔒 Privacy & Personal Data protection
          </button>
          <span className="text-stone-300 dark:text-stone-800">•</span>
          <button 
            type="button" 
            onClick={() => setShowComplianceModal("accreditation")} 
            className="hover:text-red-750 dark:hover:text-amber-500 hover:scale-[1.01] cursor-pointer transition underline decoration-dotted decoration-stone-400 decoration-1"
          >
            🛡️ Accreditation & Compliance Charter
          </button>
        </div>
        <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed max-w-2xl mx-auto font-sans">
          Zion Constituent Schools operates under the sacred character-driven "Character, Truth & Utility" covenant framework. Dedicated to scalable Web3 and AI-driven vocational training in East Africa. Reconciled and audited with Safaricom M-Pesa academic ledger endpoints.
        </p>
      </div>

      {/* Stateful Legal and Compliance Modal Overlay */}
      {showComplianceModal && (
        <div id="compliance_legal_overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-stone-950 border border-stone-250 dark:border-stone-850 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col my-8 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className={`p-6 text-white relative ${
              showComplianceModal === "terms" ? "bg-red-850" : (showComplianceModal === "privacy" ? "bg-stone-900" : "bg-blue-900")
            }`}>
              <button 
                type="button" 
                onClick={() => setShowComplianceModal(null)} 
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:scale-110 p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
              
              <div className="flex items-center space-x-2">
                {showComplianceModal === "terms" && <FileText className="h-5 w-5 text-amber-300" />}
                {showComplianceModal === "privacy" && <ShieldCheck className="h-5 w-5 text-emerald-400" />}
                {showComplianceModal === "accreditation" && <Award className="h-5 w-5 text-yellow-300" />}
                
                <h3 className="font-display font-black text-sm uppercase tracking-widest">
                  {showComplianceModal === "terms" && "Terms & Conditions & Academic Integrity License"}
                  {showComplianceModal === "privacy" && "Personal Data protection & Privacy Policy Guidelines"}
                  {showComplianceModal === "accreditation" && "Zion Constituent School Accreditation Charter"}
                </h3>
              </div>
              <p className="text-[10px] text-stone-200 mt-1 font-mono uppercase tracking-widest">
                Official Document No: {showComplianceModal === "terms" ? "ZIO-TERM-2026-V1" : (showComplianceModal === "privacy" ? "ZIO-PRIV-2026-V1" : "ZIO-ACCR-2026-V1")} • Status: ACTIVE/RELEASED
              </p>
            </div>

            {/* Modal Body Container */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-sans scrollbar-thin">
              
              {showComplianceModal === "terms" && (
                <div className="space-y-4">
                  <div className="p-3 bg-red-100/30 dark:bg-red-950/10 border-l-4 border-red-700 rounded-r-lg">
                    <strong className="block text-red-900 dark:text-red-400 uppercase tracking-wider text-[10px] font-mono font-bold mb-1">Academic Integrity Undertaking</strong>
                    All students matriculating into Zion Constituent Schools pledge to uphold strict honesty, character, and scholastic rigor.
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">1. The 12-Week Covenant Standard</h4>
                    <p>
                      Scholars are expected to complete the designated 12-Week course tracks (incorporating Character, Truth, and Utility principles). Regular engagement with the online student portal, quizzes, exams, and community forums is required to complete assignments.
                    </p>

                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">2. Course Fees & Financial Stewardship</h4>
                    <p>
                      Academic sustainability requires a flat enrollment/tuition fee of <strong>KES 2,500</strong> for certified course tracks. This is non-refundable and directly supports the continuous operations of local server-side grading nodes, custom AI tutor processing bounds, sandbox terminal setups, and certified digital transcript storage.
                    </p>

                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">3. Plagiarism & Generative Integrity Policy</h4>
                    <p>
                      While Zion Integrates direct AI Teaching Assistants as personalized 24/7 tutors, students must do their own work. AI solutions must guide study, not replace active research. Exclusively copy-pasting unedited AI essays or source scripts in exams triggers automatic audit and invalidates progress records.
                    </p>

                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">4. Pass Metric & Certificate Authority</h4>
                    <p>
                      To qualify for the certified digital diploma and PDF download, scholars must achieve an average final score of <strong>80% or greater</strong> across modular exams and assignments. Failed attempts may be retaken after a minimum cooling period of 2 hours.
                    </p>
                  </div>
                </div>
              )}

              {showComplianceModal === "privacy" && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-100/30 dark:bg-emerald-950/10 border-l-4 border-emerald-600 rounded-r-lg">
                    <strong className="block text-emerald-900 dark:text-emerald-400 uppercase tracking-wider text-[10px] font-mono font-bold mb-1">Personal Data Protection Notice</strong>
                    Zion Schools adheres to the strict legal boundaries and student privileges detailed in the Kenya Data Protection Act.
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">1. Information We Collect</h4>
                    <p>
                      For secure matriculation, Zion registers student names, contact email addresses, mobile numbers (specifically Safaricom/Airtel lines for billing M-Pesa interactions), and academic performance logs (quiz inputs, raw scores, and essay drafts).
                    </p>

                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">2. Secure Ledger Processing & Payment Safeguards</h4>
                    <p>
                      All payment records, Safaricom M-Pesa transaction reference strings, and certificate IDs are compiled in an isolated, secure state model. We never store credit card data directly, and transaction details are reconciled with the Safaricom instant ledger to ensure maximum cyber hygiene.
                    </p>

                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">3. AI Grading Sandbox Operations</h4>
                    <p>
                      To achieve automated evaluation, submitted papers and assignments are securely uploaded to static Gemini API endpoints. Under the enterprise compliance tier, student inputs are analyzed ONLY for scoring based on the curriculum rubric, and are never saved, indexed, or utilized for generative telemetry training by intermediate models.
                    </p>

                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">4. Right to Purge and Ledger Access</h4>
                    <p>
                      Scholars hold total ownership of their personal learning history. You have the inalienable right to query your digital record, request a complete backup, or instruct the administrator to wipe your profile data and active session registers.
                    </p>
                  </div>
                </div>
              )}

              {showComplianceModal === "accreditation" && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-105/35 dark:bg-blue-950/10 border-l-4 border-blue-700 rounded-r-lg">
                    <strong className="block text-blue-900 dark:text-blue-400 uppercase tracking-wider text-[10px] font-mono font-bold mb-1">Dual-Key Validation Charter</strong>
                    Zion Constituent Schools operates as an independent post-secondary technical institute, implementing certified vocational education frameworks.
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">1. Core Curriculum Validation</h4>
                    <p>
                      Our program integrates critical technical instruction (Web Development, Office Processing, Programming Logic) alongside ethical grounding (Theological Bible Studies, Inductive Methods, Servant Leadership Governance). This multi-disciplinary approach prepares thinkers who can deploy secure modern systems with ethical and moral integrity.
                    </p>

                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">2. Digital Certificate UUID Verification</h4>
                    <p>
                      All earned certificates are generated with a unique, cryptographically-generated UUID code. This code can be publicly verified on the Zion portal, enabling potential employers, ministries, or local councils to instantly confirm the authenticity of graduates' coursework credits.
                    </p>

                    <h4 className="font-bold text-stone-900 dark:text-white uppercase tracking-wider text-[10.5px]">3. Administrative Manual Release Framework</h4>
                    <p>
                      In adherence to strict technical design rules, AI components do not possess singular authority to issue diplomas. The classroom AI engine scores the quizzes and automatically populates draft certificate documents; however, a manual "Final Action Review" is required by the human Lead Administrator before the final digital certificate is validated and emailed.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-stone-200 dark:border-stone-850 bg-stone-50 dark:bg-stone-901 flex items-center justify-between">
              <span className="text-[10px] font-mono text-stone-400">© 2026 Zion Constituent Schools</span>
              <button 
                type="button" 
                onClick={() => {
                  alert("Thank you for reviewing our compliance policies. These guidelines maintain the high academic values and data security of the Zion academic network.");
                  setShowComplianceModal(null);
                }}
                className={`px-5 py-2 rounded-xl text-white font-extrabold text-[11px] uppercase tracking-wider cursor-pointer font-sans transition ${
                  showComplianceModal === "terms" ? "bg-red-700 hover:bg-red-850" : (showComplianceModal === "privacy" ? "bg-stone-900 hover:bg-black" : "bg-blue-700 hover:bg-blue-800")
                }`}
              >
                Acknowledge & Close Policy
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONGRATULATIONS CONGRATS EXAM MODAL */}
      {showCongratsModal && (
        <div id="exam_congrats_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs select-none">
          <div className="w-full max-w-md bg-white dark:bg-stone-901 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center">
            
            {/* Celebration Sparkles Graphics Banner */}
            <div className="bg-red-700 p-8 text-white relative overflow-hidden flex flex-col items-center justify-center">
              <div className="absolute inset-0 bg-radial-gradient from-white/10 to-transparent pointer-events-none" />
              <div className="rounded-full bg-white/10 p-4 mb-3 shrink-0">
                <Award className="h-12 w-12 text-amber-300 animate-bounce" />
              </div>
              <h3 className="font-display font-black text-lg uppercase tracking-wider font-sans">Congratulations Scholar!</h3>
              <p className="text-xs text-red-101 mt-1 font-mono">Exam successfully finalized & graded!</p>
            </div>

            <div className="p-6 space-y-5 text-center">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-stone-400 block tracking-widest mb-1">YOUR EXAM GRADE ACHIEVEMENT</span>
                <strong className="text-4xl font-black font-mono text-zinc-950 dark:text-white">{congratsScore}%</strong>
                <span className={`text-xs font-bold block mt-1.5 ${congratsScore >= 80 ? "text-green-600" : "text-amber-600"}`}>
                  {congratsScore >= 80 ? "🎉 RIGOROUS PASS (80%+ SECURED)" : "⚠️ NOT SATISFIED (REQUIRES 80%+ TO ACCREDIT)"}
                </span>
              </div>

              <p className="text-xs text-stone-605 leading-relaxed font-sans px-2">
                {congratsScore >= 80 
                  ? "You have demonstrated high academic excellence matching Zion Digital's premium specifications. Your scores are securely written to your official profile ledger."
                  : "Excellent effort. While your credentials have been recorded, standard guidelines require a minimum of 80% to authorize accredited downloads. Study notes and re-test again!"
                }
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-stone-850 p-4 border-t border-stone-200 dark:border-stone-805 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCongratsModal(false);
                  if (onNavigate) {
                    onNavigate("dashboard");
                  }
                }}
                className="w-full rounded-xl bg-red-700 hover:bg-red-850 py-3 text-xs font-extrabold text-white transition cursor-pointer shadow-sm uppercase tracking-wide font-display"
              >
                View My Learning Progress & Charts
              </button>
              <button
                type="button"
                onClick={() => setShowCongratsModal(false)}
                className="w-full rounded-xl bg-white hover:bg-stone-100 py-2 text-xs font-bold text-stone-600 border border-stone-205 transition cursor-pointer font-sans"
              >
                Continue in Classroom Desk
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONTINUING / REPEAT COURSE ENROLMENT FORM Modal */}
      {showEnrolmentModal && (
        <div id="zion_enrolment_modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/75 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-stone-50 dark:bg-stone-901 border border-stone-300 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Form Paper Header */}
            <div className="bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-850 p-6 text-center space-y-3 relative">
              <div className="flex justify-center">
                <img 
                  src="/src/assets/images/zion_digital_logo_1781070536038.png" 
                  alt="Zion Logo" 
                  className="h-16 w-auto object-contain drop-shadow-md"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest font-black text-amber-600 dark:text-amber-450 block uppercase">ZION DIGITAL APP & ACADEMY</span>
                <h3 className="font-display font-black text-lg text-stone-900 dark:text-stone-100 uppercase tracking-tight">CONTINUING / REPEAT COURSE ENROLMENT FORM 2</h3>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">OFFICE OF THE REGISTRAR • REGISTRATION LEDGER ENTRY</p>
              </div>
              
              <button 
                type="button"
                onClick={() => setShowEnrolmentModal(false)}
                className="absolute top-2 right-4 text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Fields container */}
            <form onSubmit={handleEnrolmentSubmit} className="p-6 space-y-4 text-left">
              
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Student Full Name */}
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-mono text-stone-500 dark:text-stone-400 tracking-wider font-bold block">
                    Student Full Name *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={enrolmentStudentName}
                    onChange={(e) => setEnrolmentStudentName(e.target.value)}
                    className="w-full text-xs p-3 border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-950 rounded-xl text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Patient/Student ID / Acc No */}
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-mono text-stone-500 dark:text-stone-400 tracking-wider font-bold block">
                    Student Admission / ID *
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. ZIO01/015/26"
                    value={enrolmentAdmNo}
                    onChange={(e) => setEnrolmentAdmNo(e.target.value)}
                    className="w-full text-xs p-3 border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-950 rounded-xl text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[8.5px] text-stone-450 dark:text-stone-500 font-mono leading-none">Leave blank for automatic ZIO indexing sequence.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-mono text-stone-500 dark:text-stone-400 tracking-wider font-bold block">
                    Contact Mobile Number (M-Pesa) *
                  </label>
                  <input 
                    type="tel"
                    required
                    placeholder="e.g. 07XXXXXXXX"
                    value={enrolmentPhone}
                    onChange={(e) => setEnrolmentPhone(e.target.value)}
                    className="w-full text-xs p-3 border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-950 rounded-xl text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[9.5px] uppercase font-mono text-stone-500 dark:text-stone-400 tracking-wider font-bold block">
                    Official Email Address
                  </label>
                  <input 
                    type="email"
                    placeholder="student@zion.ac.ke"
                    value={enrolmentEmail}
                    onChange={(e) => setEnrolmentEmail(e.target.value)}
                    className="w-full text-xs p-3 border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-950 rounded-xl text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Course Selection Dropdown */}
              <div className="space-y-1">
                <label className="text-[9.5px] uppercase font-mono text-stone-500 dark:text-stone-400 tracking-wider font-bold block">
                  Select Certified Course Track *
                </label>
                <select
                  required
                  value={enrolmentSelectedCourseId}
                  onChange={(e) => setEnrolmentSelectedCourseId(e.target.value)}
                  className="w-full text-xs p-3 border border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-950 rounded-xl text-stone-900 dark:text-stone-100 focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  {[...PREBUILT_LESSONS, ...BIBLE_LESSONS].map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.courseCode ? `[${c.courseCode.split('/')[0]}] ` : ""}{c.topic} (KES {c.courseFee?.toLocaleString()} - {c.duration || "4 Months"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Enrolment Category / Type selection */}
              <div className="space-y-1">
                <label className="text-[9.5px] uppercase font-mono text-stone-500 dark:text-stone-400 tracking-wider font-bold block">
                  Enrolment Classification Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnrolmentType("new")}
                    className={`p-2.5 rounded-xl border text-center text-[10px] font-bold transition cursor-pointer ${
                      enrolmentType === "new"
                        ? "bg-blue-650 text-white border-blue-600"
                        : "bg-white dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-stone-250 dark:border-stone-800 hover:bg-stone-100"
                    }`}
                  >
                    🌱 New Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnrolmentType("continuing")}
                    className={`p-2.5 rounded-xl border text-center text-[10px] font-bold transition cursor-pointer ${
                      enrolmentType === "continuing"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-stone-250 dark:border-stone-800 hover:bg-stone-100"
                    }`}
                  >
                    🔄 Continuing Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnrolmentType("repeat")}
                    className={`p-2.5 rounded-xl border text-center text-[10px] font-bold transition cursor-pointer ${
                      enrolmentType === "repeat"
                        ? "bg-red-700 text-white border-red-700"
                        : "bg-white dark:bg-stone-950 text-stone-700 dark:text-stone-300 border-stone-250 dark:border-stone-800 hover:bg-stone-100"
                    }`}
                  >
                    🔁 Repeat / Supp
                  </button>
                </div>
              </div>

              {/* Secure Safaricom M-Pesa Integration Details */}
              <div className="bg-amber-500/10 dark:bg-amber-400/5 p-4 rounded-xl border border-amber-500/15 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-amber-900 dark:text-amber-450 text-[10.5px]">
                  <span>🔐 SECURE TUITION PAYMENT CLEARANCE</span>
                  <span className="font-mono">PAYBILL: 542542</span>
                </div>
                <p className="text-[10px] text-stone-600 dark:text-stone-400 leading-relaxed font-sans">
                  To complete enrollment, execute transfer manually via Lipa Na M-Pesa. Use account string: <strong className="font-mono text-stone-800 dark:text-stone-100">888576# + {enrolmentStudentName || "STUDENT_NAME"}</strong>. Enter tuition fee corresponding to your selected course track above.
                </p>
                <div className="mt-2 text-left">
                  <label className="text-[9.5px] uppercase font-mono font-bold text-amber-800 dark:text-amber-400 block mb-1">
                    M-Pesa Receipt Transaction Code *
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. RJ73HS937H"
                    value={enrolmentMpesaCode}
                    onChange={(e) => setEnrolmentMpesaCode(e.target.value)}
                    className="w-full text-xs font-mono p-2.5 border border-amber-500/20 bg-white dark:bg-stone-950 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Live Admission Code Generation Preview */}
              <div className="bg-stone-100 dark:bg-stone-950 p-3 rounded-xl border border-stone-250 dark:border-stone-800 text-center text-xs">
                <span className="text-[9px] uppercase tracking-widest font-mono font-bold text-stone-450 block">EXPECTED ADMISSION LEDGER CODE</span>
                <span className="font-mono text-sm font-black text-amber-600 dark:text-amber-450 tracking-wider">
                  {enrolmentAdmNo.trim() || `${
                    [...PREBUILT_LESSONS, ...BIBLE_LESSONS].find(c => c.id === enrolmentSelectedCourseId)?.courseCode?.split('/')[0] || "ZIO01"
                  }/015/26`}
                </span>
              </div>

              {/* Signature / Certification check */}
              <label className="flex items-start space-x-2 text-[10px] text-stone-605 dark:text-stone-400 cursor-pointer">
                <input 
                  type="checkbox" 
                  required 
                  className="mt-0.5 rounded border-stone-300 dark:border-stone-850" 
                />
                <span>I confirm that I am registering for the specified Zion track. I acknowledge that all terms align with active course codes and academic integrity frameworks.</span>
              </label>

              {/* Footer action buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEnrolmentModal(false)}
                  className="w-1/3 py-3 bg-white hover:bg-stone-100 text-stone-630 border border-stone-200 dark:border-stone-800 rounded-xl font-bold text-xs uppercase cursor-pointer text-center tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEnrolment}
                  className="w-2/3 py-3 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white rounded-xl font-black text-xs uppercase cursor-pointer text-center tracking-wider transition flex items-center justify-center space-x-1"
                >
                  {isSubmittingEnrolment ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1 shrink-0" />
                      <span>Verifying Application Ledger...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Enrolment Form</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
