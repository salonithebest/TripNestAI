import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, EmptyState, ErrorBanner, Skeleton, primaryButtonClass } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { fadeUp, stagger } from "../lib/motion";
import { api, getErrorMessage } from "../services/api";
import type { Trip } from "../types";
import { formatDate } from "../utils/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ trips: Trip[] }>("/trips")
      .then((response) => setTrips(response.data.trips))
      .catch((err: unknown) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const { upcoming, completed } = useMemo(() => {
    const now = new Date();
    return {
      upcoming: trips.filter((trip) => new Date(trip.endDate) >= now),
      completed: trips.filter((trip) => new Date(trip.endDate) < now),
    };
  }, [trips]);

  const firstName = user?.name.split(" ")[0] ?? "there";
  const stats = [
    { label: "Total trips", value: trips.length },
    { label: "Upcoming", value: upcoming.length },
    { label: "Completed", value: completed.length },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand-700">Welcome back</p>
          <h1 className="mt-1 text-3xl font-bold text-ink-900">Hi {firstName}, where to next?</h1>
        </div>
        <Link to="/trips/new" className={primaryButtonClass}>
          <Plus size={16} /> Plan a trip
        </Link>
      </div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={fadeUp}>
            <Card className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink-500">{stat.label}</span>
              <span className="text-3xl font-bold text-ink-900">{stat.value}</span>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <ErrorBanner message={error} />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : trips.length === 0 ? (
        <EmptyState
          title="No trips yet"
          description="Create your first trip and add your journey details in one place."
          action={<Link to="/trips/new" className={primaryButtonClass}>Create your first trip</Link>}
        />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2">
          {trips.map((trip) => (
            <motion.div key={trip._id} variants={fadeUp}>
              <Link to={`/trips/${trip._id}`} className="block h-full">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="h-full rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-ink-900">{trip.title}</h2>
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-700">
                      {trip.status}
                    </span>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-700">
                    <MapPin size={14} className="text-brand-600" /> {trip.origin} → {trip.destination}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
                    <CalendarDays size={14} /> {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                  </p>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
