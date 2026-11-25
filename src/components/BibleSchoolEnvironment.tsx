import React, { useState, useEffect } from "react";
import {
  BookOpen, Cross, Sparkles, Search, Bookmark, BookmarkCheck,
  CheckCircle2, Award, Clock, HelpCircle, FileText, Video,
  ChevronRight, ArrowRight, Download, PenTool, Share2, Layers,
  Shield, Heart, Users, Compass, Flame, Save, RefreshCw
} from "lucide-react";
import { User, Book } from "../types";
import { BIBLE_LESSONS, PREBUILT_LESSONS } from "../schoolCurriculum";

interface BibleSchoolEnvironmentProps {
  currentUser: User | null;
  onLogIn?: () => void;
  onNavigate?: (view: string) => void;
}

interface BibleTrack {
  id: string;
  title: string;
  code: string;
  icon: string;
  topicsCount: number;
  duration: string;
  description: string;
  modules: {
    title: string;
    scriptures: string;
    notes: string;
    keyPoints: string[];
  }[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    scriptureRef: string;
  }[];
}

const BIBLE_TRACKS: BibleTrack[] = [
  {
    id: "old_testament",
    title: "Old Testament Survey & Hebrew Covenants",
    code: "BIB-101",
    icon: "📜",
    topicsCount: 12,
    duration: "4 Months",
    description: "Historical, prophetic, and covenantal exploration of Genesis through Malachi with original Hebrew shadows of the Messiah.",
    modules: [
      {
        title: "Creation, Fall & The Edenic Promise",
        scriptures: "Genesis 1–3, Genesis 12:1–3",
        notes: "Genesis establishes the divine baseline of creation, the sovereign covenant with Abraham, and the protoevangelium promise of the Redeemer.",
        keyPoints: [
          "Ex Nihilo: God created all things by the authority of His Word.",
          "Abrahamic Covenant: An unconditional eternal promise of blessing to all nations.",
          "Messianic Typology: The sacrificial lamb foreshadows Jesus Christ."
        ]
      },
      {
        title: "The Mosaic Law & Tabernacle Shadows",
        scriptures: "Exodus 20, Leviticus 16, Hebrews 9",
        notes: "The Tabernacle provides the visual pattern of access into God's presence through priesthood, altar of sacrifice, and holy of holies.",
        keyPoints: [
          "Moral, Civil, and Ceremonial dimensions of the Torah.",
          "The Day of Atonement (Yom Kippur) as the shadow of Calvary.",
          "Ark of the Covenant: Mercy seat overshadowing the law."
        ]
      }
    ],
    quiz: [
      {
        question: "What is the primary significance of the protoevangelium in Genesis 3:15?",
        options: [
          "It is a warning against agricultural blights in Canaan.",
          "It is the first prophetic declaration of the Messiah crushing Satan.",
          "It establishes the Levitical priesthood regulations.",
          "It specifies the dimensions of the Ark of the Covenant."
        ],
        correctIndex: 1,
        scriptureRef: "Genesis 3:15"
      }
    ]
  },
  {
    id: "new_testament",
    title: "New Testament Epistles & Gospels",
    code: "BIB-102",
    icon: "✝️",
    topicsCount: 14,
    duration: "4 Months",
    description: "The life, resurrection, and teachings of Jesus Christ in the four Gospels, followed by Pauline and General apostolic epistles.",
    modules: [
      {
        title: "The Incarnation & Kingdom of God",
        scriptures: "John 1:1–14, Matthew 5–7",
        notes: "The Word became flesh and dwelt among us. Jesus proclaimed the present and coming Kingdom through signs, miracles, and the Sermon on the Mount.",
        keyPoints: [
          "Logos doctrine in John 1: The eternal pre-existence of Christ.",
          "The Sermon on the Mount: The ethical constitution of the Kingdom.",
          "The Cross and Empty Tomb: Ultimate victory over sin and death."
        ]
      },
      {
        title: "Justification by Faith & Pauline Theology",
        scriptures: "Romans 3–8, Galatians 2:16–21",
        notes: "Salvation is by grace alone through faith alone in Jesus Christ, apart from the works of the law, resulting in life in the Holy Spirit.",
        keyPoints: [
          "Imputed righteousness of Christ credited to the believer.",
          "Romans 8: Life in the Spirit, no condemnation, and eternal security.",
          "The Church as the unified Body of Christ across Jew and Gentile."
        ]
      }
    ],
    quiz: [
      {
        question: "According to Romans 3:24, how is the believer justified before God?",
        options: [
          "By strictly keeping all ceremonial dietary laws.",
          "Freely by His grace through the redemption that is in Christ Jesus.",
          "By annual pilgrimage sacrifices to Jerusalem.",
          "Through personal intellectual merit."
        ],
        correctIndex: 1,
        scriptureRef: "Romans 3:24"
      }
    ]
  },
  {
    id: "systematic_theology",
    title: "Biblical Theology & Christian Doctrine",
    code: "BIB-103",
    icon: "🏛️",
    topicsCount: 16,
    duration: "5 Months",
    description: "Systematic doctrine covering Theology Proper, Christology, Pneumatology, Soteriology, Ecclesiology, and Eschatology.",
    modules: [
      {
        title: "The Nature & Attributes of the Triune God",
        scriptures: "Deuteronomy 6:4, Matthew 28:19, 2 Corinthians 13:14",
        notes: "God is one essence eternally existing in three co-equal, co-eternal Persons: Father, Son, and Holy Spirit.",
        keyPoints: [
          "Incommunicable attributes: Omniscience, Omnipresence, Omnipotence, Immutability.",
          "Communicable attributes: Love, Holiness, Justice, Mercy, Truth.",
          "Trinitarian harmony in creation, redemption, and sanctification."
        ]
      }
    ],
    quiz: [
      {
        question: "Which term describes God's unchangeable character and promises?",
        options: ["Omnipotence", "Immutability", "Omnipresence", "Sovereign Invisibility"],
        correctIndex: 1,
        scriptureRef: "Malachi 3:6, James 1:17"
      }
    ]
  },
  {
    id: "hermeneutics",
    title: "Biblical Hermeneutics & Exegesis",
    code: "BIB-104",
    icon: "🔍",
    topicsCount: 10,
    duration: "3 Months",
    description: "Scientific and spiritual principles for accurately interpreting scripture according to historical, grammatical, and literary context.",
    modules: [
      {
        title: "Exegesis vs. Eisegesis & Contextual Rules",
        scriptures: "2 Timothy 2:15, 2 Peter 1:20–21",
        notes: "Exegesis draws the original meaning out of the passage. Eisegesis forces the reader's preconceived bias into the text.",
        keyPoints: [
          "Immediate, chapter, and whole-book context.",
          "Original Greek and Hebrew nuances.",
          "Scripture interprets scripture (Analogy of Faith)."
        ]
      }
    ],
    quiz: [
      {
        question: "What is the primary danger of eisegesis in preaching?",
        options: [
          "Using Greek lexicons during study.",
          "Reading personal cultural assumptions into the text rather than hearing God's Word.",
          "Reading chapters sequentially.",
          "Writing notes in a study Bible."
        ],
        correctIndex: 1,
        scriptureRef: "2 Timothy 2:15"
      }
    ]
  },
  {
    id: "prayer_intercession",
    title: "Prayer, Fasting & Spiritual Warfare",
    code: "BIB-105",
    icon: "🔥",
    topicsCount: 8,
    duration: "2 Months",
    description: "Developing a prevailing personal and corporate prayer life, biblical fasting, and standing in spiritual authority.",
    modules: [
      {
        title: "The Mechanics of Prevailing Prayer",
        scriptures: "Luke 11:1–13, James 5:16–18, Ephesians 6:10–18",
        notes: "Effective, fervent prayer moves heaven and transforms communities. Fasting subdues the flesh and sharpens spiritual focus.",
        keyPoints: [
          "The Lord's Prayer as a model of kingdom priority.",
          "Interceding for nations, leaders, and revival in Western Kenya.",
          "The Armor of God and standing firm against spiritual deception."
        ]
      }
    ],
    quiz: [
      {
        question: "What does James 5:16 declare regarding the prayer of a righteous person?",
        options: [
          "It is effective only when spoken in Latin.",
          "It is powerful and effective, achieving much.",
          "It requires financial payment to church leaders.",
          "It is only valid on Sundays."
        ],
        correctIndex: 1,
        scriptureRef: "James 5:16"
      }
    ]
  },
  {
    id: "evangelism_missions",
    title: "Evangelism, Missions & Church Planting",
    code: "BIB-106",
    icon: "🌍",
    topicsCount: 12,
    duration: "4 Months",
    description: "Practical outreach strategies, sharing the Gospel with clarity, cross-cultural missions, and planting vibrant local churches.",
    modules: [
      {
        title: "The Great Commission & Personal Witnessing",
        scriptures: "Matthew 28:18–20, Acts 1:8, Romans 10:14–17",
        notes: "Go into all the world and preach the gospel. How will they hear without someone preaching to them?",
        keyPoints: [
          "Sharing personal testimony and the Roman Road of salvation.",
          "Open-air preaching, village outreaches, and hospital visitation.",
          "Follow-up discipleship of new converts."
        ]
      }
    ],
    quiz: [
      {
        question: "What is the ultimate mandate given by Jesus in Matthew 28:19?",
        options: [
          "To build secular commercial plazas.",
          "To go and make disciples of all nations, baptizing them in the Name of the Trinity.",
          "To avoid speaking with people of different backgrounds.",
          "To postpone ministry indefinitely."
        ],
        correctIndex: 1,
        scriptureRef: "Matthew 28:19"
      }
    ]
  },
  {
    id: "discipleship_mentorship",
    title: "Discipleship & Christian Mentorship",
    code: "BIB-107",
    icon: "🌱",
    topicsCount: 10,
    duration: "3 Months",
    description: "Guiding new believers into maturity, cultivating spiritual disciplines, and raising generational leaders.",
    modules: [
      {
        title: "Paul to Timothy: Generational Mentorship",
        scriptures: "2 Timothy 2:2, Titus 2:1–8",
        notes: "Entrust what you have heard to faithful people who will be able to teach others also.",
        keyPoints: [
          "Four generations of discipleship: Paul -> Timothy -> Faithful People -> Others.",
          "Accountability, holy living, and character development.",
          "Bible reading habits and personal devotions."
        ]
      }
    ],
    quiz: [
      {
        question: "In 2 Timothy 2:2, what qualification did Paul specify for those entrusted with teaching?",
        options: ["Wealthy merchants only", "Faithful people who are able to teach others", "Celebrity speakers", "Political figures"],
        correctIndex: 1,
        scriptureRef: "2 Timothy 2:2"
      }
    ]
  },
  {
    id: "pastoral_ministry",
    title: "Pastoral Ministry & Pastoral Care",
    code: "BIB-108",
    icon: "🤝",
    topicsCount: 12,
    duration: "4 Months",
    description: "Shepherding the flock of God with compassion, biblical counseling, hospital ministry, and conducting ordinances.",
    modules: [
      {
        title: "The Heart of a Shepherd",
        scriptures: "1 Peter 5:1–4, John 21:15–17",
        notes: "Shepherd God's flock under your care, watching over them not by compulsion, but willingly as God would have you.",
        keyPoints: [
          "Pastoral counseling for families, marriages, and grief.",
          "Conducting baptism, communion, and weddings.",
          "Preventing pastoral burnout and maintaining personal devotional life."
        ]
      }
    ],
    quiz: [
      {
        question: "According to 1 Peter 5:2, what should be the shepherd's motive?",
        options: ["Greedy financial gain", "Willing and eager service, not by compulsion", "Seeking authoritarian dominance", "Avoiding church members"],
        correctIndex: 1,
        scriptureRef: "1 Peter 5:2"
      }
    ]
  },
  {
    id: "church_leadership",
    title: "Church Leadership & Strategic Governance",
    code: "BIB-109",
    icon: "👑",
    topicsCount: 10,
    duration: "3 Months",
    description: "Biblical qualifications for elders and deacons, organizational administration, conflict resolution, and financial stewardship.",
    modules: [
      {
        title: "Qualifications for Elders & Deacons",
        scriptures: "1 Timothy 3:1–13, Titus 1:5–9",
        notes: "A church leader must be above reproach, self-controlled, respectable, hospitable, able to teach, and a faithful family leader.",
        keyPoints: [
          "Character precedes charisma in biblical ministry.",
          "Managing financial tithes, offerings, and accounts transparently.",
          "Conflict resolution using Matthew 18 guidelines."
        ]
      }
    ],
    quiz: [
      {
        question: "What is highlighted as a primary prerequisite for an overseer in 1 Timothy 3:2?",
        options: ["Being above reproach and self-controlled", "Having political connections", "Accumulating personal luxury", "Operating secret bank accounts"],
        correctIndex: 0,
        scriptureRef: "1 Timothy 3:2"
      }
    ]
  },
  {
    id: "christian_living",
    title: "Christian Living, Family & Ethics",
    code: "BIB-110",
    icon: "🏡",
    topicsCount: 10,
    duration: "3 Months",
    description: "Living as salt and light in society, honoring God in marriage and parenting, workplace stewardship, and public integrity.",
    modules: [
      {
        title: "The Christian Household & Ethical Workplace",
        scriptures: "Ephesians 5:21–6:9, Colossians 3:18–4:1",
        notes: "Whatever you do, work at it with all your heart, as working for the Lord, not for human masters.",
        keyPoints: [
          "Marriage reflecting Christ and the Church.",
          "Raising children in the training and instruction of the Lord.",
          "Financial honesty, avoiding bribery, and workplace diligence."
        ]
      }
    ],
    quiz: [
      {
        question: "According to Colossians 3:23, how should a Christian approach their work?",
        options: [
          "With minimal effort when the supervisor is away.",
          "With all their heart, working for the Lord and not for human masters.",
          "Seeking only immediate bribes.",
          "Refusing to work altogether."
        ],
        correctIndex: 1,
        scriptureRef: "Colossians 3:23"
      }
    ]
  },
  {
    id: "eschatology",
    title: "Eschatology & Biblical Prophecy",
    code: "BIB-111",
    icon: "🕊️",
    topicsCount: 8,
    duration: "2 Months",
    description: "Daniel, Revelation, and the Olivet discourse examining the Second Coming of Jesus, the resurrection, and the New Jerusalem.",
    modules: [
      {
        title: "The Blessed Hope & The New Creation",
        scriptures: "1 Thessalonians 4:13–18, Revelation 21–22",
        notes: "We await our blessed hope: the appearing of the glory of our great God and Savior, Jesus Christ. He will wipe every tear from our eyes.",
        keyPoints: [
          "The bodily resurrection of believers.",
          "The final judgment and new heavens and new earth.",
          "Living with urgency and holiness in light of Christ's return."
        ]
      }
    ],
    quiz: [
      {
        question: "What promise is given in Revelation 21:4 regarding the eternal state?",
        options: [
          "Sickness and sorrow will continue forever.",
          "God will wipe every tear from their eyes; there will be no more death or pain.",
          "Only earthly politicians will be recognized.",
          "People will not remember God."
        ],
        correctIndex: 1,
        scriptureRef: "Revelation 21:4"
      }
    ]
  }
];

