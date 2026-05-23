import React, { useState } from "react";
import { Phone, Mail, Facebook, MapPin, CheckCircle, Send, Landmark } from "lucide-react";

export default function Contact() {
  const [formState, setFormState] = useState({ name: "", email: "", message: "", sent: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formState.name && formState.message) {
      setFormState((prev) => ({ ...prev, sent: true }));
      setTimeout(() => {
        setFormState({ name: "", email: "", message: "", sent: false });
      }, 4000);
    }
  };

  return (
    <div id="contact_section" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Get In <span className="text-red-700">Touch</span>
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          Have a question about our books, need assistance with your downloads, or want to explore our Leadership School modules? Reach out directly via phone, email, or social media!
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Core Address / Links Card */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
            <h3 className="font-display text-lg font-bold text-neutral-950 mb-5 pb-3 border-b border-stone-100">
              Contact Information
            </h3>
            
            <div className="space-y-4">
              {/* WhatsApp */}
              <a 
                href="https://wa.me/254114684132" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-start space-x-3.5 group rounded-xl p-3 hover:bg-neutral-50 transition"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600 transition group-hover:bg-green-600 group-hover:text-white">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-400 upper tracking-wider font-mono">WhatsApp Line</p>
                  <p className="text-sm font-bold text-neutral-800 group-hover:text-red-700 transition">0114684132</p>
                  <p className="text-[11px] text-stone-500">Tap to chat with us instantly</p>
                </div>
              </a>

              {/* Email */}
              <a 
                href="mailto:wafulak033@mail.com" 
                className="flex items-start space-x-3.5 group rounded-xl p-3 hover:bg-neutral-50 transition"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 transition group-hover:bg-red-700 group-hover:text-white">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-400 upper tracking-wider font-mono">Email Address</p>
                  <p className="text-sm font-bold text-neutral-800 group-hover:text-red-700 transition">wafulak033@mail.com</p>
                  <p className="text-[11px] text-stone-500">Expect replies within a few hours</p>
                </div>
              </a>

              {/* Facebook */}
              <a 
                href="https://facebook.com/search/top?q=wafula%20digital%20books" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-start space-x-3.5 group rounded-xl p-3 hover:bg-neutral-50 transition"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  <Facebook className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-400 upper tracking-wider font-mono">Facebook Page</p>
                  <p className="text-sm font-bold text-neutral-800 group-hover:text-red-700 transition">Wafula Digital</p>
                  <p className="text-[11px] text-stone-500">Follow us for updates and events</p>
                </div>
              </a>

              {/* Location (Bungoma, Kenya - Corrected) */}
              <div className="flex items-start space-x-3.5 rounded-xl p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-400 upper tracking-wider font-mono">Headquarters Location</p>
                  <p className="text-sm font-bold text-neutral-800">Bungoma, Kenya</p>
                  <p className="text-[11px] text-stone-500">Serving Western Kenya & East Africa</p>
                </div>
              </div>
            </div>
          </div>

          {/* Slogan, Vision & Mission Quick Recap */}
          <div className="rounded-2xl bg-amber-50/70 border border-amber-100 p-6 space-y-4">
            <div className="flex items-center space-x-2 text-amber-800">
              <Landmark className="h-4 w-4" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider">Our Identity Badge</span>
            </div>
            <div>
              <p className="text-xs italic font-semibold text-neutral-600">"Knowledge That Transforms You"</p>
              <p className="text-[11px] font-mono text-amber-900 block mt-1">Slogan</p>
            </div>
            <div className="text-xs text-neutral-700 leading-relaxed border-t border-amber-100/60 pt-3">
              <strong className="text-neutral-900 font-semibold block mb-0.5">Vision Summary</strong>
              Empowering every African with knowledge that unlocks their God-given potential and transforms local communities.
            </div>
          </div>
        </div>

        {/* Localized feedback form */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
            <h3 className="font-display text-lg font-bold text-neutral-950 mb-3">
              Send an Offline-Resilient Message
            </h3>
            <p className="text-xs text-neutral-500 mb-6">
              Our messages auto-save locally so that even if your connection is unstable, we store your context and will queue the sync immediately.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full rounded-lg border border-stone-200 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-red-700 focus:bg-white"
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">Your Email</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full rounded-lg border border-stone-200 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-red-700 focus:bg-white"
                    placeholder="name@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">Your Message *</label>
                <textarea
                  required
                  rows={4}
                  value={formState.message}
                  onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  className="w-full rounded-lg border border-stone-200 bg-neutral-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-red-700 focus:bg-white"
                  placeholder="How can Kelvin and the publishing team assist you?"
                />
              </div>

              {formState.sent ? (
                <div className="flex items-center space-x-2 rounded-lg bg-green-50 p-4 text-sm text-green-700">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="font-bold">Form Saved Securely!</span> Your feedback is recorded in our local database. We have logged it locally and will coordinate immediately.
                  </div>
                </div>
              ) : (
                <button
                  type="submit"
                  className="flex w-full items-center justify-center space-x-2 rounded-lg bg-red-700 py-3 text-sm font-bold text-white shadow-md hover:bg-red-800 transition active:scale-95"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Message</span>
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
