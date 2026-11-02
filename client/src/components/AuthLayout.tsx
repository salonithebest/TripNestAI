import { motion } from "framer-motion";
import { MapPin, Plane, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ease, fadeUp, stagger } from "../lib/motion";

const highlights = [
  { icon: MapPin, text: "One timeline for trains, flights, buses, cabs and stays" },
  { icon: Sparkles, text: "AI reads your train ticket and builds your packing list" },
  { icon: ShieldCheck, text: "You review every detail before anything is saved" },
];

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="aurora grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 8, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-sun-500/30 blur-3xl"
        />
        <Link to="/" className="relative flex items-center gap-2 text-lg font-semibold">
          <Plane size={22} className="text-sun-400" /> TripNest AI
        </Link>
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative space-y-8">
          <motion.h2 variants={fadeUp} className="text-4xl font-bold leading-tight">
            Every trip, effortlessly organized.
          </motion.h2>
          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <motion.li key={text} variants={fadeUp} className="flex items-start gap-3 text-slate-200">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon size={17} />
                </span>
                <span className="pt-1.5">{text}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
        <p className="relative text-sm text-slate-400">Learn · Build · Create</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="glass w-full max-w-md rounded-3xl p-8 shadow-xl shadow-ink-900/5"
        >
          <Link to="/" className="mb-6 flex items-center gap-2 font-semibold text-brand-700 lg:hidden">
            <Plane size={20} /> TripNest AI
          </Link>
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
