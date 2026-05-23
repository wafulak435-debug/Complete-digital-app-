import React, { useState } from "react";
import { Award, Globe, BookOpen, Lightbulb, Play, ArrowRight, ShieldCheck, CheckCircle2, X, RefreshCw, Sparkles, BookCheck } from "lucide-react";

interface LeadershipSchoolProps {
  onUnlockBadge: (badgeId: string) => void;
  unlockedBadges: string[];
}

interface Lesson {
  id: string;
  topic: string;
  slogan: string;
  intro: string;
  points: string[];
  selfAssessment: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

const PREBUILT_LESSONS: Lesson[] = [
  {
    id: "visionary",
    topic: "Visionary Leadership",
    slogan: "Cast Vision, Ignite Transformational Action",
    intro: "A visionary leader does not just look at the horizon; they build the road toward it. Power comes from articulating a clear, desirable future state.",
    points: [
      "Define the 'Why': People follow goals only when they understand the fundamental purpose of the work.",
      "Communicate with Simplicity: Use relatable analogies and repeatable slogans to paint the future state.",
      "Involve Local Assets: Ground your grand vision in local realities, whether in Bungoma, Nairobi, or beyond."
    ],
    selfAssessment: {
      question: "What is the primary driver of visionary alignment?",
      options: [
        "Rigorous top-down commands and strictly enforced telemetry.",
        "Articulating a clear, desirable 'Why' that connects with people's values.",
        "Ignoring local resources and focusing exclusively on global parameters."
      ],
      correctIndex: 1,
      explanation: "Visionary leadership inspires engagement from within. By clearly communicating the core 'Why', leaders earn willing dedication rather than forced compliance."
    }
  },
  {
    id: "communication",
    topic: "Effective Communication",
    slogan: "Connect First, Speak Second",
    intro: "The fundamental failure in communication is assuming that it has taken place. Effective leaders prioritize active listening over verbal dominance.",
    points: [
      "The 70-30 Rule: Spend 70% of your conversation listening to feedback, concerns, and local ideas.",
      "Acknowledge Before Answering: Establish immediate safety by letting your listeners feel heard and understood.",
      "Closer Loops: Ask target listeners to re-describe core actions in their own words to prevent gaps."
    ],
    selfAssessment: {
      question: "What does the 70-30 rule of communicative listening establish?",
      options: [
        "A leader should speak 70% of the time to maintain absolute intellectual focus.",
        "A leader should spend 70% of the time actively listening to feedback and local perspectives.",
        "That only 30% of any spoken instruction is translated into workable PDFs."
      ],
      correctIndex: 1,
      explanation: "Active listening demonstrates humility and gathers crucial local context. Speaking less and studying more prevents strategic mistakes."
    }
  },
  {
    id: "thinking",
    topic: "Strategic Thinking",
    slogan: "Prepare the Path, Adapt the Steps",
    intro: "Tactics are what you do when there is something to do. Strategy is what you do when there is nothing to do.",
    points: [
      "Anticipate Multi-Order Effects: Look beyond the immediate result of an action to see where it lands next.",
      "Buffer Allocation: Allocate resources defensively to withstand unexpected connection drops or resource caps.",
      "Objective Centering: Tie daily operations to your primary vision, letting minor steps evolve dynamically."
    ],
    selfAssessment: {
      question: "Which of the following is core to strategic thinking as a leader?",
      options: [
        "Focusing purely on immediate, short-term reactive actions.",
        "Anticipating multi-order effects of decisions and defending resources with buffers.",
        "Ignoring the vision to complete tactical logs faster."
      ],
      correctIndex: 1,
      explanation: "Strategy is proactive. It builds defensive buffers and anticipates second-order consequences to protect the long-term vision."
    }
  }
];

export default function LeadershipSchool({ onUnlockBadge, unlockedBadges }: LeadershipSchoolProps) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasCheckedAnswer, setHasCheckedAnswer] = useState(false);
  const [customTopic, setCustomTopic] = useState("");
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<any>(null);

  const handleStartLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setSelectedOption(null);
    setHasCheckedAnswer(false);
  };

  const handleCheckAnswer = () => {
    if (selectedOption !== null) {
      setHasCheckedAnswer(true);
      if (selectedOption === selectedLesson?.selfAssessment.correctIndex) {
        // Unlock custom leadership scholar badge after success!
        onUnlockBadge("badge_3");
      }
    }
  };

  const handleGenerateCustom = async () => {
    if (!customTopic.trim()) return;
    setIsGeneratingCustom(true);
    setGeneratedLesson(null);

    try {
      const response = await fetch("/api/ai/language-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: customTopic,
          targetLang: "Leadership",
          mode: "lesson"
        })
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedLesson(data.text);
        onUnlockBadge("badge_3");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingCustom(false);
    }
  };

  return (
    <div id="leadership_school_container" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Editorial Header Section */}
      <div className="relative mb-10 overflow-hidden rounded-3xl bg-red-900 px-6 py-12 text-white shadow-xl sm:px-12 object-cover">
        {/* Abstract background subtle glow */}
        <div className="absolute inset-0 bg-radial-gradient from-red-800/80 to-red-950 object-cover opacity-60 pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center space-x-2 rounded-full bg-red-800/60 px-3.5 py-1.5 w-fit text-red-200 text-xs font-bold tracking-wider upper mb-4 border border-red-750">
            <Award className="h-4 w-4" />
            <span>WA KELVIN LEADERSHIP INITIATIVE</span>
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl leading-tight">
            Leadership School
          </h2>
          <p className="mt-3 text-lg text-red-100 sm:text-xl font-medium italic">
            "Raising Leaders Who Transform Nations"
          </p>
          
          <div className="mt-8 grid gap-4 sm:grid-cols-2 border-t border-red-800/85 pt-6 text-xs text-red-100">
            <div>
              <span className="font-bold text-white block mb-1">VISIONSTATEMENT</span>
              To raise a generation of servant leaders who impact their communities, nations, and the world with integrity, wisdom, and purpose.
            </div>
            <div>
              <span className="font-bold text-white block mb-1">OUR CORE MISSION</span>
              To equip, empower, and inspire individuals through practical leadership training, mentorship, and transformative learning experiences.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Core Lesson Chooser Left Rails */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
            <h3 className="font-display text-base font-bold text-stone-900 mb-4 flex items-center space-x-2">
              <BookCheck className="h-4 w-4 text-red-700" />
              <span>Core Curriculum</span>
            </h3>

            <div className="space-y-2">
              {PREBUILT_LESSONS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => handleStartLesson(l)}
                  className={`flex w-full items-center justify-between rounded-xl p-3.5 text-left border transition ${
                    selectedLesson?.id === l.id 
                      ? "border-red-400 bg-red-50 text-red-900" 
                      : "border-stone-100 bg-neutral-50 hover:bg-neutral-100 text-neutral-800"
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wide opacity-85">{l.topic}</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5 max-w-[200px] truncate">{l.slogan}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>

          {/* AI Custom Lesson Generator Box */}
          <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-neutral-50 to-white p-5 shadow-xs">
            <div className="flex items-center space-x-1.5 text-red-700 font-bold text-sm mb-3">
              <Sparkles className="h-4 w-4" />
              <span>AI Dynamic Scholar</span>
            </div>
            <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
              Don't see your leadership struggle listed? Type any specific dilemma (e.g. "Micro-management in Bungoma collectives") and let our generator construct a specialized model study!
            </p>
            <div className="space-y-2">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. delegating responsibility"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs outline-none focus:border-red-700"
              />
              <button
                onClick={handleGenerateCustom}
                disabled={isGeneratingCustom || !customTopic.trim()}
                className="flex w-full items-center justify-center space-x-1.5 rounded-lg bg-red-700 py-2 text-xs font-bold text-white hover:bg-red-800 transition disabled:opacity-50"
              >
                {isGeneratingCustom ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Analyzing & Outlining...</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-3 w-3" />
                    <span>Compile AI Microlesson</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Current Lesson Presentation Content pane */}
        <div className="lg:col-span-8">
          {generatedLesson ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs relative">
              <button 
                onClick={() => setGeneratedLesson(null)} 
                className="absolute top-4 right-4 text-xs font-semibold text-stone-500 hover:text-stone-900 border border-stone-200 bg-neutral-50 rounded px-2 py-1"
              >
                Close Lesson
              </button>
              <div className="flex items-center space-x-2 text-red-700 text-xs font-bold uppercase tracking-widest mb-4">
                <Sparkles className="h-4 w-4 animate-spin" />
                <span>DYNAMIC MICROLESSON GENERATED</span>
              </div>
              <div className="prose prose-stone text-xs text-stone-800 leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto pr-2">
                {generatedLesson}
              </div>
              <div className="mt-6 flex items-center space-x-2 rounded-xl bg-red-50 p-3 text-red-800 border-l-4 border-red-750 text-xs">
                <span>🎓</span>
                <span>Badge Progress: Your initiative earns you immediate credentials inside our Bungoma Scholar category! View My Library to view your certificates.</span>
              </div>
            </div>
          ) : selectedLesson ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
              {/* Slogan Intro Header */}
              <div className="border-b border-stone-100 pb-4">
                <h3 className="font-display text-2xl font-bold text-neutral-950">{selectedLesson.topic}</h3>
                <p className="text-xs font-bold font-mono text-red-700 uppercase tracking-widest mt-1">"{selectedLesson.slogan}"</p>
              </div>

              {/* Lesson body section */}
              <div className="space-y-4">
                <p className="text-xs text-neutral-600 leading-relaxed italic border-l-2 border-red-700 pl-3">
                  {selectedLesson.intro}
                </p>

                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase">Core Transformational Actions</h4>
                  <ul className="space-y-2">
                    {selectedLesson.points.map((pt, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-xs text-neutral-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-red-700 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Multiple choice quiz self-assessment section! */}
              <div className="rounded-xl bg-stone-50 border border-stone-200/60 p-5 space-y-4">
                <div className="flex items-center space-x-1 text-neutral-900 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-green-700" />
                  <span>Self-Assessment Quiz</span>
                </div>

                <p className="text-xs font-bold text-neutral-800">{selectedLesson.selfAssessment.question}</p>

                <div className="space-y-1.5 text-xs">
                  {selectedLesson.selfAssessment.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      disabled={hasCheckedAnswer}
                      onClick={() => setSelectedOption(oIdx)}
                      className={`flex w-full items-center space-x-2 rounded-lg p-3 text-left border transition ${
                        selectedOption === oIdx 
                          ? "border-neutral-900 bg-neutral-900 text-white font-medium" 
                          : "border-stone-200 bg-white hover:bg-stone-100 text-neutral-700"
                      }`}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-neutral-800">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>

                {hasCheckedAnswer ? (
                  <div className="space-y-3 pt-2">
                    {selectedOption === selectedLesson.selfAssessment.correctIndex ? (
                      <div className="rounded-lg bg-green-50/80 p-3.5 text-xs text-green-800 border-l-4 border-green-600">
                        <span className="font-bold block mb-1">✅ Excellent! Beautiful Choice!</span>
                        {selectedLesson.selfAssessment.explanation}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-red-50/80 p-3.5 text-xs text-red-800 border-l-4 border-red-650">
                        <span className="font-bold block mb-1">❌ Incompatible Choice</span>
                        Let's try again! Correct Answer is option: {" "}
                        {String.fromCharCode(65 + selectedLesson.selfAssessment.correctIndex)}.
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedOption(null);
                        setHasCheckedAnswer(false);
                      }}
                      className="text-xs font-bold text-stone-500 hover:text-stone-900 underline block"
                    >
                      Try Question Again
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCheckAnswer}
                    disabled={selectedOption === null}
                    className="w-full rounded-lg bg-neutral-900/95 py-2.5 text-xs font-bold text-white hover:bg-neutral-950 transition active:scale-97 disabled:opacity-45"
                  >
                    Confirm Answer Choice
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-white p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700 text-xl font-bold">
                💡
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-neutral-950">Active Class Cohort</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                  Choose an active topic from the Leadership curriculum on the left side, or use our dynamic generator to build an outline. Satisfy the assessment to lock in dynamic badges!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
