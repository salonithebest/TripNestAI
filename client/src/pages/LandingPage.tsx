import { motion } from "framer-motion";
import { ArrowRight, Backpack, CheckCircle2, Gauge, Plane, Sparkles, Ticket } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { primaryButtonClass, secondaryButtonClass } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { fadeUp, scaleIn, stagger } from "../lib/motion";

const features = [
  {
    icon: Ticket,
    title: "Ticket to timeline",
    text: "Keep your journey details together and review every leg at a glance.",
  },
  {
    icon: Backpack,
    title: "Smart packing",
    text: "A checklist tailored to your destination, travel dates and trip purpose.",
  },
  {
    icon: Gauge,
    title: "Trip readiness",
    text: "Bring your plans into one calm workspace and stay organized as you go.",
  },
];

function PreviewCard() {
  const legs = ["Train · Surat → New Delhi", "Cab · Station → Hotel", "Bus · Chandigarh → Manali"];

  return (
    <div className="relative mx-auto w-full max-w-md">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="glass rounded-3xl p-6 shadow-2xl shadow-brand-700/10"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Manali Winter Vacation</p>
        <p className="mt-1 text-sm text-ink-500">15 – 22 Dec 2026</p>
        <ul className="mt-5 space-y-3">
          {legs.map((text, index) => (
            <motion.li
              key={text}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.15 }}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
            >
              <CheckCircle2 size={18} className="shrink-0 text-brand-600" />
              <span className="text-sm font-medium text-ink-800">{text}</span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold text-ink-700">
            <span>Trip readiness</span>
            <span>72%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "72%" }}
              transition={{ duration: 1.2, delay: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-brand-600 to-sun-500"
            />
          </div>
        </div>
        <p className="mt-5 text-center text-[11px] text-ink-500">Illustrative preview, not real data</p>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="aurora min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <Plane size={22} /> TripNest AI
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-white/60">
            Log in
          </Link>
          <Link to="/register" className={primaryButtonClass}>
            Get started
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6">
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24"
        >
          <div>
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm"
            >
              <Sparkles size={14} className="text-sun-500" /> Your next adventure, better organized
            </motion.span>
            <motion.h1 variants={fadeUp} className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-ink-900 md:text-6xl">
              Every trip,{" "}
              <span className="bg-gradient-to-r from-brand-600 to-teal-400 bg-clip-text text-transparent">
                effortlessly
              </span>{" "}
              organized.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 max-w-lg text-lg leading-relaxed text-ink-500">
              Bring your travel plans and journey details together in one calm workspace.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className={`${primaryButtonClass} px-6 py-3`}>
                Start planning <ArrowRight size={16} />
              </Link>
              <Link to="/login" className={secondaryButtonClass}>
                I have an account
              </Link>
            </motion.div>
          </div>
          <motion.div variants={scaleIn}>
            <PreviewCard />
          </motion.div>
        </motion.section>
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="grid gap-5 pb-24 md:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, text }) => (
            <motion.div
              key={title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-white bg-white/80 p-6 shadow-sm backdrop-blur transition-shadow hover:shadow-xl"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon size={22} />
              </div>
              <h3 className="font-semibold text-ink-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{text}</p>
            </motion.div>
          ))}
        </motion.section>
      </main>
    </div>
  );
}
