import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ErrorBanner, Field, Input, Select, Textarea, primaryButtonClass } from "../components/ui";
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

export default function CreateTripPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof FormState) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await api.post<{ trip: { _id: string } }>("/trips", form);
      toast.success("Trip created. Now add your journey.");
      navigate(`/trips/${data.trip._id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-ink-900">Plan a new trip</h1>
      <p className="mt-1 text-sm text-ink-500">Add the basics. You can add journey details next.</p>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Trip title">
            <Input placeholder="e.g. Manali Winter Vacation" value={form.title} onChange={update("title")} required />
          </Field>
        </div>
        <Field label="Origin">
          <Input placeholder="Surat" value={form.origin} onChange={update("origin")} required />
        </Field>
        <Field label="Destination">
          <Input placeholder="Manali" value={form.destination} onChange={update("destination")} required />
        </Field>
        <Field label="Start date">
          <Input type="date" value={form.startDate} onChange={update("startDate")} required />
        </Field>
        <Field label="End date">
          <Input type="date" value={form.endDate} onChange={update("endDate")} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Purpose">
            <Select value={form.purpose} onChange={update("purpose")}>
              {PURPOSE_OPTIONS.map((purpose) => (
                <option key={purpose.value} value={purpose.value}>{purpose.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes (optional)">
            <Textarea rows={3} value={form.notes} onChange={update("notes")} />
          </Field>
        </div>
        <div className="space-y-4 sm:col-span-2">
          <ErrorBanner message={error} />
          <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full`}>
            {submitting ? "Creating..." : "Create trip"}
          </button>
        </div>
      </form>
    </div>
  );
}
