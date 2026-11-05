import { motion } from "framer-motion";
import { ArrowUpRight, MapPin, Plane, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ease, fadeUp, stagger } from "../lib/motion";

const highlights = [
  { icon: MapPin, text: "Keep train details, tickets and packing in one timeline" },
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
    <div className="min-h-screen bg-[#07132f] text-white lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section
        className="relative flex min-h-[38vh] flex-col justify-between overflow-hidden bg-cover bg-center px-6 py-6 sm:px-10 lg:min-h-screen lg:px-14 lg:py-10"
        style={{
          backgroundImage:
            "linear-gradient(180deg,rgba(6,16,48,.28),rgba(6,16,48,.18) 42%,rgba(6,16,48,.88)),url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=85)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-950/25 via-transparent to-cyan-950/30" />
        <Link to="/" className="relative flex w-fit items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-blue-950 shadow-lg shadow-cyan-500/25">
            <Plane size={21} />
          </span>
          <span>TripNest <span className="text-cyan-300">AI</span></span>
        </Link>

        <motion.div variants={stagger} initial="hidden" animate="show" className="relative my-12 max-w-xl lg:my-0">
          <motion.p variants={fadeUp} className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Plan · Explore · Travel smart
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">
            Your next adventure
            <span className="mt-2 block font-serif font-medium italic text-cyan-200">is just a click away.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 max-w-md text-base leading-7 text-blue-50/85">
            Bring every booking, journey leg and packing detail together in one place.
          </motion.p>
          <motion.ul variants={stagger} className="mt-8 grid gap-3 sm:grid-cols-2">
            {highlights.map(({ icon: Icon, text }) => (
              <motion.li
                key={text}
                variants={fadeUp}
                className="flex items-start gap-3 rounded-2xl border border-white/15 bg-slate-950/25 p-3 text-sm text-white/90 backdrop-blur-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200">
                  <Icon size={17} />
                </span>
                <span className="pt-1">{text}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <div className="relative flex items-center justify-between border-t border-white/20 pt-4 text-xs text-white/75">
          <span>Smart itineraries · Travel with confidence</span>
          <span className="hidden items-center gap-1 sm:flex">Discover somewhere new <ArrowUpRight size={14} /></span>
        </div>
      </section>

      <section className="relative flex min-h-[62vh] items-center justify-center overflow-hidden bg-[#f4f7fc] px-4 py-10 text-ink-900 sm:px-8 lg:min-h-screen lg:px-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="relative w-full max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_28px_90px_-40px_rgba(16,35,80,.42)] backdrop-blur-xl sm:p-9"
        >
          <Link to="/" className="mb-6 flex w-fit items-center gap-2 font-bold text-[#10234b] lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-blue-950">
              <Plane size={18} />
            </span>
            TripNest <span className="text-cyan-600">AI</span>
          </Link>
          <div className="mb-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-700">A better trip starts here</p>
            <h1 className="text-3xl font-bold tracking-tight text-[#10234b]">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
        </motion.div>
      </section>
    </div>
  );
}
