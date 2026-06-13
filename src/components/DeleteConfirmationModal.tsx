import React, { useState, useEffect } from "react";
import { Trash2, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemType: "book" | "document" | string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title,
  itemName,
  itemType,
  onConfirm,
  onCancel,
  confirmText = "Permanently Delete",
  cancelText = "Cancel"
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const deleteKeyphrase = "DELETE";

  // Reset verification input when model opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTypedConfirmation("");
    }
  }, [isOpen]);

  const isConfirmedPhrase = typedConfirmation.trim().toUpperCase() === deleteKeyphrase;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Container Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className="relative w-full max-w-md bg-[#0F111D] border border-slate-800 text-slate-100 p-6 rounded-2xl shadow-2xl overflow-hidden z-10 select-text"
          >
            {/* Upper Accent Indicator Border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-600 to-amber-500" />

            {/* Exit/Close Top Corner Button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-900 transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Warning Header Visual */}
            <div className="flex items-start space-x-4">
              <div className="h-12 w-12 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="space-y-1 pr-6">
                <h3 className="text-base font-black tracking-tight text-white uppercase font-display">
                  {title}
                </h3>
                <p className="text-[10px] text-red-500 font-mono tracking-widest uppercase font-bold">
                  Irreversible System Action
                </p>
              </div>
            </div>

            {/* Context Message */}
            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Are you absolutely sure you want to delete this {itemType}? This will erase all remote databases and local cache synchronization stores of this resource.
              </p>

              {/* Boxed Target Specification Indicator */}
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                <span className="text-[9px] uppercase font-mono text-slate-500 font-bold tracking-wider block">
                  Target {itemType === "book" ? "Ebook Publication" : "Workspace Document"}
                </span>
                <p className="text-xs font-black text-white truncate font-display">
                  {itemName || "Untitled Document"}
                </p>
              </div>

              {/* Keyphrase Interactive Verification Action */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                  Type <span className="text-red-500 font-black">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  placeholder={`Type '${deleteKeyphrase}' to unlock`}
                  className="w-full bg-[#141724] border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-red-500 placeholder-slate-600 transition"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Action Dialog Buttons Footer */}
            <div className="mt-6 flex items-center space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-850 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer text-center"
              >
                {cancelText}
              </button>
              <button
                type="button"
                disabled={!isConfirmedPhrase}
                onClick={() => {
                  if (isConfirmedPhrase) {
                    onConfirm();
                  }
                }}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-150 ${
                  isConfirmedPhrase
                    ? "bg-gradient-to-r from-red-650 to-rose-700 text-white hover:brightness-110 shadow-lg shadow-red-950/40 cursor-pointer"
                    : "bg-slate-850 text-slate-600 border border-slate-800 cursor-not-allowed"
                }`}
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
