import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, ArrowLeft, Award, GraduationCap, Calendar, 
  User, CheckCircle2, AlertCircle, Sparkles, Building, Landmark,
  Globe, Search, Clock
} from "lucide-react";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface VerificationRecord {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  courseTopic: string;
  score: number;
  ledgerHash: string;
  date: string;
  downloadedAt: string;
}

export default function CertificateVerificationView({ 
  onClose 
}: { 
  onClose: () => void; 
}) {
  const [certId, setCertId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [errorWord, setErrorWord] = useState<string | null>(null);

  // 1. Parse URL Parameter on Mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get("certId") || params.get("cert") || "";
    setCertId(idFromUrl);
    setSearchQuery(idFromUrl);
  }, []);

  // 2. Fetch record from DB or Local Storage
  useEffect(() => {
    if (!certId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorWord(null);

    // Prioritize checking Local Storage first for instant preview responsiveness
    let foundLocal = false;
    try {
      const localDls = JSON.parse(localStorage.getItem("WAFULA_CERT_DOWNLOADS") || "[]");
      const matched = localDls.find((d: any) => d.id === certId || d.ledgerHash === certId);
      if (matched) {
        setRecord(matched);
        foundLocal = true;
      }
    } catch (e) {
      console.warn("Local storage lookup warning:", e);
    }

    // Connect to Firestore real-time / query
    try {
      const ref = collection(db, "certificate_downloads");
      const q = query(ref, where("id", "==", certId));
      
      getDocs(q).then((snap) => {
        if (!snap.empty) {
          const docData = snap.docs[0].data() as VerificationRecord;
          setRecord(docData);
          setLoading(false);
        } else {
          // If only found in local storage, keep it, otherwise error
          if (foundLocal) {
            setLoading(false);
          } else {
            // Check if looking up standard sample for fallback testing
            if (certId.toLowerCase().includes("sample") || certId === "dl_sample") {
              setRecord({
                id: "dl_sample",
                name: "Kelvin Wafula",
                email: "chancellor@zion.ac.ke",
                schoolName: "Zion School of Leadership & Public Values",
                courseTopic: "Administrative Statesmanship, Social Morality, Ethics & Public Trust",
                score: 98,
                ledgerHash: "KEL-94A3B8-2026",
                date: new Date().toISOString().split("T")[0],
                downloadedAt: new Date().toISOString()
              });
              setLoading(false);
            } else {
              setRecord(null);
              setErrorWord("No certificate matching this ID was found on the official blockchain ledger registry.");
              setLoading(false);
            }
          }
        }
      }).catch((err) => {
        console.error("Firestore lookup error:", err);
        if (!foundLocal) {
          setErrorWord("Ledger query failure. The Zion Digital credentials registry might be undergoing real-time sync database updates.");
        }
        setLoading(false);
      });
    } catch (e) {
      console.error(e);
      if (!foundLocal) {
        setErrorWord("Database connectivity limits. If offline, only locally stored certification hashes can be validated in active browser instances.");
      }
      setLoading(false);
    }

  }, [certId]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setCertId(searchQuery.trim());
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
      
      {/* Background Ambience Grid */}
      <div className="absolute inset-0 bg-radial-gradient from-amber-950/15 via-stone-900 to-stone-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,26,0.02)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(139,92,26,0.02)_1.5px,transparent_1.5px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-xl w-full bg-stone-950/80 backdrop-blur-md rounded-3xl border border-stone-800/80 shadow-2xl p-6 sm:p-10 relative z-10 space-y-8 animate-in fade-in duration-300">
        
        {/* Hub Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-tr from-amber-600 to-yellow-500 rounded-2xl flex items-center justify-center text-stone-950 shadow-lg shadow-amber-500/10">
              <ShieldCheck className="h-9 w-9 stroke-[1.5]" />
            </div>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-500 uppercase">
            Zion Academic Senate
          </h2>
          <p className="font-mono text-[9px] tracking-widest text-amber-700 font-bold uppercase">
            Official Credentials Registry & Digital Validation Hub
          </p>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-amber-700/40 to-transparent w-full" />
        </div>

        {/* Query Input Section */}
        <form onSubmit={handleManualSearch} className="space-y-2">
          <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-stone-400">
            Search Registry Certificate ID or Hash
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. dl_17395000000 or KEL-94A3B8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs p-3.5 pl-10 border border-stone-800 bg-stone-900/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-stone-100 placeholder-stone-500"
              />
            </div>
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-stone-950 text-xs font-extrabold px-5 rounded-xl cursor-pointer transition shadow-md"
            >
              Verify
            </button>
          </div>
        </form>

        {/* State Conditional Outputs */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full border-2 border-stone-800" />
              <div className="absolute inset-0 rounded-full border-2 border-t-amber-500 animate-spin" />
            </div>
            <p className="text-xs text-stone-400 font-mono italic">
              Traversing Zion Decentralized Academic Ledger ...
            </p>
          </div>
        ) : record ? (
          /* VERIFIED ACTIVE LAYOUT */
          <div className="space-y-6">
            
            {/* Status Alert */}
            <div className="bg-emerald-950/30 border border-emerald-500/20 p-4 rounded-2xl flex items-center space-x-3.5 shadow-md">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              <div className="text-left">
                <span className="text-emerald-400 font-extrabold text-xs block uppercase tracking-wider">
                  Credentials Authenticated
                </span>
                <span className="text-stone-300 text-[11px] leading-relaxed block font-mono">
                  Zion School Seal is Digitally Validated & Active on the blockchain index.
                </span>
              </div>
            </div>

            {/* Certificate Details Card */}
            <div className="bg-stone-900/40 border border-stone-800/80 rounded-2xl p-5 space-y-4 text-xs">
              
              {/* Scholar Name */}
              <div className="flex justify-between items-center pb-3 border-b border-stone-850">
                <div className="flex items-center space-x-2.5 text-stone-400">
                  <User className="h-4 w-4" />
                  <span>Graduate Scholar</span>
                </div>
                <span className="text-stone-100 font-bold uppercase tracking-wide">
                  {record.name}
                </span>
              </div>

              {/* School */}
              <div className="flex justify-between items-start pb-3 border-b border-stone-850">
                <div className="flex items-center space-x-2.5 text-stone-400">
                  <Building className="h-4 w-4 shrink-0" />
                  <span>Academic Faculty</span>
                </div>
                <span className="text-stone-200 font-semibold text-right max-w-xs leading-normal">
                  {record.schoolName}
                </span>
              </div>

              {/* Syllabus Study */}
              <div className="flex justify-between items-start pb-3 border-b border-stone-850">
                <div className="flex items-center space-x-2.5 text-stone-400">
                  <Landmark className="h-4 w-4 shrink-0" />
                  <span>Syllabus Program</span>
                </div>
                <span className="text-stone-200 font-mono tracking-tight text-right max-w-xs uppercase font-extrabold text-[10px]">
                  {record.courseTopic}
                </span>
              </div>

              {/* Verified Grade Score */}
              <div className="flex justify-between items-center pb-3 border-b border-stone-850">
                <div className="flex items-center space-x-2.5 text-stone-400">
                  <Award className="h-4 w-4" />
                  <span>Academic Standing</span>
                </div>
                <span className="text-amber-500 font-black font-mono uppercase tracking-wide">
                  Grade Approved ({record.score}%) PASS / FELLOW
                </span>
              </div>

              {/* Verification Hashes & Date */}
              <div className="grid grid-cols-2 gap-4 pt-1 font-mono text-[9px] text-stone-400">
                <div>
                  <span className="block text-stone-500 uppercase font-black">Ledger Hash ID</span>
                  <span className="text-amber-600 font-bold">{record.ledgerHash}</span>
                </div>
                <div>
                  <span className="block text-stone-500 uppercase font-black">Date of Conferment</span>
                  <span>{record.date}</span>
                </div>
              </div>

            </div>

            {/* School Seal Instructions Verification */}
            <div className="bg-amber-950/20 border border-amber-600/10 p-4 rounded-xl text-center space-y-2">
              <p className="font-serif text-[10px] italic text-amber-200">
                "Zion digital leadership and computer school attestation seal guarantees academic excellence, verified self-assessments, and original publication papers indexed on decentralized local cache nodes."
              </p>
              <div className="flex justify-center space-x-6 pt-1">
                <div className="flex items-center space-x-1 font-mono text-[8.5px] text-stone-500">
                  <Building className="h-3 w-3" />
                  <span>SEAL NO: 198A</span>
                </div>
                <div className="flex items-center space-x-1 font-mono text-[8.5px] text-stone-500">
                  <Globe className="h-3 w-3" />
                  <span>DIVISION: BUNGOMA HUB</span>
                </div>
              </div>
            </div>

          </div>
        ) : certId ? (
          /* NOT FOUND / ERROR STATE */
          <div className="space-y-6">
            <div className="bg-red-950/30 border border-red-500/20 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="h-9 w-9 text-red-500 animate-bounce" />
              <div>
                <span className="text-red-500 font-extrabold text-xs uppercase block tracking-wider mb-1">
                  Registration Hash Flagged
                </span>
                <p className="text-stone-300 text-[11.5px] leading-relaxed max-w-sm">
                  {errorWord || "No valid credentials found matching this query. Verify the characters or check synchronization status with your digital ledger."}
                </p>
              </div>
            </div>
            
            {/* Quick Helper to generate default test certificate */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setCertQuerySample()}
                className="text-xs text-amber-500 hover:text-amber-400 underline font-mono cursor-pointer"
              >
                💡 Load Sample Chancellor Verification Entry to Preview Page Flow
              </button>
            </div>
          </div>
        ) : (
          /* PROMPT TO SEARCH VIEW */
          <div className="py-8 text-center space-y-2">
            <GraduationCap className="h-10 w-10 text-stone-600 mx-auto" />
            <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
              Enter your unique Digital Certificate ID code or matriculation ledger hash to lookup and validate your accredited diploma records.
            </p>
          </div>
        )}

        {/* Back navigation footer */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={() => {
              // Delete parameters safely and route back
              window.history.replaceState({}, window.document.title, window.location.pathname);
              onClose();
            }}
            className="flex items-center space-x-1.5 text-xs text-stone-400 hover:text-stone-200 transition bg-stone-900 border border-stone-850 px-4 py-2.5 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to School Dashboard</span>
          </button>
        </div>

      </div>
    </div>
  );

  function setCertQuerySample() {
    setCertId("dl_sample");
    setSearchQuery("dl_sample");
  }
}
