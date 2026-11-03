import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
import { PACKING_CATEGORIES, TRANSPORT_OPTIONS } from "../constants";
import { api, getErrorMessage } from "../services/api";
import type {
  JourneySegment,
  PackingItem,
  ReadinessSummary,
  TicketExtractionData,
  TransportMode,
  TravelDocument,
  Trip,
} from "../types";
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

type EditableTicketFields = Record<
  "trainNumber" | "pnr" | "passengerName" | "departureLocation" | "destinationLocation" | "departureDate" | "ticketStatus" | "amount" | "notes",
  string
>;

const ticketFieldLabels: { key: keyof EditableTicketFields; label: string }[] = [
  { key: "trainNumber", label: "Train number" },
  { key: "pnr", label: "PNR / booking reference" },
  { key: "passengerName", label: "Passenger name" },
  { key: "departureLocation", label: "Departure location" },
  { key: "destinationLocation", label: "Destination" },
  { key: "departureDate", label: "Departure date" },
  { key: "ticketStatus", label: "Ticket status" },
  { key: "amount", label: "Amount" },
  { key: "notes", label: "Notes" },
];

function toEditableTicketFields(data?: TicketExtractionData): EditableTicketFields {
  const toText = (value: string | number | null | undefined) =>
    value === null || value === undefined || value === "" ? "Not found" : String(value);

  return {
    trainNumber: toText(data?.trainNumber),
    pnr: toText(data?.pnr),
    passengerName: toText(data?.passengerName),
    departureLocation: toText(data?.departureLocation),
    destinationLocation: toText(data?.destinationLocation),
    departureDate: toText(data?.departureDate),
    ticketStatus: toText(data?.ticketStatus),
    amount: toText(data?.amount),
    notes: toText(data?.notes),
  };
}

