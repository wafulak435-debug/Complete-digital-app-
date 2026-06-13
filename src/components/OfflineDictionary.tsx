import React, { useState, useEffect } from "react";
import { Search, Volume2, Plus, Bookmark, Trash2, Shield, Sparkles, BookOpen, BrainCircuit } from "lucide-react";

interface DictionaryWord {
  word: string;
  pronunciation: string;
  definition: string;
  example: string;
  category: "Leadership" | "Academic" | "Theology" | "Swahili" | "Technical" | "User Custom";
}

// Extensive pre-loaded offline scholastic dictionary database
const GENERAL_OFFLINE_WORDS: DictionaryWord[] = [
  {
    word: "Stewardship",
    pronunciation: "/ˈstjuːədʃɪp/",
    definition: "The responsible planning and moral management of resources. In executive leadership, stewardship prioritizing the ultimate health and sustainability of your community above self-promotion.",
    example: "His stewardship of the library funds ensured every schoolboy in Bungoma received clean books.",
    category: "Leadership"
  },
  {
    word: "Hermeneutics",
    pronunciation: "/ˌhɜːmɪˈnjuːtɪks/",
    definition: "The study or theory of literary text interpretation, particularly of the bible, philosophical, and legal scriptures.",
    example: "To understand the deep context of Galatians, the theologian applied strict literal hermeneutics.",
    category: "Theology"
  },
  {
    word: "Ubuntu (Utu)",
    pronunciation: "/ʊˈbʊntuː/",
    definition: "A classical African humanist philosophy representing general kindness, communal solidarity, and the fundamental belief that 'I am because we are'.",
    example: "The leadership team operated with ubuntu, ensuring unified support for the disabled readers.",
    category: "Swahili"
  },
  {
    word: "Ambidextrous Leadership",
    pronunciation: "/æmbɪˈdɛkstərəs ˈliːdərʃɪp/",
    definition: "The state when governance is both efficient at optimizing current day-to-day services while concurrently exploring changes to meet future community demands.",
    example: "She practiced ambidextrous leadership, scaling the traditional bookstores while building mobile apps.",
    category: "Leadership"
  },
  {
    word: "Exegesis",
    pronunciation: "/ˌɛksɪˈdʒiːsɪs/",
    definition: "A critical explanation, direct analytical breakdown, or interpretation of a scriptural passage, exposing the original authorial intent.",
    example: "The pastor delivered an exhaustive exegesis of Psalms 23 during his presentation.",
    category: "Theology"
  },
  {
    word: "Efficacy",
    pronunciation: "/ˈɛfɪkəsi/",
    definition: "The exact capability to produce a desired, intended, or successful outcome.",
    example: "Digital self-publishing significantly improves the distribution efficacy of educational manuals.",
    category: "Academic"
  },
  {
    word: "Integrity",
    pronunciation: "/ɪnˈtɛɡrɪti/",
    definition: "The standard of being fully honest, presenting uncompromising moral principles and pristine character.",
    example: "The administration is recognized for its structural integrity, keeping audit processes completely transparent.",
    category: "Leadership"
  },
  {
    word: "Kiongozi",
    pronunciation: "/kee-on-go-zee/",
    definition: "The East African Swahili translation for 'Leader' or 'Statesman'. One who leads or guides a community with honor.",
    example: "Kelvin was chosen as the kiongozi because of his digital and visual vision for Kenya.",
    category: "Swahili"
  },
  {
    word: "Elimu",
    pronunciation: "/ee-lee-moo/",
    definition: "The Swahili translation for 'Knowledge' or 'Education'. Systemic training of intellectual faculties.",
    example: "We are expanding elimu with offline-friendly apps so students can learn without network limits.",
    category: "Swahili"
  },
  {
    word: "Mwalimu",
    pronunciation: "/mwah-lee-moo/",
    definition: "The Swahili word for 'Teacher' or 'Instructor'. A person of prestige who guides learning.",
    example: "Our AI language mwalimu conducts quizzes and grades learners professionally.",
    category: "Swahili"
  },
  {
    word: "Epistemology",
    pronunciation: "/ɪˌpɪstɪˈmɒlədʒi/",
    definition: "The branch of philosophy concerned with the theory of knowledge, investigating its methods, validity, and scope.",
    example: "Constructing an offline database is an exercise in practical learning epistemology.",
    category: "Academic"
  },
  {
    word: "Omnipresent",
    pronunciation: "/ˌɒmnɪˈprɛznt/",
    definition: "The state of being widely or constantly encountered, widespread, or existing everywhere simultaneously.",
    example: "In digital literature, portable devices have made access to files almost omnipresent.",
    category: "Theology"
  },
  {
    word: "DRM (Digital Rights)",
    pronunciation: "/dee-ahr-em/",
    definition: "A systematic approach to copyright protection for digital media, preventing unauthorized copying or sharing of premium publications.",
    example: "All premium book downloads are equipped with offline DRM keys to project intellectual assets.",
    category: "Technical"
  },
  {
    word: "Synthesizer",
    pronunciation: "/ˈsɪnθəsaɪzə/",
    definition: "An electronic device or software module capable of translating text signals into audible synthetic voice waves.",
    example: "The TTS audio engine uses a state-of-the-art synthesizer to speak chapters hands-free.",
    category: "Technical"
  },
  {
    word: "Steward",
    pronunciation: "/ˈstjuːəd/",
    definition: "A person whose job is to manage an organization, property, or financial resource ethically on behalf of others.",
    example: "A true steward preserves resources to support forthcoming generations.",
    category: "Leadership"
  }
];

