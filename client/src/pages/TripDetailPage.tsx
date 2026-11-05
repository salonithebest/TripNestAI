import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import axios from "axios";
import { ArrowDownToLine, ArrowLeft, Check, ChevronDown, FileText, Plus, Trash2, Train } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ErrorBanner, Input, primaryButtonClass, Select, Spinner } from "../components/ui";
import { PACKING_CATEGORIES } from "../constants";
import { api, getErrorMessage } from "../services/api";
import type { JourneySegment, PackingCategory, PackingItem, ReadinessSummary, TicketFields, TravelDocument, Trip, TripWeather } from "../types";
import { formatDate, formatDateTime } from "../utils/format";

type EditableTicketFields = Record<keyof TicketFields, string>;
type TripResponse = { trip: Trip };
type TripPageData = {
  trip: Trip;
  segments: JourneySegment[];
  documents: TravelDocument[];
  packingItems: PackingItem[];
  readiness: ReadinessSummary;
  weather: TripWeather | null;
  weatherError: string;
};
type TrainField = "fromStation" | "toStation" | "departure" | "trainNumber" | "pnr";

function getTrainFieldErrors(error: unknown): Partial<Record<TrainField, string>> {
  if (!axios.isAxiosError(error)) return {};
  const data = error.response?.data as
    | { message?: string; errors?: { field?: string; message?: string }[] }
    | undefined;
  const result: Partial<Record<TrainField, string>> = {};
  for (const issue of data?.errors ?? []) {
    const field = issue.field?.split(".").at(-1);
    if (
      (field === "fromStation" ||
        field === "toStation" ||
        field === "departure" ||
        field === "departureDate" ||
        field === "trainNumber" ||
        field === "pnr") &&
      issue.message
    ) {
      result[field === "departureDate" ? "departure" : field] = issue.message;
    }
  }
  if (data?.message === "This train leg is already added.") {
    result.pnr = data.message;
    result.departure = data.message;
  } else if (data?.message === "Departure must be between the trip dates.") {
    result.departure = data.message;
  } else if (data?.message === "PNR must be exactly 10 digits.") {
    result.pnr = data.message;
  } else if (data?.message === "Train number must be exactly 5 digits.") {
    result.trainNumber = data.message;
  }
  return result;
}

function hasWeatherValues(weather: TripWeather | null | undefined): weather is TripWeather {
  return Boolean(
    weather &&
      weather.minTemperatureC !== null &&
      weather.maxTemperatureC !== null &&
      weather.rainChance !== null,
  );
}

const ticketFieldLabels: { key: keyof TicketFields; label: string }[] = [
  { key: "pnr", label: "PNR" },
  { key: "trainNumber", label: "Train number" },
  { key: "trainName", label: "Train name" },
  { key: "passengerName", label: "Passenger name" },
  { key: "fromStation", label: "From station" },
  { key: "toStation", label: "To station" },
  { key: "departureDate", label: "Departure date" },
  { key: "departureTime", label: "Departure time" },
  { key: "coach", label: "Coach" },
  { key: "seatNumber", label: "Seat number" },
  { key: "bookingStatus", label: "Booking status" },
];

const emptyTicket: EditableTicketFields = {
  pnr: "",
  trainNumber: "",
  trainName: "",
  passengerName: "",
  fromStation: "",
  toStation: "",
  departureDate: "",
  departureTime: "",
  coach: "",
  seatNumber: "",
  bookingStatus: "",
};

function toEditableFields(fields?: TicketFields | null): EditableTicketFields {
  return {
    pnr: fields?.pnr ?? "",
    trainNumber: fields?.trainNumber ?? "",
    trainName: fields?.trainName ?? "",
    passengerName: fields?.passengerName ?? "",
    fromStation: fields?.fromStation ?? "",
    toStation: fields?.toStation ?? "",
    departureDate: fields?.departureDate ?? "",
    departureTime: fields?.departureTime ?? "",
    coach: fields?.coach ?? "",
    seatNumber: fields?.seatNumber ?? "",
    bookingStatus: fields?.bookingStatus ?? "",
  };
}

