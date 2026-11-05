import { motion } from "framer-motion";
import { AlertCircle, Inbox } from "lucide-react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButtonClass = `${base} bg-gradient-to-r from-cyan-500 via-blue-600 to-violet-500 text-white shadow-md shadow-blue-900/20 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-lg`;
export const secondaryButtonClass = `${base} border border-slate-200 bg-white text-ink-800 shadow-sm hover:border-cyan-500 hover:text-cyan-800`;
export const dangerButtonClass = `${base} border border-red-200 bg-white text-red-700 hover:bg-red-50`;

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-slate-400 shadow-sm transition duration-200 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink-800">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-16 text-sm text-ink-500">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="h-8 w-8 rounded-full border-4 border-brand-100 border-t-brand-600"
      />
      {label}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/70 p-12 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Inbox size={26} />
      </div>
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}
