import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AuthLayout from "../components/AuthLayout";
import { ErrorBanner, Field, Input, primaryButtonClass } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../services/api";

export default function LoginPage() {
  const { user, login, sessionError } = useAuth();
  const navigate = useNavigate();
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
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to manage your trips.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        <ErrorBanner message={error || sessionError} />
        <button type="submit" disabled={submitting} className={`${primaryButtonClass} w-full`}>
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        New here?{" "}
        <Link to="/register" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
