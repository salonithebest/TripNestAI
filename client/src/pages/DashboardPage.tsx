import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, CheckCircle2, Compass, MapPin, Plane, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, EmptyState, ErrorBanner, Skeleton, primaryButtonClass } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { fadeUp, stagger } from "../lib/motion";
import { api, getErrorMessage } from "../services/api";
import type { ReadinessSummary, Trip } from "../types";
import { formatDate } from "../utils/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nextReadiness, setNextReadiness] = useState<ReadinessSummary | null>(null);
  const [readinessError, setReadinessError] = useState<{ tripId: string; message: string } | null>(null);

  useEffect(() => {
    api
      .get<{ trips: Trip[] }>("/trips")
      .then((response) => setTrips(response.data.trips))
      .catch((err: unknown) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const { upcoming, completed } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      upcoming: trips
        .filter((trip) => trip.endDate.slice(0, 10) >= today)
        .sort((first, second) => first.startDate.localeCompare(second.startDate)),
      completed: trips.filter((trip) => trip.endDate.slice(0, 10) < today),
    };
  }, [trips]);
  const nextTrip = upcoming[0] ?? null;
  const nextTripId = nextTrip?._id;

  useEffect(() => {
    let active = true;
    if (!nextTripId) return () => { active = false; };
    api.get<ReadinessSummary>(`/trips/${nextTripId}/readiness`)
      .then(({ data }) => {
        if (active) setNextReadiness({ ...data, tripId: nextTripId });
      })
      .catch((err: unknown) => {
        if (active) setReadinessError({ tripId: nextTripId, message: getErrorMessage(err) });
      });
    return () => { active = false; };
  }, [nextTripId]);

  const readinessForNextTrip = nextReadiness?.tripId === nextTripId ? nextReadiness : null;
  const readinessErrorForNextTrip = readinessError?.tripId === nextTripId ? readinessError : null;

  const firstName = user?.name.split(" ")[0] ?? "there";
  const stats = [
    { label: "Total trips", value: trips.length, icon: Compass, color: "from-cyan-400 to-blue-500" },
    { label: "Upcoming", value: upcoming.length, icon: CalendarDays, color: "from-blue-500 to-violet-500" },
    { label: "Completed", value: completed.length, icon: CheckCircle2, color: "from-emerald-400 to-cyan-500" },
  ];

  return (
    <div className="travel-night min-h-[calc(100vh-4.5rem)] space-y-8 rounded-[2rem] p-4 text-white sm:p-7 lg:p-9">
      <section
        className="relative isolate overflow-hidden rounded-[1.75rem] bg-cover bg-center px-6 py-10 sm:px-10 sm:py-12"
        style={{
          backgroundImage:
            "linear-gradient(90deg,rgba(6,17,50,.92),rgba(6,17,50,.56) 58%,rgba(6,17,50,.1)),url(https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1800&q=85)",
        }}
      >
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 backdrop-blur">
            <Sparkles size={14} /> Your travel workspace
          </span>
          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Hi {firstName}, where to next?</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-blue-50/80 sm:text-base">
            Discover, plan and get ready for your next great escape.
          </p>
          <Link to="/trips/new" className={`${primaryButtonClass} mt-6`}>
            <Plus size={16} /> Start planning <ArrowRight size={16} />
          </Link>
        </div>
        <div className="absolute -bottom-16 -right-10 hidden h-64 w-64 rounded-full border border-white/20 sm:block" />
        <div className="absolute -bottom-10 -right-4 hidden h-48 w-48 rounded-full border border-white/20 sm:block" />
        <Plane className="absolute right-16 top-12 hidden rotate-[-18deg] text-white/85 sm:block" size={30} />
      </section>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, ...stat }) => (
          <motion.div key={stat.label} variants={fadeUp}>
            <Card className="flex items-center justify-between border-white/10 bg-white/[0.06] text-white shadow-xl shadow-black/10 backdrop-blur">
              <div>
                <span className="text-sm font-medium text-blue-100/65">{stat.label}</span>
                <p className="mt-1 text-3xl font-bold tracking-tight text-white">{stat.value}</p>
              </div>
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}>
                <Icon size={21} />
              </span>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <ErrorBanner message={error} />

      {nextTrip && (
        <section className="grid gap-5 rounded-3xl border border-cyan-200/15 bg-gradient-to-br from-cyan-300/[0.08] to-violet-500/[0.08] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-200">Coming up next</p>
            <Link to={`/trips/${nextTrip._id}`} className="mt-2 inline-block text-xl font-bold text-white hover:text-cyan-100">{nextTrip.title}</Link>
            <p className="mt-1 text-sm text-blue-100/65">{nextTrip.origin} <span className="text-cyan-200">→</span> {nextTrip.destination} · {formatDate(nextTrip.startDate)}</p>
          </div>
          <div className="w-full sm:max-w-56">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-blue-100/70">Readiness</span>
              <span className="font-bold text-cyan-100">{readinessForNextTrip ? `${readinessForNextTrip.percent}%` : readinessErrorForNextTrip ? "Unavailable" : "Loading"}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all" style={{ width: `${readinessForNextTrip?.percent ?? 0}%` }} />
            </div>
            {readinessForNextTrip?.gaps[0] && <p className="mt-2 line-clamp-1 text-xs text-blue-100/55">{readinessForNextTrip.gaps[0]}</p>}
            {readinessErrorForNextTrip && <p className="mt-2 text-xs text-amber-200">Readiness could not be loaded.</p>}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Your itinerary</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Trips on your horizon</h2>
          </div>
          {trips.length > 0 && (
            <Link to="/trips/new" className="hidden items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white sm:flex">
              Plan another <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-36 bg-white/10" />
            <Skeleton className="h-36 bg-white/10" />
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/20 bg-white/[0.045] px-5 py-12">
            <EmptyState
              title="Your next story starts here"
              description="Create your first trip and bring the route, travel documents and packing details together."
              action={<Link to="/trips/new" className={primaryButtonClass}>Create your first trip <ArrowRight size={16} /></Link>}
            />
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2">
            {trips.map((trip, index) => (
              <motion.div key={trip._id} variants={fadeUp}>
                <Link to={`/trips/${trip._id}`} className="block h-full">
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className="group h-full overflow-hidden rounded-3xl border border-white/10 bg-[#0b1c43] shadow-lg shadow-black/10 transition hover:border-cyan-200/30 hover:shadow-cyan-950/30"
                  >
                    <div
                      className="relative h-32 bg-cover bg-center"
                      style={{
                        backgroundImage: `linear-gradient(90deg,rgba(7,19,47,.65),rgba(7,19,47,.05)),url(${index % 2 === 0
                          ? "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=80"
                          : "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80"})`,
                      }}
                    >
                      <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-slate-950/35 px-3 py-1 text-xs font-semibold capitalize text-white backdrop-blur">
                        {trip.status}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-cyan-100">{trip.title}</h3>
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-blue-100/75">
                            <MapPin size={14} className="text-cyan-300" /> {trip.origin} <span className="text-cyan-300">→</span> {trip.destination}
                          </p>
                        </div>
                        <ArrowRight size={17} className="mt-1 text-blue-100/45 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
                      </div>
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-blue-100/55">
                        <CalendarDays size={14} /> {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                      </p>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  );
}
