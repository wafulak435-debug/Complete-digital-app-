import React, { useState } from "react";
import {
  Palette, Type, Layout, Square, Layers, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Info,
  Search, Filter, Plus, Download, ChevronRight, BookOpen, GraduationCap, Users, Heart, Sparkles, RefreshCw
} from "lucide-react";
import { ZionButton, ZionInput, ZionCard, ZionAlert, ZionModal } from "./ZionDesignSystem";

interface ZionDesignSystemViewerProps {
  onClose?: () => void;
}

export default function ZionDesignSystemViewer({ onClose }: ZionDesignSystemViewerProps) {
  const [activeSection, setActiveSection] = useState<"colors" | "typography" | "components" | "states">("colors");
  const [formInputVal, setFormInputVal] = useState("");
  const [selectedTab, setSelectedTab] = useState("tab1");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <span className="text-[10px] tracking-wider font-mono font-bold text-stone-400 uppercase block">Universal Design Specification</span>
          <h1 className="font-display text-2xl font-black uppercase tracking-wide">Zion Digital Campus &amp; Ministry Design System Viewer</h1>
          <p className="text-xs text-stone-500 mt-1">Live demonstration of reusable components defined in ZionDesignSystem.tsx for institutional education and ministry outreach.</p>
        </div>
        {onClose && (
          <ZionButton variant="outline" onClick={onClose}>
            Close Viewer
          </ZionButton>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {[
          { id: "colors", label: "Color Palette & Tokens", icon: Palette },
          { id: "typography", label: "Typography & Hierarchy", icon: Type },
          { id: "components", label: "Components Library", icon: Layout },
          { id: "states", label: "States & Feedback", icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                active ? "bg-red-700 text-white shadow-xs" : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:bg-stone-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: COLORS */}
      {activeSection === "colors" && (
        <div className="space-y-6">
          <ZionCard title="1. Primary & Secondary Color Palette" subtitle="Deep navy blue communicates trust and education. Warm gold communicates spiritual significance.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#0B254D] text-white space-y-2 shadow-sm">
                <span className="text-[10px] font-mono font-bold uppercase opacity-80">Primary Brand</span>
                <p className="font-display font-bold text-sm">Deep Navy</p>
                <p className="text-[11px] font-mono opacity-90">#0B254D</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F5B82E] text-stone-950 space-y-2 shadow-sm">
                <span className="text-[10px] font-mono font-bold uppercase opacity-80">Secondary Accent</span>
                <p className="font-display font-bold text-sm">Warm Gold</p>
                <p className="text-[11px] font-mono opacity-90">#F5B82E</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FCFCF9] text-stone-900 border border-stone-200 space-y-2 shadow-sm">
                <span className="text-[10px] font-mono font-bold uppercase opacity-60">Surface Background</span>
                <p className="font-display font-bold text-sm">Soft White</p>
                <p className="text-[11px] font-mono opacity-80">#FCFCF9</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#111827] text-white space-y-2 shadow-sm">
                <span className="text-[10px] font-mono font-bold uppercase opacity-80">Primary Text</span>
                <p className="font-display font-bold text-sm">Dark Charcoal</p>
                <p className="text-[11px] font-mono opacity-90">#111827</p>
              </div>
            </div>
          </ZionCard>

          <ZionCard title="Functional & Spiritual Accent Tokens">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-700">Success Token</span>
                <p className="font-bold text-xs">Emerald Green (#059669)</p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-amber-700">Warning Token</span>
                <p className="font-bold text-xs">Warm Amber (#D97706)</p>
              </div>
              <div className="p-4 rounded-2xl bg-red-50 text-red-900 border border-red-200 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-red-700">Error Token</span>
                <p className="font-bold text-xs">Crimson Red (#DC2626)</p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 text-purple-900 border border-purple-200 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-purple-700">Spiritual Accent</span>
                <p className="font-bold text-xs">Soft Burgundy (#7C2D12)</p>
              </div>
            </div>
          </ZionCard>
        </div>
      )}

      {/* SECTION 2: TYPOGRAPHY */}
      {activeSection === "typography" && (
        <ZionCard title="2. Typography Hierarchy & Scale">
          <div className="space-y-6">
            <div className="space-y-2 border-b pb-4">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block">Heading 1 (Display)</span>
              <h1 className="font-display text-3xl font-black uppercase tracking-tight">Institutional Excellence &amp; Ministry Power</h1>
            </div>
            <div className="space-y-2 border-b pb-4">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block">Heading 2 (Section Title)</span>
              <h2 className="font-display text-xl font-bold uppercase tracking-wide">Bungoma Core Covenant Leadership</h2>
            </div>
            <div className="space-y-2 border-b pb-4">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block">Body Text</span>
              <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-sans font-normal">
                Leadership is not a title of dominion, but a solemn covenant. Leaders are trustees of community potential, accountable to high ethical standpoints and divine values.
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block">Mono / Labels &amp; Metadata</span>
              <p className="text-[11px] font-mono font-bold text-red-700 uppercase tracking-widest">
                ZIO-01 / REGISTRATION REF: 94A3B8-2026
              </p>
            </div>
          </div>
        </ZionCard>
      )}

      {/* SECTION 3: COMPONENTS & FORMS */}
      {activeSection === "components" && (
        <div className="space-y-6">
          <ZionCard title="3. Reusable ZionButton Variants">
            <div className="flex flex-wrap gap-3 pt-2">
              <ZionButton variant="primary">Primary Red Button</ZionButton>
              <ZionButton variant="secondary">Secondary Deep Navy</ZionButton>
              <ZionButton variant="outline">Outline Button</ZionButton>
              <ZionButton variant="danger">Danger Button</ZionButton>
              <ZionButton variant="primary" isLoading>Loading State</ZionButton>
            </div>
          </ZionCard>

          <ZionCard title="ZionInput &amp; ZionCard Components">
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <ZionInput
                label="Official Full Name"
                value={formInputVal}
                onChange={(e) => setFormInputVal(e.target.value)}
                placeholder="e.g. Kelvin Opara Wafula"
                helperText="Provide your legal name as shown on national ID."
              />
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wide">Select Program Track</label>
                <select className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none">
                  <option>Bungoma Core Covenant Leadership</option>
                  <option>Old Testament &amp; Hebrew Covenants</option>
                  <option>Digital Computing &amp; Full-Stack Engineering</option>
                </select>
                <span className="text-[10px] text-stone-400 block">Choose your desired academic department.</span>
              </div>
            </div>
          </ZionCard>

          <div className="grid gap-6 md:grid-cols-2">
            <ZionCard title="Visionary Leadership Diploma" subtitle="Duration: 4 Months">
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">Comprehensive training in ethical administration, strategic planning, and community development across East Africa.</p>
              <div className="pt-3">
                <ZionButton variant="secondary" onClick={() => setIsModalOpen(true)}>Open ZionModal Demo</ZionButton>
              </div>
            </ZionCard>

            <ZionCard title="Interactive Tab Component">
              <div className="flex gap-2 border-b pb-2">
                {["tab1", "tab2"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTab(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition ${selectedTab === t ? "bg-blue-600 text-white" : "bg-stone-100 text-stone-600"}`}
                  >
                    {t === "tab1" ? "Active Modules" : "Archived Sessions"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 pt-2">
                {selectedTab === "tab1" ? "Displaying active curriculum modules and live Google Meet sessions." : "Displaying historical seminar records and examination transcripts."}
              </p>
            </ZionCard>
          </div>
        </div>
      )}

      {/* SECTION 4: STATES & FEEDBACK */}
      {activeSection === "states" && (
        <div className="space-y-6">
          <ZionCard title="4. ZionAlert &amp; Feedback States">
            <div className="space-y-3">
              <ZionAlert variant="success" title="Success Alert">
                Your application has been successfully submitted and routed to the admissions registrar.
              </ZionAlert>
              <ZionAlert variant="warning" title="Warning Alert">
                Your exam session is active. Exiting the window will automatically submit your assessment.
              </ZionAlert>
              <ZionAlert variant="error" title="Error Alert">
                Network connection interrupted. Local offline cache fallback active.
              </ZionAlert>
            </div>
          </ZionCard>

          <div className="grid gap-6 md:grid-cols-2">
            <ZionCard title="Loading State">
              <div className="text-center py-6 space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-red-700 mx-auto" />
                <p className="text-xs text-stone-500">Compiling high-capacity academic records from Firestore and SQL nodes...</p>
              </div>
            </ZionCard>

            <ZionCard title="Empty State">
              <div className="text-center py-6 space-y-3">
                <BookOpen className="h-8 w-8 text-stone-300 mx-auto" />
                <p className="text-xs text-stone-500">No search records found in this view. Try adjusting your course filters.</p>
              </div>
            </ZionCard>
          </div>
        </div>
      )}

      {/* ZionModal Demonstration */}
      <ZionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Zion Modal Demonstration">
        <div className="space-y-4">
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            This modal is built with ZionDesignSystem.tsx using moderate border radius (12-16px), soft drop shadows, and backdrop blur.
          </p>
          <ZionAlert variant="success" title="Verified Session">
            All user interactions within this modal are secured by enterprise authentication tokens.
          </ZionAlert>
          <div className="flex justify-end pt-2">
            <ZionButton variant="primary" onClick={() => setIsModalOpen(false)}>Confirm Action</ZionButton>
          </div>
        </div>
      </ZionModal>
    </div>
  );
}