function toTicketFields(fields: EditableTicketFields): TicketFields {
  return {
    pnr: fields.pnr.trim() || null,
    trainNumber: fields.trainNumber.trim() || null,
    trainName: fields.trainName.trim() || null,
    passengerName: fields.passengerName.trim() || null,
    fromStation: fields.fromStation.trim() || null,
    toStation: fields.toStation.trim() || null,
    departureDate: fields.departureDate.trim() || null,
    departureTime: fields.departureTime.trim() || null,
    coach: fields.coach.trim() || null,
    seatNumber: fields.seatNumber.trim() || null,
    bookingStatus: fields.bookingStatus.trim() || null,
  };
}

function SectionHeading({ title, status }: { title: string; status?: string }) {
  return (
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3">
      <span className="text-base font-semibold text-white">{title}</span>
      {status && <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-100/65">{status}</span>}
      <ChevronDown size={17} className="ml-auto text-blue-100/60 transition-transform [[open]>&]:rotate-180" />
    </summary>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-blue-100/85">{label}</span>
      {children}
    </label>
  );
}

export default function TripDetailPage() {
  const { tripId = "" } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [segments, setSegments] = useState<JourneySegment[]>([]);
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [readiness, setReadiness] = useState<ReadinessSummary | null>(null);
  const [weather, setWeather] = useState<TripWeather | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [retryingWeather, setRetryingWeather] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [segmentError, setSegmentError] = useState("");
  const [segmentFieldErrors, setSegmentFieldErrors] = useState<Partial<Record<TrainField, string>>>({});
  const [addingTrain, setAddingTrain] = useState(false);
  const [documentError, setDocumentError] = useState("");
  const [packingError, setPackingError] = useState("");
  const [departure, setDeparture] = useState("");
  const [trainNumber, setTrainNumber] = useState("");
  const [pnr, setPnr] = useState("");
  const [fromStation, setFromStation] = useState("");
  const [toStation, setToStation] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState("");
  const [ticketFields, setTicketFields] = useState<EditableTicketFields>(emptyTicket);
  const [savingDocument, setSavingDocument] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [packingName, setPackingName] = useState("");
  const [packingCategory, setPackingCategory] = useState<PackingCategory>("custom");
  const [generatingPacking, setGeneratingPacking] = useState(false);
  const [savingPackingItem, setSavingPackingItem] = useState(false);

  const fetchTripData = useCallback(async (): Promise<TripPageData> => {
    const [tripResult, segmentsResult, documentsResult, packingResult, readinessResult] = await Promise.all([
      api.get<TripResponse>(`/trips/${tripId}`),
      api.get<{ segments: JourneySegment[] }>(`/trips/${tripId}/segments`),
      api.get<{ documents: TravelDocument[] }>(`/trips/${tripId}/documents`),
      api.get<{ items: PackingItem[] }>(`/trips/${tripId}/packing`),
      api.get<ReadinessSummary>(`/trips/${tripId}/readiness`),
    ]);
    try {
      const { data } = await api.get<{ weather: TripWeather | null }>(`/trips/${tripId}/weather`);
      return {
        trip: tripResult.data.trip,
        segments: segmentsResult.data.segments,
        documents: documentsResult.data.documents,
        packingItems: packingResult.data.items,
        readiness: readinessResult.data,
        weather: hasWeatherValues(data.weather) ? data.weather : null,
        weatherError: hasWeatherValues(data.weather) ? "" : "Weather unavailable",
      };
    } catch (err) {
      return {
        trip: tripResult.data.trip,
        segments: segmentsResult.data.segments,
        documents: documentsResult.data.documents,
        packingItems: packingResult.data.items,
        readiness: readinessResult.data,
        weather: null,
        weatherError: getErrorMessage(err),
      };
    }
  }, [tripId]);

  const applyTripData = useCallback((data: TripPageData) => {
    setTrip(data.trip);
    setSegments(data.segments);
    setDocuments(data.documents);
    setPackingItems(data.packingItems);
    setReadiness(data.readiness);
    setWeather(data.weather);
    setWeatherError(data.weatherError);
  }, []);

  const loadTripData = useCallback(async () => {
    applyTripData(await fetchTripData());
  }, [applyTripData, fetchTripData]);

  useEffect(() => {
    let active = true;
    fetchTripData()
      .then((data) => {
        if (active) applyTripData(data);
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
  }, [applyTripData, fetchTripData]);

  async function handleAddTrain(event: FormEvent) {
    event.preventDefault();
    setSegmentError("");
    setSegmentFieldErrors({});
    const fieldErrors: Partial<Record<TrainField, string>> = {};
    const normalizedPnr = pnr.trim();
    const normalizedTrainNumber = trainNumber.trim();
    const normalizedFromStation = fromStation.trim() || trip?.origin || "";
    const normalizedToStation = toStation.trim() || trip?.destination || "";
    const departureDay = departure.slice(0, 10);
    const departureDate = departure ? new Date(departure) : null;
    if (!/^\d{10}$/.test(normalizedPnr)) fieldErrors.pnr = "PNR must be exactly 10 digits.";
    if (!/^\d{5}$/.test(normalizedTrainNumber)) fieldErrors.trainNumber = "Train number must be exactly 5 digits.";
    if (!normalizedFromStation) fieldErrors.fromStation = "From station is required.";
    if (!normalizedToStation) fieldErrors.toStation = "To station is required.";
    if (normalizedFromStation.toLocaleLowerCase() === normalizedToStation.toLocaleLowerCase()) {
      fieldErrors.toStation = "From station and to station must be different.";
    }
    if (!departureDate || Number.isNaN(departureDate.getTime())) {
      fieldErrors.departure = "Departure is required.";
    } else if (
      trip &&
      (departureDay < trip.startDate.slice(0, 10) || departureDay > trip.endDate.slice(0, 10))
    ) {
      fieldErrors.departure = "Departure must be between the trip dates.";
    }
    if (Object.keys(fieldErrors).length > 0) {
      setSegmentFieldErrors(fieldErrors);
      return;
    }
    if (
      segments.some(
        (segment) =>
          segment.pnr === normalizedPnr &&
          segment.departure &&
          departureDate &&
          new Date(segment.departure).getTime() === departureDate.getTime(),
      )
    ) {
      setSegmentFieldErrors({
        pnr: "This train leg is already added.",
        departure: "This train leg is already added.",
      });
      return;
    }

    setAddingTrain(true);
    try {
      await api.post(`/trips/${tripId}/segments`, {
        transportMode: "train",
        fromLocation: normalizedFromStation,
        toLocation: normalizedToStation,
        fromStation: normalizedFromStation,
        toStation: normalizedToStation,
        trainNumber: normalizedTrainNumber,
        pnr: normalizedPnr,
        ...(departureDate ? { departure: departureDate.toISOString(), departureDate: departureDay } : {}),
      });
      toast.success("Train journey saved");
      await loadTripData();
    } catch (err) {
      const fieldIssues = getTrainFieldErrors(err);
      setSegmentFieldErrors(fieldIssues);
      if (Object.keys(fieldIssues).length === 0) setSegmentError(getErrorMessage(err));
    } finally {
      setAddingTrain(false);
    }
  }

  async function handleRetryWeather() {
    setRetryingWeather(true);
    setWeatherError("");
    try {
      const { data } = await api.get<{ weather: TripWeather | null }>(`/trips/${tripId}/weather`);
      if (!hasWeatherValues(data.weather)) {
        setWeather(null);
        setWeatherError("Weather unavailable");
        return;
      }
      setWeather(data.weather);
      setWeatherError("");
    } catch {
      setWeather(null);
      setWeatherError("Weather unavailable");
    } finally {
      setRetryingWeather(false);
    }
  }

  async function handleDeleteTrain(id: string) {
    if (!window.confirm("Delete this train journey?")) return;
    try {
      await api.delete(`/segments/${id}`);
      toast.success("Train journey deleted");
      await loadTripData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleUploadTicket(event: FormEvent) {
    event.preventDefault();
    if (!documentFile) {
      setDocumentError("Choose a PDF, JPG or PNG ticket.");
      return;
    }
    if (documentFile.size > 5 * 1024 * 1024) {
      setDocumentError("The uploaded file must be 5 MB or smaller.");
      return;
    }

    setSavingDocument(true);
    setDocumentError("");
    const formData = new FormData();
    formData.append("file", documentFile);
    try {
      const { data } = await api.post<{ document: TravelDocument }>(`/trips/${tripId}/documents`, formData);
      setActiveDocumentId(data.document._id);
      setTicketFields(toEditableFields(data.document.extractedData));
      setDocumentFile(null);
      setManualMode(false);
      toast.success("Ticket read. Review the fields before approving.");
      await loadTripData();
    } catch (err) {
      const message = getErrorMessage(err);
      setDocumentError(message);
      toast.error(message);
    } finally {
      setSavingDocument(false);
    }
  }

  async function handleCreateManualTicket() {
    setDocumentError("");
    setSavingDocument(true);
    try {
      const { data } = await api.post<{ document: TravelDocument }>(`/trips/${tripId}/documents/manual`, {
        fields: toTicketFields(ticketFields),
      });
      setActiveDocumentId(data.document._id);
      setTicketFields(toEditableFields(data.document.extractedData));
      toast.success("Manual ticket details saved as a draft.");
      await loadTripData();
    } catch (err) {
      setDocumentError(getErrorMessage(err));
    } finally {
      setSavingDocument(false);
    }
  }

  async function handleReviewTicket(approve: boolean) {
    if (!activeDocumentId) {
      setDocumentError("Select or add a ticket before saving.");
      return;
    }
    const fields = toTicketFields(ticketFields);
    if (fields.pnr && !/^\d{10}$/.test(fields.pnr)) {
      setDocumentError("PNR must be exactly 10 digits.");
      return;
    }
    if (fields.trainNumber && !/^\d{5}$/.test(fields.trainNumber)) {
      setDocumentError("Train number must be exactly 5 digits.");
      return;
    }

    setSavingDocument(true);
    setDocumentError("");
    try {
      await api.patch(`/documents/${activeDocumentId}/review`, { fields, approve });
      toast.success(approve ? "Ticket approved and train journey saved." : "Ticket draft saved.");
      await loadTripData();
    } catch (err) {
      setDocumentError(getErrorMessage(err));
    } finally {
      setSavingDocument(false);
    }
  }

  function selectDocument(document: TravelDocument) {
    setActiveDocumentId(document._id);
    setTicketFields(toEditableFields(document.verifiedData ?? document.extractedData));
    setManualMode(false);
    setDocumentError("");
  }

  async function handleGeneratePacking() {
    setGeneratingPacking(true);
    setPackingError("");
    try {
      const { data } = await api.post<{ aiAvailable: boolean }>(`/trips/${tripId}/packing/generate`);
      setAiAvailable(data.aiAvailable);
      await loadTripData();
      if (data.aiAvailable) {
        toast.success("AI-enhanced packing list generated.");
      } else {
        toast.warning("Rule-based packing list generated. AI suggestions are temporarily unavailable.");
      }
    } catch (err) {
      setPackingError(getErrorMessage(err));
    } finally {
      setGeneratingPacking(false);
    }
  }

  async function handleTogglePacking(itemId: string) {
    try {
      await api.patch(`/packing/${itemId}`);
      await loadTripData();
    } catch (err) {
      setPackingError(getErrorMessage(err));
    }
  }

  async function handleDeletePacking(itemId: string) {
    if (!window.confirm("Remove this packing item?")) return;
    try {
      await api.delete(`/packing/${itemId}`);
      await loadTripData();
    } catch (err) {
      setPackingError(getErrorMessage(err));
    }
  }

  async function handleAddPacking(event: FormEvent) {
    event.preventDefault();
    setPackingError("");
    setSavingPackingItem(true);
    try {
      await api.post(`/trips/${tripId}/packing`, { name: packingName, category: packingCategory });
      setPackingName("");
      await loadTripData();
      toast.success("Packing item added.");
    } catch (err) {
      setPackingError(getErrorMessage(err));
    } finally {
      setSavingPackingItem(false);
    }
  }

  async function handleExportCalendar() {
    try {
      const { data } = await api.get<Blob>(`/trips/${tripId}/calendar.ics`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `tripnest-${trip?.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "trip"}.ics`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDeleteTrip() {
    if (!window.confirm("Delete this trip and its journeys, documents and packing list? This cannot be undone.")) return;
    try {
      await api.delete(`/trips/${tripId}`);
      toast.success("Trip deleted.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <Spinner />;
  if (!trip) {
    return (
      <div className="space-y-4 rounded-3xl border border-white/10 bg-[#0b1c43] p-6 text-white">
        <ErrorBanner message={error || "Trip not found"} />
        <Link to="/dashboard" className="text-sm font-semibold text-cyan-200 hover:text-white">Back to dashboard</Link>
      </div>
    );
  }

  const packedCount = packingItems.filter((item) => item.isPacked).length;
  const groupedItems = packingItems.reduce<Record<string, PackingItem[]>>((groups, item) => {
    (groups[item.category] ??= []).push(item);
    return groups;
  }, {});

  return (
    <div className="space-y-6 text-white">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-blue-100/70 hover:text-white">
        <ArrowLeft size={16} /> Back to trips
      </Link>

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-cover bg-center p-6 shadow-xl sm:p-8" style={{ backgroundImage: "linear-gradient(90deg,rgba(7,19,47,.95),rgba(7,19,47,.75) 65%,rgba(7,19,47,.45)),url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80)" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-200">{trip.purpose}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{trip.title}</h1>
            <p className="mt-2 text-lg text-blue-50">{trip.origin} <span className="text-cyan-200">→</span> {trip.destination}</p>
            <p className="mt-1 text-sm text-blue-100/65">{formatDate(trip.startDate)} — {formatDate(trip.endDate)}</p>
          </div>
          <button onClick={handleDeleteTrip} className="rounded-xl border border-red-300/25 bg-red-400/10 px-4 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-400/20">
            Delete trip
          </button>
        </div>
      </section>

      <ErrorBanner message={error} />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
        <div className="space-y-4">
          <details id="journey" open className="rounded-3xl border border-white/10 bg-[#0b1c43] px-5 py-3 shadow-lg shadow-black/10">
            <SectionHeading title="Journey" status={`${segments.length} train leg${segments.length === 1 ? "" : "s"}`} />
            <div className="border-t border-white/10 pb-3 pt-4">
              <form onSubmit={handleAddTrain} className="grid gap-3 sm:grid-cols-2">
                <FormField label="From station">
                  <Input value={fromStation} onChange={(event) => { setFromStation(event.target.value); setSegmentFieldErrors((previous) => ({ ...previous, fromStation: undefined })); }} placeholder={trip.origin} aria-invalid={Boolean(segmentFieldErrors.fromStation)} />
                  {segmentFieldErrors.fromStation && <span role="alert" className="text-xs text-red-200">{segmentFieldErrors.fromStation}</span>}
                </FormField>
                <FormField label="To station">
                  <Input value={toStation} onChange={(event) => { setToStation(event.target.value); setSegmentFieldErrors((previous) => ({ ...previous, toStation: undefined })); }} placeholder={trip.destination} aria-invalid={Boolean(segmentFieldErrors.toStation)} />
                  {segmentFieldErrors.toStation && <span role="alert" className="text-xs text-red-200">{segmentFieldErrors.toStation}</span>}
                </FormField>
                <FormField label="Departure">
                  <Input type="datetime-local" min={`${trip.startDate.slice(0, 10)}T00:00`} max={`${trip.endDate.slice(0, 10)}T23:59`} value={departure} onChange={(event) => { setDeparture(event.target.value); setSegmentFieldErrors((previous) => ({ ...previous, departure: undefined })); }} aria-invalid={Boolean(segmentFieldErrors.departure)} />
                  {segmentFieldErrors.departure && <span role="alert" className="text-xs text-red-200">{segmentFieldErrors.departure}</span>}
                </FormField>
                <FormField label="Train number">
                  <Input value={trainNumber} onChange={(event) => { setTrainNumber(event.target.value); setSegmentFieldErrors((previous) => ({ ...previous, trainNumber: undefined })); }} placeholder="5 digits" inputMode="numeric" aria-invalid={Boolean(segmentFieldErrors.trainNumber)} />
                  {segmentFieldErrors.trainNumber && <span role="alert" className="text-xs text-red-200">{segmentFieldErrors.trainNumber}</span>}
                </FormField>
                <FormField label="PNR">
                  <Input value={pnr} onChange={(event) => { setPnr(event.target.value); setSegmentFieldErrors((previous) => ({ ...previous, pnr: undefined })); }} placeholder="10 digits" inputMode="numeric" aria-invalid={Boolean(segmentFieldErrors.pnr)} />
                  {segmentFieldErrors.pnr && <span role="alert" className="text-xs text-red-200">{segmentFieldErrors.pnr}</span>}
                </FormField>
                <div className="flex items-end"><button disabled={addingTrain} className={`${primaryButtonClass} min-h-11 w-full`}><Plus size={16} /> {addingTrain ? "Adding train leg..." : "Add train leg"}</button></div>
                <div className="sm:col-span-2"><ErrorBanner message={segmentError} /></div>
              </form>

              {segments.length > 0 && (
                <ol className="mt-5 space-y-3">
                  {segments.map((segment) => (
                    <li key={segment._id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-200"><Train size={19} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{segment.fromStation || segment.fromLocation} <span className="text-cyan-200">→</span> {segment.toStation || segment.toLocation}</p>
                        <p className="mt-1 text-xs text-blue-100/60">{segment.trainNumber ? `Train ${segment.trainNumber}` : "Train"}{segment.pnr ? ` · PNR ${segment.pnr}` : ""}{segment.departure ? ` · ${formatDateTime(segment.departure)}` : ""}</p>
                      </div>
                      <button type="button" onClick={() => void handleDeleteTrain(segment._id)} aria-label="Delete train leg" className="rounded-lg p-2 text-blue-100/50 hover:bg-red-400/10 hover:text-red-200"><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </details>

          <details id="documents" open className="rounded-3xl border border-white/10 bg-[#0b1c43] px-5 py-3 shadow-lg shadow-black/10">
            <SectionHeading title="Travel documents" status={documents.some((document) => document.verificationStatus === "verified") ? "Verified" : documents.length ? "Review needed" : "Not added"} />
            <div className="border-t border-white/10 pb-3 pt-4">
              <form onSubmit={handleUploadTicket} className="space-y-3">
                <FormField label="Upload train ticket (PDF, JPG or PNG; max 5 MB)">
                  <input type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} className="min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/25 px-3 py-2 text-sm text-white" />
                </FormField>
                {documentFile && <p className="text-xs text-cyan-100">{documentFile.name}</p>}
                <div className="flex flex-wrap gap-3">
                  <button disabled={savingDocument} className={primaryButtonClass}><FileText size={16} />{savingDocument ? "Reading your ticket..." : "Upload and read ticket"}</button>
                  <button type="button" onClick={() => { setManualMode(true); setActiveDocumentId(""); setTicketFields(emptyTicket); }} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold text-blue-100/80 hover:bg-white/10">Enter details manually</button>
                </div>
                <ErrorBanner message={documentError} />
              </form>

              {documents.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {documents.map((document) => (
                    <button key={document._id} type="button" onClick={() => selectDocument(document)} className={`rounded-xl border px-3 py-2 text-xs ${activeDocumentId === document._id ? "border-cyan-200 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.04] text-blue-100/65"}`}>
                      {document.originalFileName || "Manual ticket"} · {document.verificationStatus === "verified" ? "Verified" : "Pending"}
                    </button>
                  ))}
                </div>
              )}

              {(activeDocumentId || manualMode) && (
                <form
                  onSubmit={(event) => event.preventDefault()}
                  className="mt-5 rounded-2xl border border-white/10 bg-slate-950/20 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h3 className="font-semibold">Review ticket fields</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-200">Check flagged fields</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ticketFieldLabels.map(({ key, label }) => {
                      const selected = documents.find((document) => document._id === activeDocumentId);
                      const flagged = selected?.flaggedFields.includes(key) ?? false;
                      return (
                        <FormField key={key} label={label}>
                          <div className="space-y-1">
                            <Input
                              value={ticketFields[key]}
                              onChange={(event) => setTicketFields((previous) => ({ ...previous, [key]: event.target.value }))}
                              placeholder="Not found"
                              type={key === "departureDate" ? "date" : key === "departureTime" ? "time" : "text"}
                              className={flagged ? "border-amber-300 ring-2 ring-amber-300/15" : ""}
                            />
                            {!ticketFields[key] && (key === "departureDate" || key === "departureTime") && (
                              <span className="block text-xs text-blue-100/55">Not found</span>
                            )}
                            {flagged && <span className="text-xs font-medium text-amber-200">Please check</span>}
                          </div>
                        </FormField>
                      );
                    })}
                  </div>
                  {manualMode && !activeDocumentId ? (
                    <button type="button" disabled={savingDocument} onClick={() => void handleCreateManualTicket()} className={`${primaryButtonClass} mt-4`}>{savingDocument ? "Saving..." : "Save manual draft"}</button>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button type="button" disabled={savingDocument} onClick={() => void handleReviewTicket(false)} className="min-h-11 rounded-xl border border-white/15 px-4 text-sm font-semibold text-blue-100 hover:bg-white/10">{savingDocument ? "Saving..." : "Save draft"}</button>
                      <button type="button" disabled={savingDocument} onClick={() => void handleReviewTicket(true)} className={primaryButtonClass}><Check size={16} />{savingDocument ? "Saving..." : "Approve ticket"}</button>
                    </div>
                  )}
                  <div className="mt-3"><ErrorBanner message={documentError} /></div>
                </form>
              )}
            </div>
          </details>

          <details id="packing" open className="rounded-3xl border border-white/10 bg-[#0b1c43] px-5 py-3 shadow-lg shadow-black/10">
            <SectionHeading title="Smart packing" status={packingItems.length ? `${packedCount} of ${packingItems.length} packed` : "Not generated"} />
            <div className="border-t border-white/10 pb-3 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-blue-100/60">{packedCount} of {packingItems.length} packed</p>
                <button type="button" onClick={() => void handleGeneratePacking()} disabled={generatingPacking} className={primaryButtonClass}>{generatingPacking ? "Generating..." : "Generate list"}</button>
              </div>
              {aiAvailable === false && <p className="mt-3 text-xs text-amber-200">AI suggestions are unavailable; this list uses trip rules only.</p>}
              <ErrorBanner message={packingError} />
              <form onSubmit={handleAddPacking} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Input value={packingName} onChange={(event) => setPackingName(event.target.value)} placeholder="Add a custom item" required />
                <Select value={packingCategory} onChange={(event) => setPackingCategory(event.target.value as PackingCategory)}>
                  {PACKING_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </Select>
                <button disabled={savingPackingItem} className={primaryButtonClass}>{savingPackingItem ? "Adding..." : "Add item"}</button>
              </form>
              <div className="mt-5 space-y-4">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <section key={category}>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-[.15em] text-cyan-200">{category}</h3>
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <li key={item._id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                          <input type="checkbox" checked={item.isPacked} onChange={() => void handleTogglePacking(item._id)} className="mt-1 h-4 w-4 accent-cyan-400" aria-label={`Pack ${item.name}`} />
                          <div className="min-w-0 flex-1">
                            <p className={item.isPacked ? "text-sm text-blue-100/40 line-through" : "text-sm text-white"}>{item.name}</p>
                            {item.reason && <p className="mt-1 text-xs text-blue-100/55">{item.reason}</p>}
                          </div>
                          <button type="button" aria-label={`Delete ${item.name}`} onClick={() => void handleDeletePacking(item._id)} className="rounded-md p-1 text-blue-100/45 hover:text-red-200"><Trash2 size={14} /></button>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          </details>

          <details className="rounded-3xl border border-white/10 bg-[#0b1c43] px-5 py-3 shadow-lg shadow-black/10">
            <SectionHeading title="Accommodation" status="Optional" />
            <p className="border-t border-white/10 py-4 text-sm text-blue-100/55">Accommodation planning is optional and can be added later.</p>
          </details>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-white/10 bg-[#0b1c43] p-5 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Trip readiness</h2>
              <span className="text-2xl font-bold text-cyan-200">{readiness?.percent ?? 0}%</span>
            </div>
            <p className="mt-2 text-xs text-blue-100/55">Documents 30 · Trip details 20 · Packing 50.</p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all" style={{ width: `${readiness?.percent ?? 0}%` }} />
            </div>
            {readiness?.percent === 100 ? (
              <p className="mt-4 text-sm font-semibold text-emerald-200">Everything looks ready.</p>
            ) : (
              <ul className="mt-4 space-y-2 text-sm text-blue-100/75">
                {(readiness?.gaps ?? ["Loading readiness details..."]).map((gap) => <li key={gap}>• {gap}</li>)}
              </ul>
            )}
            {readiness && (
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
                {[
                  ["Documents", readiness.breakdown.documents, 30],
                  ["Trip", readiness.breakdown.tripDetails, 20],
                  ["Packing", readiness.breakdown.packing, 50],
                ].map(([label, points, max]) => (
                  <div key={label} className="rounded-xl bg-white/[0.04] p-2">
                    <p className="text-sm font-bold text-white">{points}/{max}</p>
                    <p className="mt-1 text-[10px] text-blue-100/50">{label}</p>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => void handleExportCalendar()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-4 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/15">
              <ArrowDownToLine size={16} /> Export calendar
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0b1c43] p-5 shadow-lg shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.17em] text-cyan-200">Destination weather</p>
                <h2 className="mt-1 font-semibold">{trip.destination}</h2>
              </div>
              {weather && <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">{weather.label}</span>}
            </div>
            {weather ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/[0.05] p-3"><p className="text-[10px] text-blue-100/50">Low</p><p className="mt-1 font-semibold">{weather.minTemperatureC}°C</p></div>
                <div className="rounded-xl bg-white/[0.05] p-3"><p className="text-[10px] text-blue-100/50">High</p><p className="mt-1 font-semibold">{weather.maxTemperatureC}°C</p></div>
                <div className="rounded-xl bg-white/[0.05] p-3"><p className="text-[10px] text-blue-100/50">Rain</p><p className="mt-1 font-semibold">{weather.rainChance}%</p></div>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-blue-100/55">{weatherError || "Weather unavailable"}</p>
                <button type="button" onClick={() => void handleRetryWeather()} disabled={retryingWeather} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-white/10 disabled:opacity-50">
                  {retryingWeather ? "Retrying..." : "Retry"}
                </button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#0b1c43] p-5 shadow-lg shadow-black/10">
            <h2 className="font-semibold">Train timeline</h2>
            {segments.length ? (
              <ol className="mt-4 space-y-3">
                {segments.map((segment, index) => (
                  <li key={segment._id} className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-cyan-200"><Train size={15} /></span>
                    <div className="min-w-0"><p className="text-sm font-medium">{segment.fromLocation} → {segment.toLocation}</p><p className="mt-1 text-xs text-blue-100/55">{segment.departure ? formatDateTime(segment.departure) : `Train leg ${index + 1}`}</p></div>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-3 text-sm text-blue-100/55">Add a train leg or approve your ticket to start the timeline.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
