import React, { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

interface MediaRecorderTranscribeButtonProps {
  onTranscript: (text: string) => void;
  languageHint?: string;
}

/**
 * Browser-native speech dictation using Web Speech API (zero server/paid AI calls).
 */
export default function MediaRecorderTranscribeButton({
  onTranscript,
  languageHint = "en-US",
}: MediaRecorderTranscribeButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const recognitionRef = useRef<any>(null);

  const handleToggleRecord = () => {
    setErrorMsg("");
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsRecording(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMsg("Browser speech dictation is not supported here; please type your prompt.");
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = languageHint.toLowerCase().includes("sw") ? "sw-KE" : "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript;
        if (transcript) {
          onTranscript(transcript);
        }
      };

      rec.onerror = () => {
        setErrorMsg("Microphone dictation unavailable or permission denied.");
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch {
      setErrorMsg("Unable to start voice dictation.");
      setIsRecording(false);
    }
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={handleToggleRecord}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition cursor-pointer ${
          isRecording
            ? "bg-red-600 text-white border-red-600 animate-pulse"
            : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
        }`}
        title="Dictate speech using browser Web Speech API"
      >
        {isRecording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 text-[#155EEF]" />}
        <span>{isRecording ? "Stop Voice" : "Dictate"}</span>
      </button>

      {errorMsg && <span className="text-[10px] text-red-600 font-medium">{errorMsg}</span>}
    </div>
  );
}