export default function BibleSchoolEnvironment({
  currentUser,
  onLogIn,
  onNavigate,
}: BibleSchoolEnvironmentProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>("old_testament");
  const [activeTab, setActiveTab] = useState<"syllabus" | "reader" | "quiz" | "notes">("syllabus");

  // Track progress
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ZION_COMPLETED_BIBLE_TOPICS") || "[]");
    } catch {
      return [];
    }
  });

  // Saved Devotional Verses
  const [savedVerses, setSavedVerses] = useState<{ book: string; chapter: number; verse: number; text: string; note?: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ZION_SAVED_VERSES") || "[]");
    } catch {
      return [
        {
          book: "John",
          chapter: 3,
          verse: 16,
          text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
          note: "Foundational promise of unconditional love and eternal redemption."
        },
        {
          book: "Proverbs",
          chapter: 3,
          verse: 5,
          text: "Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.",
          note: "Guidance for leadership decisions across Bungoma."
        }
      ];
    }
  });

  // Study Notebook State
  const [personalStudyNotes, setPersonalStudyNotes] = useState<string>(() => {
    return localStorage.getItem("ZION_BIBLE_STUDY_NOTEBOOK") || "Zion Digital Bible School - Personal Study Journal\n\nDate: " + new Date().toLocaleDateString() + "\nTrack: Biblical Hermeneutics\nReflection: As ministers of the Gospel, we must handle the Word of truth with reverence and precision.";
  });
  const [notesSaveStatus, setNotesSaveStatus] = useState(false);

  // Quiz state
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, number>>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const selectedTrack = BIBLE_TRACKS.find((t) => t.id === selectedTrackId) || BIBLE_TRACKS[0];

  const handleToggleTopicCompletion = (topicId: string) => {
    setCompletedTopicIds((prev) => {
      const exists = prev.includes(topicId);
      const next = exists ? prev.filter((id) => id !== topicId) : [...prev, topicId];
      localStorage.setItem("ZION_COMPLETED_BIBLE_TOPICS", JSON.stringify(next));
      return next;
    });
  };

  const handleSaveNotes = () => {
    localStorage.setItem("ZION_BIBLE_STUDY_NOTEBOOK", personalStudyNotes);
    setNotesSaveStatus(true);
    setTimeout(() => setNotesSaveStatus(false), 2500);
  };

  const handleQuizAnswer = (optionIdx: number) => {
    setSelectedQuizAnswers((prev) => ({ ...prev, [activeQuizIndex]: optionIdx }));
  };

  const handleSubmitQuiz = () => {
    let score = 0;
    selectedTrack.quiz.forEach((q, idx) => {
      if (selectedQuizAnswers[idx] === q.correctIndex) {
        score += 1;
      }
    });
    setQuizScore(Math.round((score / selectedTrack.quiz.length) * 100));
  };

  return (
    <div className="space-y-6 text-left">
      {/* 1. Bible School Hero Banner */}
      <section className="rounded-3xl border border-stone-200 dark:border-slate-800 bg-gradient-to-r from-[#0B254D] via-[#1A365D] to-[#2B6CB0] text-white p-6 sm:p-8 shadow-md">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5B82E] text-[#0B254D] text-xs font-mono font-bold uppercase tracking-wider shadow-xs">
            <Cross className="h-3.5 w-3.5" />
            <span>Zion Bible School &middot; Theological &amp; Ministry Center</span>
          </div>

          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Comprehensive Scripture, Theology &amp; Ministry
          </h2>

          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            11 accredited biblical learning tracks covering Old and New Testaments, Systematic Theology, Hermeneutics, Evangelism, Discipleship, Church Leadership, and Eschatology. Study modules, sit for quizzes, and take notes.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-[#F5B82E] font-bold">
              11 Specialized Tracks
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-blue-100">
              66-Book Scripture Reader
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-emerald-300 font-bold">
              Accredited Diplomas
            </span>
          </div>
        </div>
      </section>

      {/* 2. Track Navigation Pills */}
      <div className="space-y-2">
        <p className="text-[11px] font-mono font-bold uppercase text-slate-500 tracking-wider">
          Select Specialized Biblical Track (11 Divisions)
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {BIBLE_TRACKS.map((track) => {
            const isSelected = track.id === selectedTrackId;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => {
                  setSelectedTrackId(track.id);
                  setActiveQuizIndex(0);
                  setSelectedQuizAnswers({});
                  setQuizScore(null);
                }}
                className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isSelected
                    ? "bg-[#0B254D] text-white border-[#F5B82E] shadow-sm font-bold scale-[1.02]"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-stone-200 dark:border-slate-800 hover:border-[#155EEF]"
                }`}
              >
                <span>{track.icon}</span>
                <span className="truncate max-w-[180px]">{track.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Track Details Header Card */}
      <section className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#155EEF] text-white text-[10px] font-mono font-bold">
                {selectedTrack.code}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Duration: {selectedTrack.duration} &middot; {selectedTrack.topicsCount} Topics
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-[#0B254D] dark:text-white">
              {selectedTrack.icon} {selectedTrack.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {selectedTrack.description}
            </p>
          </div>

          {/* Sub-tab switcher */}
          <div className="flex rounded-xl bg-stone-100 dark:bg-slate-800 p-1 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("syllabus")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "syllabus" ? "bg-white dark:bg-slate-900 text-[#0B254D] dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Study Modules
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("quiz")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "quiz" ? "bg-white dark:bg-slate-900 text-[#0B254D] dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Track Quiz
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === "notes" ? "bg-white dark:bg-slate-900 text-[#0B254D] dark:text-white shadow-xs" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Study Journal
            </button>
          </div>
        </div>

        {/* Tab Content: Study Modules */}
        {activeTab === "syllabus" && (
          <div className="space-y-4">
            {selectedTrack.modules.map((mod, i) => {
              const modKey = `${selectedTrack.id}_mod_${i}`;
              const isCompleted = completedTopicIds.includes(modKey);
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-stone-200 dark:border-slate-800 p-4 sm:p-5 space-y-3 bg-stone-50/50 dark:bg-slate-800/40"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 dark:border-slate-700/60 pb-2.5">
                    <div>
                      <span className="font-mono text-[10px] font-bold uppercase text-[#155EEF] block">
                        Module {i + 1}
                      </span>
                      <h4 className="font-display text-base font-bold text-[#0B254D] dark:text-white">
                        {mod.title}
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-mono mt-0.5">
                        📖 Scriptures: {mod.scriptures}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleTopicCompletion(modKey)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        isCompleted
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-stone-200 dark:border-slate-700 hover:border-emerald-500"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isCompleted ? "Completed" : "Mark as Studied"}</span>
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {mod.notes}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold uppercase text-slate-500 font-mono">
                      Key Competencies &amp; Hermeneutical Takeaways:
                    </p>
                    <ul className="space-y-1">
                      {mod.keyPoints.map((pt, j) => (
                        <li key={j} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                          <span className="text-[#F5B82E] mt-0.5 font-bold">&bull;</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content: Quiz */}
        {activeTab === "quiz" && (
          <div className="rounded-2xl border border-stone-200 dark:border-slate-800 p-5 space-y-4 bg-stone-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-700 pb-3">
              <div>
                <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                  Sectional Examination Quiz: {selectedTrack.title}
                </h4>
                <p className="text-xs text-slate-500">Test your mastery of covenants, scriptures, and theology.</p>
              </div>
              {quizScore !== null && (
                <div className="text-right">
                  <span className="font-mono text-lg font-bold text-[#155EEF]">{quizScore}%</span>
                  <span className="block text-[10px] text-slate-500">Final Mark</span>
                </div>
              )}
            </div>

            {selectedTrack.quiz.map((q, qIdx) => (
              <div key={qIdx} className="space-y-3">
                <p className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                  {qIdx + 1}. {q.question}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, optIdx) => {
                    const isChosen = selectedQuizAnswers[qIdx] === optIdx;
                    const isCorrect = q.correctIndex === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleQuizAnswer(optIdx)}
                        className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                          isChosen
                            ? "bg-[#155EEF] text-white border-[#155EEF] font-bold"
                            : "bg-white dark:bg-slate-900 border-stone-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#155EEF]"
                        }`}
                      >
                        <span className="font-mono font-bold mr-2 text-[11px] opacity-70">
                          {["A", "B", "C", "D"][optIdx]}.
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {quizScore !== null && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                    ✓ Scripture Reference: {q.scriptureRef}
                  </p>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleSubmitQuiz}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[#0B254D] hover:bg-[#155EEF] text-white font-bold text-xs transition cursor-pointer shadow-xs"
            >
              Submit Quiz for Grading
            </button>
          </div>
        )}

        {/* Tab Content: Personal Study Journal */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white">
                  Personal Scripture Study Journal
                </h4>
                <p className="text-xs text-slate-500">Write prayer reflections, theological insights, and sermon prep.</p>
              </div>
              <button
                type="button"
                onClick={handleSaveNotes}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#155EEF] hover:bg-[#0F49C7] text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{notesSaveStatus ? "Saved!" : "Save Journal"}</span>
              </button>
            </div>

            <textarea
              rows={8}
              value={personalStudyNotes}
              onChange={(e) => setPersonalStudyNotes(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800 p-4 text-xs sm:text-sm font-sans leading-relaxed text-slate-800 dark:text-white outline-none focus:border-[#155EEF]"
              placeholder="Record your scripture study notes, Hebrew word roots, and devotional thoughts..."
            />
          </div>
        )}
      </section>

      {/* 4. Saved Devotional Scripture Wall */}
      <section className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-sm font-bold text-[#0B254D] dark:text-white flex items-center gap-2">
            <BookmarkCheck className="h-4 w-4 text-[#F5B82E]" />
            <span>Saved Devotional Verses ({savedVerses.length})</span>
          </h4>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("devotional")}
              className="text-xs font-bold text-[#155EEF] hover:underline cursor-pointer"
            >
              Open 66-Book Bible Reader &rarr;
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {savedVerses.map((v, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-2 text-left"
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-900 dark:text-amber-300">
                <span>{v.book} {v.chapter}:{v.verse}</span>
                <span className="text-[10px] uppercase text-slate-400">NIV</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 italic font-serif leading-relaxed">
                "{v.text}"
              </p>
              {v.note && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-amber-200/60 dark:border-amber-900/30">
                  Note: {v.note}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
