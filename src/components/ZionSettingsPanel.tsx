import React, { useState } from "react";
import {
  User as UserIcon, Bell, Shield, CreditCard, Eye, Globe, Download, Trash2, CheckCircle2, Save, X
} from "lucide-react";
import { User } from "../types";

interface ZionSettingsPanelProps {
  currentUser: User | null;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function ZionSettingsPanel({ currentUser, onClose, isDarkMode, onToggleDarkMode }: ZionSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"account" | "notifications" | "security" | "payments" | "accessibility">("account");
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState(currentUser?.name || "Kelvin Opara Wafula");
  const [email, setEmail] = useState(currentUser?.email || "wafulak435@gmail.com");
  const [phone, setPhone] = useState("+254 712 345 678");
  const [timeZone, setTimeZone] = useState("Africa/Nairobi (EAT)");
  const [language, setLanguage] = useState("English (US / Swahili)");

  // Notification toggles
  const [notifApp, setNotifApp] = useState(true);
  const [notifDeadlines, setNotifDeadlines] = useState(true);
  const [notifClasses, setNotifClasses] = useState(true);
  const [notifEvents, setNotifEvents] = useState(true);
  const [notifBooks, setNotifBooks] = useState(false);
  const [notifOrders, setNotifOrders] = useState(true);

  // Security toggles
  const [twoFactor, setTwoFactor] = useState(true);
  const [offlineCache, setOfflineCache] = useState(true);

  // Accessibility toggles
  const [highContrast, setHighContrast] = useState(false);
  const [largerText, setLargerText] = useState(false);

  const handleSave = () => {
    setSavedNotice("Settings successfully updated and synchronized across all campus nodes.");
    setTimeout(() => setSavedNotice(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-stone-400">Campus &amp; Ministry Control Center</span>
            <h2 className="font-display text-xl font-bold uppercase">Universal Settings &amp; Preferences</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notice */}
        {savedNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 p-3 text-xs font-bold flex items-center gap-2 px-6">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 bg-stone-50 dark:bg-stone-950 p-4 border-r border-stone-200 dark:border-stone-800 space-y-1.5 shrink-0 overflow-y-auto">
            {[
              { id: "account", label: "Account Settings", icon: UserIcon },
              { id: "notifications", label: "Notification Settings", icon: Bell },
              { id: "security", label: "Privacy & Security", icon: Shield },
              { id: "payments", label: "Payment & Billing", icon: CreditCard },
              { id: "accessibility", label: "Accessibility & Low-Bandwidth", icon: Eye }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-left ${
                    active ? "bg-red-700 text-white shadow-xs" : "text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Content Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {activeTab === "account" && (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider border-b pb-2">Account Profile Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-3 py-2 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-3 py-2 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-3 py-2 text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">Time Zone</label>
                    <select
                      value={timeZone}
                      onChange={(e) => setTimeZone(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-3 py-2 text-xs font-medium"
                    >
                      <option>Africa/Nairobi (EAT)</option>
                      <option>UTC / GMT</option>
                      <option>America/New_York (EST)</option>
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase">Preferred Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-3 py-2 text-xs font-medium"
                    >
                      <option>English (US / Swahili)</option>
                      <option>Swahili (East Africa)</option>
                      <option>French</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider border-b pb-2">Notification Preferences (Push &amp; Email)</h3>
                <div className="space-y-3">
                  {[
                    { label: "Application status updates and admissions decisions", state: notifApp, setter: setNotifApp },
                    { label: "Admission deadlines and term reminders", state: notifDeadlines, setter: setNotifDeadlines },
                    { label: "Class announcements and Google Meet schedules", state: notifClasses, setter: setNotifClasses },
                    { label: "Evangelism outreach and conference event reminders", state: notifEvents, setter: setNotifEvents },
                    { label: "New book arrivals and bookstore promotions", state: notifBooks, setter: setNotifBooks },
                    { label: "Order fulfillment and digital download updates", state: notifOrders, setter: setNotifOrders },
                  ].map((item, idx) => (
                    <label key={idx} className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 cursor-pointer hover:bg-stone-100 transition">
                      <span className="text-xs font-medium">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={item.state}
                        onChange={(e) => item.setter(e.target.checked)}
                        className="h-4 w-4 rounded text-red-700 accent-red-700 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider border-b pb-2">Privacy &amp; Security Controls</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
                    <div>
                      <h5 className="font-bold text-xs uppercase">Two-Factor Authentication (2FA)</h5>
                      <p className="text-[11px] text-stone-500">Require an SMS or authenticator code during login.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={twoFactor}
                      onChange={(e) => setTwoFactor(e.target.checked)}
                      className="h-4 w-4 rounded text-red-700 accent-red-700 cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 space-y-3">
                    <h5 className="font-bold text-xs uppercase">Data Export &amp; Vault</h5>
                    <p className="text-[11px] text-stone-500">Download a complete copy of your academic records, certificates, and prayer logs in JSON or CSV format.</p>
                    <button type="button" onClick={() => alert("Preparing secure academic data export archive...")} className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 flex items-center gap-1.5 cursor-pointer">
                      <Download className="h-3.5 w-3.5" />
                      <span>Export Account Data</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "payments" && (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider border-b pb-2">Payment Methods &amp; Billing History</h3>
                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 space-y-3">
                  <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase">Connected Gateway</span>
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs uppercase">Safaricom M-Pesa Express</h5>
                      <p className="text-[11px] text-stone-500">+254 712 *** 678 (Default billing phone)</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">Active</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "accessibility" && (
              <div className="space-y-4">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider border-b pb-2">Accessibility &amp; Low-Bandwidth Support</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
                    <div>
                      <h5 className="font-bold text-xs uppercase">Dark Mode Theme</h5>
                      <p className="text-[11px] text-stone-500">Switch between light academic mode and dark immersive mode.</p>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleDarkMode}
                      className="px-3 py-1 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 cursor-pointer"
                    >
                      {isDarkMode ? "Disable Dark Mode" : "Enable Dark Mode"}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
                    <div>
                      <h5 className="font-bold text-xs uppercase">Offline Devotional Cache</h5>
                      <p className="text-[11px] text-stone-500">Download daily devotionals and study texts for offline reading during low-bandwidth connections.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={offlineCache}
                      onChange={(e) => setOfflineCache(e.target.checked)}
                      className="h-4 w-4 rounded text-red-700 accent-red-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer Action */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition active:scale-95"
              >
                <Save className="h-4 w-4" />
                <span>Save All Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
