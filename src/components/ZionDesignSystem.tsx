import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export interface ZionButtonProps {
  variant?: "primary" | "secondary" | "outline" | "danger";
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
}

export function ZionButton({
  children,
  variant = "primary",
  isLoading = false,
  className = "",
  disabled,
  onClick,
  type = "button",
}: ZionButtonProps) {
  let variantStyles = "bg-red-700 hover:bg-red-800 text-white shadow-xs";
  if (variant === "secondary") {
    variantStyles = "bg-[#0B254D] hover:bg-[#071936] text-white shadow-xs";
  } else if (variant === "outline") {
    variantStyles = "bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100";
  } else if (variant === "danger") {
    variantStyles = "bg-red-650 hover:bg-red-750 text-white shadow-xs";
  }

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 font-sans select-none ${variantStyles} ${className}`}
    >
      {isLoading ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export interface ZionInputProps {
  label?: string;
  helperText?: string;
  className?: string;
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: string;
  name?: string;
  required?: boolean;
}

export function ZionInput({ label, helperText, className = "", value, onChange, placeholder, type = "text", name, required }: ZionInputProps) {
  return (
    <div className="space-y-1 w-full text-left">
      {label && (
        <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white outline-none focus:border-red-700 focus:bg-white transition shadow-xs ${className}`}
      />
      {helperText && <span className="text-[10px] text-stone-400 block">{helperText}</span>}
    </div>
  );
}

export interface ZionCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function ZionCard({ children, className = "", title, subtitle }: ZionCardProps) {
  return (
    <div className={`bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4 text-left ${className}`}>
      {(title || subtitle) && (
        <div className="border-b border-stone-150 dark:border-stone-800 pb-3">
          {title && <h4 className="font-display font-bold text-base text-stone-900 dark:text-white uppercase">{title}</h4>}
          {subtitle && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export interface ZionAlertProps {
  variant?: "success" | "warning" | "error" | "info";
  title?: string;
  children: React.ReactNode;
}

export function ZionAlert({ variant = "info", title, children }: ZionAlertProps) {
  let styles = "bg-blue-50 border-blue-200 text-blue-900";
  let Icon = Info;
  let iconColor = "text-blue-600";

  if (variant === "success") {
    styles = "bg-emerald-50 border-emerald-200 text-emerald-900";
    Icon = CheckCircle2;
    iconColor = "text-emerald-600";
  } else if (variant === "warning") {
    styles = "bg-amber-50 border-amber-200 text-amber-900";
    Icon = AlertTriangle;
    iconColor = "text-amber-600";
  } else if (variant === "error") {
    styles = "bg-red-50 border-red-200 text-red-900";
    Icon = XCircle;
    iconColor = "text-red-600";
  }

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs ${styles}`}>
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
      <div className="space-y-0.5 text-xs">
        {title && <h5 className="font-bold uppercase tracking-wide">{title}</h5>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}

export interface ZionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ZionModal({ isOpen, onClose, title, children }: ZionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in duration-200">
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <h3 className="font-display font-bold text-base uppercase text-stone-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[75vh] text-left">{children}</div>
      </div>
    </div>
  );
}
