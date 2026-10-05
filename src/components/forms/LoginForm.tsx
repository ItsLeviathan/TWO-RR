"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { ErrorMessage } from "@/components/ui/states";
import { login, type LoginState } from "@/server/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null, email: "" });
  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className="input"
          aria-invalid={Boolean(state.error)}
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
          aria-invalid={Boolean(state.error)}
        />
      </div>
      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      <button type="submit" className="btn btn-espresso btn-lg w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