export default function TripDetailPage() {
  const { tripId = "" } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [segments, setSegments] = useState<JourneySegment[]>([]);
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [readiness, setReadiness] = useState<ReadinessSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [segmentForm, setSegmentForm] = useState(emptySegment);
  const [segmentError, setSegmentError] = useState("");
  const [savingSegment, setSavingSegment] = useState(false);
  const [documentForm, setDocumentForm] = useState({ title: "", type: "ticket", content: "" });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentError, setDocumentError] = useState("");
  const [savingDocument, setSavingDocument] = useState(false);
  const [reviewDocumentId, setReviewDocumentId] = useState("");
  const [reviewFields, setReviewFields] = useState<EditableTicketFields>(() => toEditableTicketFields());
  const [savingReview, setSavingReview] = useState(false);
  const documentFileInput = useRef<HTMLInputElement>(null);
  const [packingForm, setPackingForm] = useState({ title: "", category: "Custom" });
  const [packingError, setPackingError] = useState("");
  const [savingPackingItem, setSavingPackingItem] = useState(false);
  const [generatingPacking, setGeneratingPacking] = useState(false);

  const fetchData = useCallback(
    () =>
      Promise.all([
        api.get<{ trip: Trip }>(`/trips/${tripId}`),
        api.get<{ segments: JourneySegment[] }>(`/trips/${tripId}/segments`),
      ]),
    [tripId],
  );

  const loadPlanningData = useCallback(async () => {
    const [documentsResponse, packingResponse, readinessResponse] = await Promise.all([
      api.get<{ documents: TravelDocument[] }>(`/trips/${tripId}/documents`),
      api.get<{ items: PackingItem[] }>(`/trips/${tripId}/packing`),
      api.get<ReadinessSummary>(`/trips/${tripId}/readiness`),
    ]);

    setDocuments(documentsResponse.data.documents);
    setPackingItems(packingResponse.data.items);
    setReadiness(readinessResponse.data);
  }, [tripId]);

  const load = useCallback(async () => {
    try {
      const [tripResponse, segmentsResponse] = await fetchData();
      setTrip(tripResponse.data.trip);
      setSegments(segmentsResponse.data.segments);
      await loadPlanningData();
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [fetchData, loadPlanningData]);

  useEffect(() => {
    let active = true;
    fetchData()
      .then(async ([tripResponse, segmentsResponse]) => {
        if (!active) return;
        setTrip(tripResponse.data.trip);
        setSegments(segmentsResponse.data.segments);
        try {
          await loadPlanningData();
        } catch (err) {
          console.warn("Failed to load trip planning data:", err);
        }
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
  }, [fetchData, loadPlanningData]);

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

  async function handleCreateDocument(event: FormEvent) {
    event.preventDefault();
    setDocumentError("");

    if (!documentFile && !documentForm.content.trim()) {
      setDocumentError("Choose a PDF, JPG, or PNG file, or enter details manually.");
      return;
    }

    if (documentFile && documentFile.size > 5 * 1024 * 1024) {
      setDocumentError("The uploaded file must be 5 MB or smaller.");
      return;
    }

    setSavingDocument(true);

    try {
      let response;
      if (documentFile) {
        const formData = new FormData();
        formData.append("title", documentForm.title);
        formData.append("type", documentForm.type);
        if (documentForm.content.trim()) formData.append("content", documentForm.content.trim());
        formData.append("file", documentFile);
        response = await api.post<{ document: TravelDocument }>(`/trips/${tripId}/documents`, formData);
      } else {
        response = await api.post<{ document: TravelDocument }>(`/trips/${tripId}/documents`, {
          title: documentForm.title,
          type: documentForm.type,
          content: documentForm.content,
        });
      }

      setDocumentForm({ title: "", type: "ticket", content: "" });
      setDocumentFile(null);
      if (documentFileInput.current) documentFileInput.current.value = "";
      setReviewDocumentId(response.data.document._id);
      setReviewFields(toEditableTicketFields(response.data.document.extractedData));
      toast.success("Travel document saved");
      await loadPlanningData();
    } catch (err) {
      setDocumentError(getErrorMessage(err));
    } finally {
      setSavingDocument(false);
    }
  }

  async function handleReviewDocument(status: "verified" | "pending_review") {
    const document = documents.find((item) => item._id === reviewDocumentId);
    if (!document) {
      setDocumentError("Select a saved document to review.");
      return;
    }

    const toValue = (value: string) => (value.trim() === "" || value.trim() === "Not found" ? null : value.trim());
    const amountText = toValue(reviewFields.amount);
    const amount = amountText === null ? null : Number(amountText);
    if (amount !== null && !Number.isFinite(amount)) {
      setDocumentError("Amount must be a valid number or Not found.");
      return;
    }

    setDocumentError("");
    setSavingReview(true);
    try {
      const { data } = await api.patch<{ document: TravelDocument }>(`/documents/${reviewDocumentId}`, {
        status,
        extractedData: {
          trainNumber: toValue(reviewFields.trainNumber),
          pnr: toValue(reviewFields.pnr),
          passengerName: toValue(reviewFields.passengerName),
          departureLocation: toValue(reviewFields.departureLocation),
          destinationLocation: toValue(reviewFields.destinationLocation),
          departureDate: toValue(reviewFields.departureDate),
          ticketStatus: toValue(reviewFields.ticketStatus),
          amount,
          notes: toValue(reviewFields.notes),
          source: document.extractedData?.source ?? "heuristic",
        },
      });
      setDocuments((current) => current.map((item) => item._id === data.document._id ? data.document : item));
      toast.success(status === "verified" ? "Document approved" : "Draft saved");
      await loadPlanningData();
    } catch (err) {
      setDocumentError(getErrorMessage(err));
    } finally {
      setSavingReview(false);
    }
  }

  async function handleGeneratePacking() {
    setGeneratingPacking(true);
    setPackingError("");

    try {
      await api.post(`/trips/${tripId}/packing/generate`);
      toast.success("Packing list generated");
      await loadPlanningData();
    } catch (err) {
      setPackingError(getErrorMessage(err));
    } finally {
      setGeneratingPacking(false);
    }
  }

  async function handleTogglePacking(itemId: string) {
    try {
      await api.patch(`/packing/${itemId}/toggle`);
      await loadPlanningData();
    } catch (err) {
      setPackingError(getErrorMessage(err));
    }
  }

  async function handleAddPackingItem(event: FormEvent) {
    event.preventDefault();
    setPackingError("");
    setSavingPackingItem(true);

    try {
      await api.post(`/trips/${tripId}/packing`, {
        title: packingForm.title,
        category: packingForm.category,
      });
      setPackingForm({ title: "", category: "Custom" });
      toast.success("Packing item added");
      await loadPlanningData();
    } catch (err) {
      setPackingError(getErrorMessage(err));
    } finally {
      setSavingPackingItem(false);
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

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink-900">Trip readiness</h2>
          {readiness ? (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between text-sm font-medium text-ink-700">
                <span>Overall readiness</span>
                <span>{readiness.overall}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-sun-500"
                  style={{ width: `${readiness.overall}%` }}
                />
              </div>
              {readiness.weatherSummary && (
                <p className="text-sm text-ink-600">
                  Weather: {readiness.weatherSummary.summary} · {readiness.weatherSummary.temperatureC}°C · {readiness.weatherSummary.precipitationChance}% rain chance
                </p>
              )}
              {readiness.overall === 100 ? (
                <p className="text-sm text-ink-600">Everything looks ready for departure.</p>
              ) : readiness.gaps.length > 0 ? (
                <ul className="space-y-2 text-sm text-ink-600">
                  {readiness.gaps.map((gap) => (
                    <li key={gap}>• {gap}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-600">Complete the remaining trip-readiness items.</p>
              )}
              <a
                href={`/api/trips/${tripId}/calendar.ics`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                Export calendar
              </a>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-500">Readiness is loading…</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink-900">Travel docs</h2>
          <form onSubmit={handleCreateDocument} className="mt-4 space-y-3">
            <Field label="Title">
              <Input
                value={documentForm.title}
                onChange={(event) => setDocumentForm({ ...documentForm, title: event.target.value })}
                placeholder="Train ticket"
              />
            </Field>
            <Field label="Type">
              <Select
                value={documentForm.type}
                onChange={(event) => setDocumentForm({ ...documentForm, type: event.target.value })}
              >
                <option value="ticket">Ticket</option>
                <option value="passport">Passport</option>
                <option value="voucher">Voucher</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Upload ticket (PDF, JPG, PNG; max 5 MB)">
              <input
                ref={documentFileInput}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setDocumentFile(file);
                  setDocumentError(
                    file && file.size > 5 * 1024 * 1024 ? "The uploaded file must be 5 MB or smaller." : "",
                  );
                }}
              />
            </Field>
            {documentFile && <p className="text-xs text-ink-500">Selected: {documentFile.name}</p>}
            <Field label="Enter details manually">
              <textarea
                value={documentForm.content}
                onChange={(event) => setDocumentForm({ ...documentForm, content: event.target.value })}
                placeholder="Use this instead of uploading a file, or add details to help extraction"
                className="min-h-[120px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-slate-400 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </Field>
            <ErrorBanner message={documentError} />
            <button type="submit" className={`${primaryButtonClass} w-full`} disabled={savingDocument}>
              {savingDocument ? "Uploading and extracting..." : "Upload / extract"}
            </button>
          </form>

          {reviewDocumentId && (
            <form
              className="mt-5 space-y-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleReviewDocument("verified");
              }}
            >
              <h3 className="font-semibold text-ink-900">Review extracted details</h3>
              {ticketFieldLabels.map(({ key, label }) => (
                <Field key={key} label={label}>
                  <Input
                    value={reviewFields[key]}
                    placeholder="Not found"
                    onChange={(event) => setReviewFields({ ...reviewFields, [key]: event.target.value })}
                  />
                </Field>
              ))}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={savingReview}
                  onClick={() => void handleReviewDocument("pending_review")}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  {savingReview ? "Saving..." : "Save draft"}
                </button>
                <button type="submit" disabled={savingReview} className={`${primaryButtonClass} flex-1`}>
                  {savingReview ? "Approving..." : "Approve"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-5 space-y-3">
            {documents.length === 0 ? (
              <p className="text-sm text-ink-500">No documents saved yet.</p>
            ) : (
              documents.map((document) => (
                <button
                  type="button"
                  key={document._id}
                  onClick={() => {
                    setReviewDocumentId(document._id);
                    setReviewFields(toEditableTicketFields(document.extractedData));
                    setDocumentError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink-900">{document.title}</p>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                      {document.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{document.type}</p>
                  <span className="mt-2 inline-block text-xs font-semibold text-brand-700">Review</span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink-900">Packing checklist</h2>
          <button
            type="button"
            onClick={handleGeneratePacking}
            disabled={generatingPacking}
            className={`${primaryButtonClass} mt-4 w-full`}
          >
            {generatingPacking ? "Generating..." : "Generate packing list"}
          </button>

          <form onSubmit={handleAddPackingItem} className="mt-4 space-y-3">
            <Field label="Item">
              <Input
                value={packingForm.title}
                onChange={(event) => setPackingForm({ ...packingForm, title: event.target.value })}
                placeholder="e.g. Running shoes"
              />
            </Field>
            <Field label="Category">
              <Select
                value={packingForm.category}
                onChange={(event) => setPackingForm({ ...packingForm, category: event.target.value })}
              >
                {PACKING_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </Field>
            <button type="submit" disabled={savingPackingItem} className={`${primaryButtonClass} w-full`}>
              {savingPackingItem ? "Adding..." : "Add item"}
            </button>
          </form>

          <ErrorBanner message={packingError} />

          <div className="mt-5 space-y-3">
            {packingItems.length === 0 ? (
              <p className="text-sm text-ink-500">No packing items yet.</p>
            ) : (
              packingItems.map((item) => (
                <label
                  key={item._id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-ink-700"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.packed}
                      onChange={() => handleTogglePacking(item._id)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    <span className={item.packed ? "line-through text-ink-400" : ""}>{item.title}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{item.category}</span>
                </label>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
