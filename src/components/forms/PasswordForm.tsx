"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { ErrorMessage } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import { changePassword } from "@/server/actions/auth";

export function PasswordForm() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const field = (k: keyof typeof values, label: string, autoComplete: string) => (
    <div>
      <label htmlFor={`pw-${k}`} className="label">
        {label}
      </label>
      <input
        id={`pw-${k}`}
        type="password"
        className="input"
        autoComplete={autoComplete}
        value={values[k]}
        aria-invalid={Boolean(fieldErrors[k])}
        onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
      />
      {fieldErrors[k] && <p className="field-error">{fieldErrors[k]}</p>}
    </div>
  );

  return (
    <form
      className="card grid gap-6 p-6 lg:grid-cols-[16rem_1fr]"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await changePassword(values);
          if (result.ok) {
            toast.show("Password changed");
            setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setFieldErrors({});
          } else {
            setError(result.error);
            setFieldErrors(result.fieldErrors ?? {});
          }
        });
      }}
    >
      <div>
        <h2 className="display text-2xl">Password</h2>
        <p className="mt-1 text-sm text-ink-muted">Use at least 10 characters.</p>
      </div>
      <div className="space-y-4">
        <input type="text" name="username" autoComplete="username" className="hidden" readOnly aria-hidden tabIndex={-1} />
        {field("currentPassword", "Current password", "current-password")}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("newPassword", "New password", "new-password")}
          {field("confirmPassword", "Confirm new password", "new-password")}
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button type="submit" className="btn btn-espresso" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Change Password
        </button>
      </div>
    </form>
  );
}
