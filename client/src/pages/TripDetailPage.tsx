import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bus, Car, Plane, Plus, Trash2, Train } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  dangerButtonClass,
  ErrorBanner,
  Field,
  Input,
  primaryButtonClass,
  Select,
  Spinner,
} from "../components/ui";
import { TRANSPORT_OPTIONS } from "../constants";
import { api, getErrorMessage } from "../services/api";
import type { JourneySegment, TransportMode, Trip } from "../types";
import { formatDate, formatDateTime } from "../utils/format";

const modeIcons = {
  train: Train,
  flight: Plane,
  bus: Bus,
  car: Car,
  cab: Car,
} satisfies Record<TransportMode, typeof Train>;

const emptySegment = {
  transportMode: "train" as TransportMode,
  fromLocation: "",
  toLocation: "",
  departure: "",
};

export default function TripDetailPage() {
  const { tripId = "" } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [segments, setSegments] = useState<JourneySegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [segmentForm, setSegmentForm] = useState(emptySegment);
  const [segmentError, setSegmentError] = useState("");
  const [savingSegment, setSavingSegment] = useState(false);

  const fetchData = useCallback(
    () =>
      Promise.all([
        api.get<{ trip: Trip }>(`/trips/${tripId}`),
        api.get<{ segments: JourneySegment[] }>(`/trips/${tripId}/segments`),
      ]),
    [tripId],
  );

  const load = useCallback(async () => {
    try {
      const [tripResponse, segmentsResponse] = await fetchData();
      setTrip(tripResponse.data.trip);
      setSegments(segmentsResponse.data.segments);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [fetchData]);

  useEffect(() => {
    let active = true;
    fetchData()
      .then(([tripResponse, segmentsResponse]) => {
        if (!active) return;
        setTrip(tripResponse.data.trip);
        setSegments(segmentsResponse.data.segments);
        setError("");
      })
      .catch((err: unknown) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchData]);

  async function handleAddSegment(event: FormEvent) {
    event.preventDefault();
    setSegmentError("");
    setSavingSegment(true);

    const payload = {
      transportMode: segmentForm.transportMode,
      fromLocation: segmentForm.fromLocation,
      toLocation: segmentForm.toLocation,
      ...(segmentForm.departure ? { departure: segmentForm.departure } : {}),
    };

    try {
      await api.post(`/trips/${tripId}/segments`, payload);
      setSegmentForm(emptySegment);
      toast.success("Journey leg added");
      await load();
    } catch (err) {
      setSegmentError(getErrorMessage(err));
    } finally {
      setSavingSegment(false);
    }
  }

  async function handleDeleteSegment(id: string) {
    if (!window.confirm("Delete this journey leg?")) return;
    try {
      await api.delete(`/segments/${id}`);
      toast("Journey leg removed");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDeleteTrip() {
    if (!window.confirm("Delete this trip and all its journey legs? This cannot be undone.")) return;
    try {
      await api.delete(`/trips/${tripId}`);
      toast("Trip deleted");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <Spinner />;

  if (!trip) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error || "Trip not found"} />
        <Link to="/dashboard" className="text-sm font-semibold text-brand-700 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> Back to trips
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{trip.title}</h1>
          <p className="mt-1 text-ink-700">{trip.origin} → {trip.destination}</p>
          <p className="mt-1 text-sm text-ink-500">
            {formatDate(trip.startDate)} – {formatDate(trip.endDate)} ·{" "}
            <span className="capitalize">{trip.purpose}</span>
          </p>
          {trip.notes && <p className="mt-3 text-sm text-ink-700">{trip.notes}</p>}
        </div>
        <button onClick={handleDeleteTrip} className={dangerButtonClass}>
          <Trash2 size={16} /> Delete trip
        </button>
      </div>

      <ErrorBanner message={error} />

      <div className="grid gap-8 lg:grid-cols-5">
        <section className="space-y-4 lg:col-span-3">
          <h2 className="text-lg font-semibold text-ink-900">Journey</h2>
          {segments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-ink-500">
              No journey legs yet. Add your first leg using the form.
            </div>
          ) : (
            <ol className="relative space-y-3 before:absolute before:bottom-6 before:left-[1.15rem] before:top-6 before:w-0.5 before:bg-brand-100">
              <AnimatePresence initial={false}>
                {segments.map((segment) => {
                  const Icon = modeIcons[segment.transportMode];
                  return (
                    <motion.li
                      key={segment._id}
                      layout
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 16, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.35 }}
                      className="relative flex gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:shadow-md"
                    >
                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-md shadow-brand-600/30">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                          Step {segment.sequence} · {segment.transportMode}
                        </p>
                        <p className="font-semibold text-ink-900">
                          {segment.fromLocation} → {segment.toLocation}
                        </p>
                        {segment.departure && (
                          <p className="text-sm text-ink-500">Departs {formatDateTime(segment.departure)}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteSegment(segment._id)}
                        className="self-start rounded-lg p-2 text-ink-500 transition hover:bg-red-50 hover:text-red-700"
                        aria-label="Delete journey leg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          )}
        </section>

        <section className="lg:col-span-2">
          <form onSubmit={handleAddSegment} className="space-y-4 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
              <Plus size={18} /> Add journey leg
            </h2>
            <Field label="Transport mode">
              <Select
                value={segmentForm.transportMode}
                onChange={(event) =>
                  setSegmentForm({ ...segmentForm, transportMode: event.target.value as TransportMode })
                }
              >
                {TRANSPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="From">
              <Input
                placeholder="e.g. Surat Railway Station"
                value={segmentForm.fromLocation}
                onChange={(event) => setSegmentForm({ ...segmentForm, fromLocation: event.target.value })}
                required
              />
            </Field>
            <Field label="To">
              <Input
                placeholder="e.g. New Delhi"
                value={segmentForm.toLocation}
                onChange={(event) => setSegmentForm({ ...segmentForm, toLocation: event.target.value })}
                required
              />
            </Field>
            <Field label="Departure (optional)">
              <Input
                type="datetime-local"
                value={segmentForm.departure}
                onChange={(event) => setSegmentForm({ ...segmentForm, departure: event.target.value })}
              />
            </Field>
            <ErrorBanner message={segmentError} />
            <button type="submit" disabled={savingSegment} className={`${primaryButtonClass} w-full`}>
              {savingSegment ? "Adding..." : "Add to journey"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
