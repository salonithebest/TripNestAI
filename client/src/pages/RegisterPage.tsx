import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AuthLayout from "../components/AuthLayout";
import { ErrorBanner, Field, Input, primaryButtonClass } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../services/api";

export default function RegisterPage() {
  const { user, register, sessionError } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(name, email, password);
      toast.success("Account created. Let's plan your first trip!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start organizing your trips in one place.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password (min. 8 characters)">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </Field>
        <ErrorBanner message={error || sessionError} />
        <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full`}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
