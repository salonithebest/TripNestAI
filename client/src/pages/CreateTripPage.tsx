import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, Train } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ErrorBanner, Input, Textarea, primaryButtonClass } from "../components/ui";
import { PURPOSE_OPTIONS } from "../constants";
import { api, getErrorMessage } from "../services/api";

const initialForm = {
  title: "",
  origin: "",
  destination: "",
  startDate: "",
  endDate: "",
  purpose: "vacation",
  notes: "",
};

type FormState = typeof initialForm;

const steps = ["Where & when", "Transport", "Add details"];

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-blue-100/85">{label}</span>
      {children}
    </label>
  );
}

export default function CreateTripPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [step, setStep] = useState(0);
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof FormState) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));
  }

  const stepOneValid =
    form.title.trim().length >= 2 &&
    form.origin.trim().length >= 2 &&
    form.destination.trim().length >= 2 &&
    Boolean(form.startDate) &&
    Boolean(form.endDate) &&
    form.endDate >= form.startDate;

  function handleContinue() {
    setError("");
    if (step === 0 && !stepOneValid) {
      setError("Enter a trip name, route, and valid dates before continuing.");
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function handleSubmit(event?: FormEvent, skipUpload = false) {
    event?.preventDefault();
    setError("");
    setSubmitting(true);
    let createdTripId = "";
    const fileToUpload = skipUpload ? null : ticketFile;
    try {
      const { data } = await api.post<{ trip: { _id: string } }>("/trips", form);
      createdTripId = data.trip._id;
      if (fileToUpload) {
        const formData = new FormData();
        formData.append("file", fileToUpload);
        const upload = await api.post(`/trips/${data.trip._id}/documents`, formData);
        if (upload.status !== 201) throw new Error("Ticket upload did not complete");
      }
      toast.success(fileToUpload ? "Trip created and ticket sent for review." : "Trip created. Add your journey details next.");
      navigate(`/trips/${data.trip._id}`);
    } catch (err) {
      if (fileToUpload && createdTripId) {
        toast.error(`Trip was created, but the ticket could not be uploaded: ${getErrorMessage(err)}`);
        navigate(`/trips/${createdTripId}`);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[#0b1c43] p-5 text-white shadow-2xl shadow-black/15 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">A new journey</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Plan a new trip</h1>
          <p className="mt-1 text-sm text-blue-100/65">A few details now. The rest can come as you go.</p>
        </div>
        <Link to="/dashboard" className="rounded-xl border border-white/15 px-3 py-2 text-sm text-blue-100/80 hover:bg-white/10">
          Cancel
        </Link>
      </div>

      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-blue-100/60">
          <span>Step {step + 1} of {steps.length}</span>
          <span className="text-cyan-200">{steps[step]}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <ol className="mt-4 grid grid-cols-3 gap-2">
          {steps.map((label, index) => (
            <li key={label} className={`flex items-center gap-2 text-xs ${index <= step ? "text-cyan-100" : "text-blue-100/40"}`}>
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${index < step ? "bg-cyan-300 text-blue-950" : index === step ? "border border-cyan-200 text-cyan-100" : "border border-white/15"}`}>
                {index < step ? <Check size={14} /> : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </li>
          ))}
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="mt-7">
        {step === 0 && (
          <div className="grid gap-5 lg:grid-cols-[1fr_.8fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField label="Trip name">
                  <Input placeholder="e.g. Jaipur winter getaway" value={form.title} onChange={update("title")} required minLength={2} />
                </FormField>
              </div>
              <FormField label="From">
                <Input placeholder="Surat" value={form.origin} onChange={update("origin")} required minLength={2} />
              </FormField>
              <FormField label="Going to">
                <Input placeholder="Jaipur" value={form.destination} onChange={update("destination")} required minLength={2} />
              </FormField>
              <FormField label="Start date">
                <Input type="date" value={form.startDate} onChange={update("startDate")} required />
              </FormField>
              <FormField label="End date">
                <Input type="date" min={form.startDate || undefined} value={form.endDate} onChange={update("endDate")} required />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Purpose">
                  <div className="mt-1 flex flex-wrap gap-2">
                    {PURPOSE_OPTIONS.map((purpose) => (
                      <button
                        key={purpose.value}
                        type="button"
                        onClick={() => setForm((previous) => ({ ...previous, purpose: purpose.value }))}
                        className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${form.purpose === purpose.value ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/15 bg-white/[0.04] text-blue-100/70 hover:bg-white/10"}`}
                      >
                        {purpose.label}
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>
            </div>
            <div className="hidden rounded-3xl border border-white/10 bg-cover bg-center p-6 lg:block" style={{ backgroundImage: "linear-gradient(180deg,rgba(7,19,47,.15),rgba(7,19,47,.92)),url(https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1000&q=80)" }}>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-950/30 px-3 py-1 text-xs text-cyan-100 backdrop-blur"><Train size={14} /> Trip preview</span>
              <div className="mt-36">
                <p className="text-2xl font-bold">{form.title || "Your next story starts here"}</p>
                <p className="mt-2 text-sm text-white/80">{form.origin || "From"} <span className="text-cyan-200">→</span> {form.destination || "Destination"}</p>
                <p className="mt-1 text-xs text-white/65">{form.startDate || "Start"} — {form.endDate || "End"}</p>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <section className="mx-auto max-w-xl rounded-3xl border border-cyan-200/20 bg-gradient-to-br from-cyan-300/10 to-blue-500/10 p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-200"><Train size={28} /></div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Transport</p>
            <h2 className="mt-2 text-2xl font-bold">How will you get there?</h2>
            <button type="button" className="mt-5 flex min-h-14 w-full items-center gap-4 rounded-2xl border border-cyan-200/60 bg-cyan-300/10 px-4 text-left">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300 text-blue-950"><Train size={20} /></span>
              <span><span className="block font-semibold">Train</span><span className="text-xs text-blue-100/60">Selected for this trip</span></span>
              <Check className="ml-auto text-cyan-200" size={19} />
            </button>
            <p className="mt-4 text-sm text-blue-100/55">More transport types coming soon.</p>
          </section>
        )}

        {step === 2 && (
          <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-200"><FileText size={23} /></div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Travel documents</p>
            <h2 className="mt-2 text-2xl font-bold">Add your train ticket</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100/65">AI can read a PDF or photo so you can check every detail before approving it.</p>
            <FormField label="Upload ticket with AI (PDF, JPG or PNG; max 5 MB)">
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-slate-950/30 px-3 py-2 text-sm text-white"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file && file.size > 5 * 1024 * 1024) {
                    setTicketFile(null);
                    setError("The uploaded file must be 5 MB or smaller.");
                  } else {
                    setTicketFile(file);
                    setError("");
                  }
                }}
              />
            </FormField>
            {ticketFile && <p className="mt-2 text-xs text-cyan-100">Selected: {ticketFile.name}</p>}
            <p className="mt-5 text-sm text-blue-100/65">
              Want to enter details yourself?{" "}
              <button type="button" onClick={() => setTicketFile(null)} className="font-semibold text-cyan-200 underline underline-offset-4">
                Enter manually after creating the trip
              </button>
            </p>
            <Textarea className="mt-4" rows={2} value={form.notes} onChange={update("notes")} placeholder="Trip notes (optional)" />
          </div>
        )}

        <ErrorBanner message={error} />
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={() => { setError(""); setStep((current) => current - 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-blue-100 hover:bg-white/10">
              <ArrowLeft size={16} /> Back
            </button>
          ) : <span />}
          {step < 2 ? (
            <button type="button" onClick={handleContinue} className={primaryButtonClass}>
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => void handleSubmit(undefined, true)} className="text-sm font-semibold text-cyan-200 hover:text-white">
                Skip for now
              </button>
              <button type="submit" disabled={submitting} className={primaryButtonClass}>
                {submitting ? "Creating trip..." : "Create trip"} <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
