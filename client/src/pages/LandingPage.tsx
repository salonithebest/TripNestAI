import { motion } from "framer-motion";
import { ArrowRight, Backpack, CheckCircle2, Compass, Gauge, Plane, Sparkles, Ticket } from "lucide-react";
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

export default function LandingPage() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen overflow-hidden bg-[#07132f] text-white">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3 text-xl font-bold tracking-tight">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-blue-500 text-[#081536] shadow-lg shadow-cyan-500/20">
            <Plane size={22} />
          </span>
          <span>TripNest <span className="text-cyan-300">AI</span></span>
        </Link>
        <p className="hidden text-sm font-medium text-blue-100/80 md:block">Plan <span className="px-2 text-cyan-300">·</span> Explore <span className="px-2 text-cyan-300">·</span> Travel smart</p>
        <nav className="flex items-center gap-2">
          <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white">
            Log in
          </Link>
          <Link to="/register" className={primaryButtonClass}>
            Get started <ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      <main>
        <section
          className="relative isolate min-h-[620px] overflow-hidden bg-cover bg-center sm:min-h-[680px]"
          style={{
            backgroundImage:
              "linear-gradient(90deg,rgba(5,15,46,.92) 0%,rgba(5,15,46,.76) 44%,rgba(5,15,46,.12) 100%),linear-gradient(0deg,#07132f 0%,transparent 42%),url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2200&q=88)",
          }}
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-blue-950/30 via-transparent to-cyan-400/10" />
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pb-32 lg:pt-20"
          >
            <div className="max-w-2xl">
              <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-cyan-100/25 bg-blue-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100 backdrop-blur">
                <Sparkles size={15} className="text-cyan-300" /> Your journey, made effortless
              </motion.span>
              <motion.h1 variants={fadeUp} className="mt-7 text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Make room for
                <span className="mt-2 block bg-gradient-to-r from-cyan-200 via-sky-300 to-violet-300 bg-clip-text text-transparent">
                  more adventures.
                </span>
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg leading-8 text-blue-50/85">
                Plan the details once. Travel lighter with your itinerary, documents, packing list and trip readiness together.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className={`${primaryButtonClass} px-6 py-3`}>
                  Start planning <ArrowRight size={17} />
                </Link>
                <Link to="/login" className={`${secondaryButtonClass} border-white/25 bg-white/10 text-white hover:border-cyan-200 hover:bg-white/15 hover:text-white`}>
                  I have an account
                </Link>
              </motion.div>
              <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-blue-50/80">
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-cyan-300" /> One clear itinerary</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-cyan-300" /> Less last-minute stress</span>
              </motion.div>
            </div>
            <motion.div variants={scaleIn} className="relative hidden lg:block">
              <div className="absolute -inset-8 rounded-[2.5rem] bg-cyan-300/10 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/20 bg-[#091a43]/80 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-blue-950"><Plane size={18} /></div>
                  <div><p className="text-sm font-bold">Your next trip</p><p className="text-xs text-blue-100/65">A little more organized</p></div>
                  <span className="ml-auto rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-semibold text-emerald-200">Ready when you are</span>
                </div>
                <div className="mt-4 overflow-hidden rounded-2xl bg-cover bg-center p-5" style={{ backgroundImage: "linear-gradient(90deg,rgba(7,22,55,.86),rgba(7,22,55,.12)),url(https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1000&q=80)" }}>
                  <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-100">Escape the ordinary</p>
                  <h2 className="mt-2 text-2xl font-bold">Go where the water glows.</h2>
                  <p className="mt-1 text-sm text-white/80">Your plans, all in one place.</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { icon: Plane, title: "Journey", text: "Every leg in order" },
                    { icon: Ticket, title: "Documents", text: "Review before travel" },
                    { icon: Backpack, title: "Packing", text: "A list that fits" },
                  ].map(({ icon: Icon, title, text }) => (
                    <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200"><Icon size={17} /></span>
                      <p className="mt-3 text-sm font-semibold">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-blue-100/65">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#07132f] to-transparent" />
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 pt-6 sm:px-8">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-cyan-300">Everything in one nest</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Travel smart, from first idea to final stop.</h2>
            </div>
            <Link to="/register" className="hidden items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white sm:flex">
              Explore TripNest <ArrowRight size={16} />
            </Link>
          </div>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-4 md:grid-cols-3"
          >
            {features.map(({ icon: Icon, title, text }) => (
              <motion.article
                key={title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.035] p-6 shadow-xl shadow-black/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/20 to-violet-300/20 text-cyan-200">
                  <Icon size={23} />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-blue-100/65">{text}</p>
              </motion.article>
            ))}
          </motion.div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/10 pt-6 text-sm text-blue-100/60">
            <span className="flex items-center gap-2"><Compass size={17} className="text-cyan-300" /> Smart itineraries</span>
            <span className="flex items-center gap-2"><Sparkles size={17} className="text-violet-300" /> Thoughtful planning</span>
            <span className="flex items-center gap-2"><Gauge size={17} className="text-cyan-300" /> Travel with confidence</span>
          </div>
        </section>
      </main>
    </div>
  );
}