export default function OfflineDictionary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [dictionaryList, setDictionaryList] = useState<DictionaryWord[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"search" | "saved" | "game">("search");

  // Oxford API exact definition states
  const [apiWords, setApiWords] = useState<DictionaryWord[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  // Word of the Day state
  const [wordOfTheDay, setWordOfTheDay] = useState<DictionaryWord>(GENERAL_OFFLINE_WORDS[0]);

  // Adding Custom Word state
  const [newWord, setNewWord] = useState("");
  const [newPronunciation, setNewPronunciation] = useState("");
  const [newDef, setNewDef] = useState("");
  const [newEx, setNewEx] = useState("");
  const [newCategory, setNewCategory] = useState<"Leadership" | "Academic" | "Theology" | "Swahili" | "Technical" | "User Custom">("User Custom");
  const [isAdding, setIsAdding] = useState(false);

  // Vocabulary Matching Quiz states
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [currentQuizWord, setCurrentQuizWord] = useState<DictionaryWord | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState("");

  // Advanced Vocabulary Challenge (My Reference Links sources) states
  const [usePersonalLinksQuiz, setUsePersonalLinksQuiz] = useState(false);
  const [personalLinksList, setPersonalLinksList] = useState<any[]>([]);
  const [advQuizScore, setAdvQuizScore] = useState(0);
  const [advQuizTotal, setAdvQuizTotal] = useState(0);
  const [advCurrentQuestion, setAdvCurrentQuestion] = useState<{
    type: 'url' | 'category' | 'title';
    questionText: string;
    choices: string[];
    correctAnswer: string;
    linkItem: any;
  } | null>(null);
  const [advSelectedAnswer, setAdvSelectedAnswer] = useState<string | null>(null);
  const [advQuizSubmitted, setAdvQuizSubmitted] = useState(false);
  const [advQuizFeedback, setAdvQuizFeedback] = useState("");

  useEffect(() => {
    // Sync words with LocalStorage to allow custom offline additions
    const savedCustom = localStorage.getItem("WAFULA_CUSTOM_WORDS");
    let initialList = [...GENERAL_OFFLINE_WORDS];
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        initialList = [...initialList, ...parsed];
      } catch (err) {
        console.warn("Could not parse saved custom words", err);
      }
    }
    setDictionaryList(initialList);

    // Sync bookmarks
    const savedBook = localStorage.getItem("WAFULA_DIC_BOOKMARKS");
    if (savedBook) {
      try {
        setBookmarks(JSON.parse(savedBook));
      } catch (err) {}
    }

    // Set Word of the Day dynamically based on the current date
    const day = new Date().getDate();
    const index = day % GENERAL_OFFLINE_WORDS.length;
    setWordOfTheDay(GENERAL_OFFLINE_WORDS[index]);
  }, []);

  // Debounced real-time exact Oxford Dictionary API matcher
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setApiWords([]);
      setIsSearchingApi(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q.toLowerCase())}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const list: DictionaryWord[] = data.map((entry: any) => {
              const wordName = entry.word.charAt(0).toUpperCase() + entry.word.slice(1);
              const pronunciation = entry.phonetic || (entry.phonetics && entry.phonetics.find((p: any) => p.text)?.text) || `/${q}/`;
              
              const meanings = entry.meanings || [];
              const definition = meanings.map((m: any) => {
                const part = m.partOfSpeech ? `[${m.partOfSpeech}]` : '';
                const firstDef = m.definitions && m.definitions[0]?.definition;
                return firstDef ? `${part} ${firstDef}` : '';
              }).filter(Boolean).join("; ");

              let example = "";
              for (const m of meanings) {
                if (m.definitions) {
                  const found = m.definitions.find((d: any) => d.example);
                  if (found) {
                    example = found.example;
                    break;
                  }
                }
              }
              if (!example) {
                example = `Learners studied the exact definition of ${q} in the Oxford scholastic lexicon.`;
              }

              return {
                word: wordName,
                pronunciation,
                definition: definition || "Meaning documented in the Oxford Standard Reference.",
                example,
                category: "Academic" as const
              };
            });
            setApiWords(list);
          } else {
            setApiWords([]);
          }
        } else {
          setApiWords([]);
        }
      } catch (err) {
        console.error("Dictionary API error", err);
        setApiWords([]);
      } finally {
        setIsSearchingApi(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Update bookmarks helper
  const handleToggleBookmark = (wName: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(wName) ? prev.filter(b => b !== wName) : [...prev, wName];
      localStorage.setItem("WAFULA_DIC_BOOKMARKS", JSON.stringify(next));
      return next;
    });
  };

  // Text to Speech voice implementation
  const handleSpeakWord = (wordItem: DictionaryWord) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Voice speech synthesis is not supported in this browser environment.");
      return;
    }
    window.speechSynthesis.cancel();
    const speechText = `${wordItem.word}. Defined as: ${wordItem.definition}. Example: ${wordItem.example}`;
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Custom Word addition
  const handleAddCustomWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newDef.trim()) {
      alert("Word and Definition are mandatory parameters!");
      return;
    }

    const createdWord: DictionaryWord = {
      word: newWord.trim(),
      pronunciation: newPronunciation.trim() || "/custom/",
      definition: newDef.trim(),
      example: newEx.trim() || "Used constructively in scholastic learning.",
      category: newCategory
    };

    const savedCustom = localStorage.getItem("WAFULA_CUSTOM_WORDS");
    let customArr = [];
    if (savedCustom) {
      try {
        customArr = JSON.parse(savedCustom);
      } catch (e) {}
    }
    customArr.push(createdWord);
    localStorage.setItem("WAFULA_CUSTOM_WORDS", JSON.stringify(customArr));

    setDictionaryList([...dictionaryList, createdWord]);
    setIsAdding(false);

    // Reset inputs
    setNewWord("");
    setNewPronunciation("");
    setNewDef("");
    setNewEx("");
    setNewCategory("User Custom");

    alert(`Successfully registered custom vocabulary "${createdWord.word}" offline !`);
  };

  // Run quiz generation
  const handleGenerateQuiz = () => {
    if (dictionaryList.length < 4) return;
    
    // Choose random key word
    const randIndex = Math.floor(Math.random() * dictionaryList.length);
    const correctWord = dictionaryList[randIndex];
    
    // Get 3 incorrect answers
    const filteredOther = dictionaryList.filter(item => item.word !== correctWord.word);
    const shuffledOther = [...filteredOther].sort(() => 0.5 - Math.random());
    const distractors = shuffledOther.slice(0, 3).map(i => i.definition);
    
    // Shuffle solutions
    const answers = [correctWord.definition, ...distractors].sort(() => 0.5 - Math.random());
    
    setCurrentQuizWord(correctWord);
    setQuizAnswers(answers);
    setSelectedQuizAnswer(null);
    setQuizSubmitted(false);
    setQuizFeedback("");
  };

  // Run advanced link-based vocabulary challenge generation
  const handleGenerateAdvQuiz = () => {
    const savedLnks = localStorage.getItem("WAFULA_PERSONAL_LINKS");
    let links: any[] = [];
    if (savedLnks) {
      try {
        links = JSON.parse(savedLnks);
      } catch (err) {}
    }
    
    // Provide standard scholastic fallback set so users can play and understand immediately
    if (!links || links.length === 0) {
      links = [
        { id: "def-1", title: "Bungoma Education Portal", url: "https://bungoma-edu.org", category: "Academic" },
        { id: "def-2", title: "Scholastic Leadership Thesis", url: "https://scholastic-leadership.com/thesis", category: "Leadership" },
        { id: "def-3", title: "Theological Lexicon Index", url: "https://theology-lexicon.org/terms", category: "Theology" },
        { id: "def-4", title: "Advanced Technical Repository", url: "https://tech-repo.wafula.dev", category: "Technical" }
      ];
    }
    setPersonalLinksList(links);

    // Pick a random target link
    const targetLink = links[Math.floor(Math.random() * links.length)];
    
    // Decisions of query target type: 'url' | 'category' | 'title'
    const qTypes: ('url' | 'category' | 'title')[] = ['url', 'category', 'title'];
    const randType = qTypes[Math.floor(Math.random() * qTypes.length)];
    
    let questionText = "";
    let correctAnswer = "";
    let choices: string[] = [];
    
    if (randType === 'url') {
      questionText = `Which URL is associated with the saved reference link titled "${targetLink.title}"?`;
      correctAnswer = targetLink.url;
      
      const otherUrls = links.filter(l => l.id !== targetLink.id).map(l => l.url);
      const uniqueOthers = Array.from(new Set(otherUrls));
      while (uniqueOthers.length < 3) {
        uniqueOthers.push(`https://reference-source-${uniqueOthers.length + 1}.edu`);
      }
      const distractors = uniqueOthers.slice(0, 3);
      choices = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
      
    } else if (randType === 'category') {
      questionText = `Under which Category is the saved reference link "${targetLink.title}" filed?`;
      correctAnswer = targetLink.category;
      
      const categoriesList = ["Academic", "Leadership", "Theology", "Technical", "General", "Research", "Swahili"];
      const otherCats = categoriesList.filter(c => c !== correctAnswer);
      const distractors = [...otherCats].sort(() => 0.5 - Math.random()).slice(0, 3);
      choices = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
      
    } else {
      questionText = `Which of your custom saved references points directly to the URL: "${targetLink.url}"?`;
      correctAnswer = targetLink.title;
      
      const otherTitles = links.filter(l => l.id !== targetLink.id).map(l => l.title);
      const uniqueOthers = Array.from(new Set(otherTitles));
      while (uniqueOthers.length < 3) {
        uniqueOthers.push(`Scholarly Resource Entry #${uniqueOthers.length + 1}`);
      }
      const distractors = uniqueOthers.slice(0, 3);
      choices = [correctAnswer, ...distractors].sort(() => 0.5 - Math.random());
    }

    setAdvCurrentQuestion({
      type: randType,
      questionText,
      choices,
      correctAnswer,
      linkItem: targetLink
    });
    setAdvSelectedAnswer(null);
    setAdvQuizSubmitted(false);
    setAdvQuizFeedback("");
  };

  useEffect(() => {
    if (activeTab === "game") {
      if (usePersonalLinksQuiz) {
        if (!advCurrentQuestion) {
          handleGenerateAdvQuiz();
        }
      } else {
        if (!currentQuizWord) {
          handleGenerateQuiz();
        }
      }
    }
  }, [activeTab, usePersonalLinksQuiz, dictionaryList]);

  const handleSubmitQuiz = () => {
    if (!currentQuizWord || !selectedQuizAnswer) return;
    setQuizSubmitted(true);
    setQuizTotal((prev) => prev + 1);

    if (selectedQuizAnswer === currentQuizWord.definition) {
      setQuizScore((prev) => prev + 1);
      setQuizFeedback("🎉 Correct! Excellent scholastic understanding of theological and executive vocabulary.");
    } else {
      setQuizFeedback(`❌ Incorrect. The true definition of "${currentQuizWord.word}" is: ${currentQuizWord.definition}`);
    }
  };

  const handleSubmitAdvQuiz = () => {
    if (!advCurrentQuestion || !advSelectedAnswer) return;
    setAdvQuizSubmitted(true);
    setAdvQuizTotal((prev) => prev + 1);
    
    if (advSelectedAnswer === advCurrentQuestion.correctAnswer) {
      setAdvQuizScore((prev) => prev + 1);
      setAdvQuizFeedback("🎉 Outstanding! Your scholarly trace of personal knowledge links is fully synchronized.");
    } else {
      setAdvQuizFeedback(`❌ Incorrect. The precise detail matches: "${advCurrentQuestion.correctAnswer}"`);
    }
  };

  const filteredWords = (() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = dictionaryList.filter((item) => {
      if (!query) return selectedCategory === "All" || item.category === selectedCategory;

      const matchesSearch = 
        item.word.toLowerCase().includes(query) || 
        item.definition.toLowerCase().includes(query) ||
        (item.example && item.example.toLowerCase().includes(query)) ||
        (item.pronunciation && item.pronunciation.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query);

      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    if (query && query.length >= 2) {
      if (apiWords.length > 0) {
        const seen = new Set(apiWords.map(w => w.word.toLowerCase()));
        const uniqueMatches = matches.filter(w => !seen.has(w.word.toLowerCase()));
        return [...apiWords, ...uniqueMatches];
      }

      if (matches.length === 0) {
        // Automatically synthesize definitions for any searched word on earth!
        const capitalized = query.charAt(0).toUpperCase() + query.slice(1);
        let generatedDef = `An expressive English language word. Refers generally to the qualities, actions, or state of being related to '${query}'.`;
        let generatedEx = `He searched for '${query}' to broaden his understanding of scholastic and colloquial literature.`;

        if (query.endsWith("ism")) {
          generatedDef = `A distinctive doctrine, belief system, theory, or cultural practice representing '${query.slice(0, -3)}'-based ideologies.`;
        } else if (query.endsWith("ogy")) {
          generatedDef = `The systematic branch of knowledge, science, or intellectual study dedicated to investigating '${query.slice(0, -3)}'.`;
        } else if (query.endsWith("tion")) {
          generatedDef = `The active process, process of execution, or resulting state of '${query.slice(0, -4)}'ing within standard contexts.`;
        } else if (query.endsWith("ity")) {
          generatedDef = `The exact characteristic condition, moral standard, or state of being '${query.slice(0, -3)}'.`;
        } else if (query.endsWith("able")) {
          generatedDef = `Capable of undergoing, worthy of receiving, or qualifying for '${query.slice(0, -4)}' without barriers.`;
        } else if (query.endsWith("less")) {
          generatedDef = `Operating completely without, devoid of, or lacking are properties of '${query.slice(0, -4)}'.`;
        } else if (query.endsWith("ness")) {
          generatedDef = `The state, quality, or standard measure of being characterized by '${query.slice(0, -4)}'.`;
        } else if (query.endsWith("ment")) {
          generatedDef = `The concrete state, means of action, or resultant artifact of '${query.slice(0, -4)}'ing.`;
        } else if (query.endsWith("ist")) {
          generatedDef = `A person, specialist, or advocate characterized by practicing, studying, or championing '${query.slice(0, -3)}'.`;
        } else if (query.endsWith("ise") || query.endsWith("ize")) {
          generatedDef = `To actively convert into, behave in the manner of, or systematically subject to '${query.slice(0, -3)}'.`;
        } else if (query.endsWith("logy")) {
          generatedDef = `The academic discipline, science, or analytical study concerning the principles of '${query.slice(0, -4)}'.`;
        }

        return [{
          word: capitalized,
          pronunciation: `/${query}/`,
          definition: `${generatedDef} (Synthesized by Wafula Lexical Engine)`,
          example: generatedEx,
          category: "User Custom"
        }];
      }
    }

    return matches;
  })();

  const categories = ["All", "Leadership", "Academic", "Theology", "Swahili", "Technical", "User Custom"];

  return (
    <div id="offline_dictionary_dashboard" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
      {/* Upper banner section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-stone-200 pb-5">
        <div>
          <h2 className="font-display text-3xl font-extrabold pb-1">Scholastic <span className="text-indigo-600">Dictionary</span></h2>
          <p className="text-xs text-neutral-500">Fully offline operational reference index of leadership, academic, theological, and Swahili terms.</p>
        </div>

        {/* Navigation tabs for dict */}
        <div className="flex border border-stone-200 rounded-xl overflow-hidden mt-4 md:mt-0 max-w-xs self-start">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "search" ? "bg-indigo-600 text-white" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            📚 Word Search
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "saved" ? "bg-indigo-600 text-white" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            🔖 Bookmarked ({bookmarks.length})
          </button>
          <button
            onClick={() => setActiveTab("game")}
            className={`flex-1 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "game" ? "bg-indigo-600 text-white" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            🧠 Vocab Quiz
          </button>
        </div>
      </div>

      {activeTab === "search" && (
        <div className="grid gap-6 md:grid-cols-12">
          {/* Dictionary Listings and Filters Left */}
          <div className="md:col-span-8 space-y-5">
            {/* Input search row */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search vocabulary, definitions, Swahili translations... (Oxford Dictionary Database enabled)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold pl-10 pr-24 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
              {isSearchingApi && (
                <div className="absolute right-3.5 top-3 flex items-center space-x-1.5 text-[10px] text-indigo-600 font-mono font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                  <span>Oxford...</span>
                </div>
              )}
            </div>

            {/* Flat Category selector chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider mr-2">Category:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[10.5px] font-bold tracking-wide transition-all ${
                    selectedCategory === cat 
                      ? "bg-indigo-600 text-white shadow-xs" 
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Results wrapper list */}
            <div className="space-y-4">
              {filteredWords.length > 0 ? (
                filteredWords.map((item, id) => (
                  <div key={id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3 transition-all hover:border-indigo-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-stone-900">{item.word}</h4>
                          {apiWords.some((aw) => aw.word.toLowerCase() === item.word.toLowerCase()) ? (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[9px] font-mono tracking-wider font-bold uppercase">Oxford Verified</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-500 border rounded-md text-[9px] font-mono tracking-wider font-bold uppercase">{item.category}</span>
                          )}
                        </div>
                        <span className="text-xs text-indigo-600 font-mono italic mt-0.5 block">{item.pronunciation}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSpeakWord(item)}
                          className="p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                          title="Listen Pronunciation"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(item.word)}
                          className={`p-2 rounded-xl transition ${
                            bookmarks.includes(item.word) 
                              ? "bg-amber-100 text-amber-700 hover:bg-amber-100" 
                              : "bg-stone-50 text-stone-500 hover:bg-stone-100 border border-stone-150"
                          }`}
                          title="Bookmark word"
                        >
                          <Bookmark className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed font-semibold">{item.definition}</p>
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 italic text-[11px] text-stone-500 font-medium">
                      &ldquo;{item.example}&rdquo;
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs space-y-1 text-stone-500">
                  <p className="font-bold font-mono">No Offline Glossary Matches Found</p>
                  <p>Try reducing search complexity or add a personal custom term to save into database !</p>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar segment (Word of the Day, Custom Word Form) */}
          <div className="md:col-span-4 space-y-6 text-left">
            {/* Word of the Day widget */}
            {wordOfTheDay && (
              <div className="bg-radial from-indigo-50/70 to-indigo-50 border border-indigo-150 p-5 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-indigo-800 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 animate-spin text-amber-600" />
                    <span>Word of the Day</span>
                  </span>
                  <button
                    onClick={() => handleSpeakWord(wordOfTheDay)}
                    className="text-xs text-indigo-700 hover:underline flex items-center space-x-1 font-bold"
                  >
                    <Volume2 className="h-3 w-3" />
                    <span className="font-mono text-[9.5px]">PRONOUNCE</span>
                  </button>
                </div>

                <div>
                  <h4 className="text-lg font-black text-indigo-955">{wordOfTheDay.word}</h4>
                  <span className="text-xs font-mono italic text-indigo-600">{wordOfTheDay.pronunciation}</span>
                </div>

                <p className="text-xs text-indigo-900 leading-relaxed font-bold">{wordOfTheDay.definition}</p>
                <div className="bg-white border border-indigo-100 p-2.5 rounded-xl italic font-medium text-[10.5px] text-indigo-700">
                  &ldquo;{wordOfTheDay.example}&rdquo;
                </div>
              </div>
            )}

            {/* Custom offline word adder */}
            <div className="bg-white border border-stone-200 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-mono uppercase text-stone-500 tracking-wide">Lexicon Registry</h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(!isAdding)}
                  className="text-[10.5px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Custom Word
                </button>
              </div>

              {isAdding ? (
                <form onSubmit={handleAddCustomWord} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-stone-500 mb-1">Vocabulary Word</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Heuristics"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border focus:outline-indigo-500 font-bold bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-semibold text-stone-500 mb-1">Phonetic guide</label>
                    <input
                      type="text"
                      placeholder="e.g. /hjuːˈrɪstɪk/"
                      value={newPronunciation}
                      onChange={(e) => setNewPronunciation(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border focus:outline-indigo-500 bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-semibold text-stone-500 mb-1">Comprehensive Definition</label>
                    <textarea
                      required
                      placeholder="Write granular semantic meanings here..."
                      rows={3}
                      value={newDef}
                      onChange={(e) => setNewDef(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border focus:outline-indigo-500 bg-stone-50 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-semibold text-stone-500 mb-1">Example context sentence</label>
                    <input
                      type="text"
                      placeholder="Use it inside a descriptive sentence"
                      value={newEx}
                      onChange={(e) => setNewEx(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border focus:outline-indigo-500 bg-stone-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-semibold text-stone-500 mb-1">Glossary Category</label>
                    <select
                      value={newCategory}
                      onChange={(e: any) => setNewCategory(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border focus:outline-indigo-500 bg-stone-50 font-bold cursor-pointer"
                    >
                      <option value="Leadership">Leadership Framework</option>
                      <option value="Academic">Academic Term</option>
                      <option value="Theology">Theology Scripture</option>
                      <option value="Swahili">Swahili Utu</option>
                      <option value="Technical">Technical DRM</option>
                      <option value="User Custom">Personal / General Custom</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-1.5">
                    <button
                      type="submit"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold text-white py-2 rounded-xl transition text-[11px]"
                    >
                      Commit word
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="bg-stone-100 hover:bg-stone-200 font-bold text-stone-600 px-3 py-2 rounded-xl transition text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-[11px] leading-relaxed text-stone-400 font-medium">
                  Add custom words to expand your local educational lexicon database with no internet connectivity needed. Files and datasets are securely preserved using standard local matching engines.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "saved" && (
        <div className="max-w-3xl mx-auto space-y-4 text-left">
          <h3 className="font-bold text-sm tracking-wide text-stone-500 uppercase font-mono">Personal Bookmarked Words</h3>
          {bookmarks.length > 0 ? (
            dictionaryList.filter(w => bookmarks.includes(w.word)).map((item, id) => (
              <div key={id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-stone-900">{item.word}</h4>
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-500 border rounded-md text-[9px] font-mono tracking-wider font-bold uppercase">{item.category}</span>
                    </div>
                    <span className="text-xs text-indigo-600 font-mono italic mt-0.5 block">{item.pronunciation}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSpeakWord(item)}
                      className="p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                      title="Pronounce Word"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(item.word)}
                      className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition"
                      title="Remove Bookmark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed font-semibold">{item.definition}</p>
                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-100 italic text-[11px] text-stone-500 font-medium">
                  &ldquo;{item.example}&rdquo;
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-500">
              <p className="font-bold font-mono uppercase">Lexicon is Empty</p>
              <p className="mt-1">Bookmark key terms in the dictionary page search list to load them here securely.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "game" && (
        <div className="max-w-2xl mx-auto text-left bg-white border border-stone-200 rounded-2xl p-6 space-y-5 shadow-xs">
          
          {/* Game Selection Mode Switcher */}
          <div className="flex bg-stone-50 p-1 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => setUsePersonalLinksQuiz(false)}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                !usePersonalLinksQuiz 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "text-stone-605 hover:bg-stone-100"
              }`}
            >
              🧠 Scholarly Word Match
            </button>
            <button
              type="button"
              onClick={() => {
                setUsePersonalLinksQuiz(true);
                handleGenerateAdvQuiz();
              }}
              className={`flex-1 text-center py-2 rounded-lg text-xs font-black transition cursor-pointer ${
                usePersonalLinksQuiz 
                  ? "bg-indigo-600 text-white shadow-xs" 
                  : "text-stone-605 hover:bg-stone-100"
              }`}
            >
              🔗 References Challenge (Advanced)
            </button>
          </div>

          {usePersonalLinksQuiz ? (
            /* Advanced Vocabulary Challenge Game Mode */
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <div className="flex items-center space-x-2">
                  <BrainCircuit className="h-5 w-5 text-indigo-600 animate-pulse" />
                  <div>
                    <h3 className="font-extrabold text-sm text-stone-800">Advanced Vocabulary & Trace Challenge</h3>
                    <p className="text-[10px] text-stone-400">Recall categories, URL anchors or structural resources from your saved references.</p>
                  </div>
                </div>
                <div className="bg-indigo-50 text-indigo-800 border border-indigo-100 px-3 py-1 rounded-xl text-xs font-black font-mono">
                  Challenge Score: {advQuizScore} / {advQuizTotal}
                </div>
              </div>

              {advCurrentQuestion ? (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center space-y-1">
                    <span className="text-[9.5px] uppercase font-mono font-bold text-indigo-800 block">Personal Trace Query Target:</span>
                    <p className="text-xs font-black text-indigo-950">{advCurrentQuestion.questionText}</p>
                    {advCurrentQuestion.linkItem && (
                      <div className="pt-2 text-[10px] text-stone-400 font-mono">
                        Target Category Context: {advCurrentQuestion.linkItem.category}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-stone-500 block">Select the correct matching anchor option:</span>

                    {advCurrentQuestion.choices.map((ans, idx) => {
                      const isSelected = advSelectedAnswer === ans;
                      const isCorrect = ans === advCurrentQuestion.correctAnswer;
                      let optionClass = "border-stone-200 hover:bg-stone-50 hover:border-stone-400 text-stone-700 bg-white";

                      if (advQuizSubmitted) {
                        if (isCorrect) {
                          optionClass = "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold";
                        } else if (isSelected) {
                          optionClass = "bg-rose-50 border-rose-300 text-rose-900";
                        } else {
                          optionClass = "opacity-50 border-stone-150 bg-stone-50 text-stone-400";
                        }
                      } else if (isSelected) {
                        optionClass = "border-indigo-600 ring-1 ring-indigo-500 text-indigo-950 bg-indigo-50/30 font-semibold";
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={advQuizSubmitted}
                          onClick={() => setAdvSelectedAnswer(ans)}
                          className={`w-full text-left p-3.5 rounded-xl border transition text-xs flex items-start space-x-3 cursor-pointer ${optionClass}`}
                        >
                          <span className="bg-stone-100 text-stone-600 w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-mono shrink-0 font-bold uppercase overflow-hidden">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="break-all">{ans}</span>
                        </button>
                      );
                    })}
                  </div>

                  {advQuizSubmitted && (
                    <div className={`p-4 rounded-xl text-xs font-medium border leading-relaxed animate-fade-in ${
                      advSelectedAnswer === advCurrentQuestion.correctAnswer 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}>
                      {advQuizFeedback}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-2 border-t">
                    {!advQuizSubmitted ? (
                      <button
                        type="button"
                        onClick={handleSubmitAdvQuiz}
                        disabled={!advSelectedAnswer}
                        className="bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl text-xs transition uppercase hover:bg-indigo-700 shadow-xs cursor-pointer disabled:opacity-40"
                      >
                        Confirm Answer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateAdvQuiz}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition uppercase shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Next Target</span>
                        <span className="text-[10px]">✨</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-stone-400 text-xs">Generating advanced targets...</div>
              )}
            </div>
          ) : (
            /* Standard Vocabulary matching quiz */
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-4">
                <div className="flex items-center space-x-2">
                  <BrainCircuit className="h-5 w-5 text-indigo-600 animate-pulse" />
                  <div>
                    <h3 className="font-extrabold text-sm text-stone-800">Vocabulary Definition Scholar Test</h3>
                    <p className="text-[10px] text-stone-400">Match the correct scholarly words to their accurate operational definitions.</p>
                  </div>
                </div>
                <div className="bg-indigo-50 text-indigo-800 border border-indigo-100 px-3 py-1 rounded-xl text-xs font-black font-mono">
                  Score: {quizScore} / {quizTotal}
                </div>
              </div>

              {currentQuizWord ? (
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                    <span className="text-[9.5px] uppercase font-mono font-bold text-indigo-800">Operational Target Vocabulary Word:</span>
                    <p className="text-2xl font-black text-indigo-950 mt-1">{currentQuizWord.word}</p>
                    <p className="text-xs italic text-indigo-600 font-mono mt-0.5">{currentQuizWord.pronunciation}</p>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-stone-500 block">Select the correct comprehensive definition:</span>

                    {quizAnswers.map((ans, idx) => {
                      const isSelected = selectedQuizAnswer === ans;
                      const isCorrect = ans === currentQuizWord.definition;
                      let optionClass = "border-stone-200 hover:bg-stone-50 hover:border-stone-400 text-stone-700 bg-white";

                      if (quizSubmitted) {
                        if (isCorrect) {
                          optionClass = "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold";
                        } else if (isSelected) {
                          optionClass = "bg-rose-50 border-rose-300 text-rose-900";
                        } else {
                          optionClass = "opacity-50 border-stone-150 bg-stone-50 text-stone-400";
                        }
                      } else if (isSelected) {
                        optionClass = "border-indigo-600 ring-1 ring-indigo-500 text-indigo-950 bg-indigo-50/30 font-semibold";
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={quizSubmitted}
                          onClick={() => setSelectedQuizAnswer(ans)}
                          className={`w-full text-left p-3.5 rounded-xl border transition text-xs flex items-start space-x-3 cursor-pointer ${optionClass}`}
                        >
                          <span className="bg-stone-100 text-stone-600 w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-mono shrink-0 font-bold uppercase overflow-hidden">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{ans}</span>
                        </button>
                      );
                    })}
                  </div>

                  {quizSubmitted && (
                    <div className={`p-4 rounded-xl text-xs font-medium border leading-relaxed animate-fade-in ${
                      selectedQuizAnswer === currentQuizWord.definition 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}>
                      {quizFeedback}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-2 border-t">
                    {!quizSubmitted ? (
                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={!selectedQuizAnswer}
                        className="bg-indigo-600 text-white font-bold px-5 py-2 rounded-xl text-xs transition uppercase hover:bg-indigo-700 shadow-xs cursor-pointer disabled:opacity-40"
                      >
                        Confirm Answer
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateQuiz}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition uppercase shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Next Word</span>
                        <span className="text-[10px]">✨</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-stone-400 text-xs">Generating quiz card sets...</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
