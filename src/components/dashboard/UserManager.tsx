"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Pencil, Trash2, UserPlus } from "lucide-react";
import { Segmented, Switch } from "@/components/ui/controls";
import { Modal } from "@/components/ui/Modal";
import { ErrorMessage } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import type { UserRole } from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { createUser, deleteUser, resetUserPassword, updateUser } from "@/server/actions/users";
import type { ActionResult } from "@/server/result";

type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

type Dialog = { kind: "create" } | { kind: "edit"; user: User } | { kind: "password"; user: User } | null;

const ROLE_OPTIONS = [
  { value: "staff" as const, label: "Cashier" },
  { value: "owner" as const, label: "Owner" },
];

export function UserManager({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(user: User) {
    if (!window.confirm(`Remove ${user.name}? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.ok) toast.show(`${user.name} removed`);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className="btn btn-gold" onClick={() => setDialog({ kind: "create" })}>
          <UserPlus className="h-4 w-4" /> Add User
        </button>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}

      <ul className="card divide-y divide-cream-200 overflow-hidden">
        {users.map((u) => {
          const isMe = u.id === currentUserId;
          return (
            <li key={u.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4", !u.isActive && "bg-cream-50")}>
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold",
                  u.role === "owner" ? "bg-espresso-900 text-gold-300" : "bg-cream-200 text-walnut-700",
                )}
                aria-hidden
              >
                {u.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("font-semibold", !u.isActive && "text-ink-muted")}>
                  {u.name} {isMe && <span className="text-sm font-normal text-ink-muted">(you)</span>}
                </p>
                <p className="truncate text-sm text-ink-muted">{u.email}</p>
              </div>
              <span
                className={cn(
                  "chip ring-1 ring-inset",
                  u.role === "owner" ? "bg-gold-100 text-gold-700 ring-gold-600/30" : "bg-info-50 text-info-600 ring-info-600/25",
                )}
              >
                {ROLE_LABEL[u.role]}
              </span>
              <span
                className={cn(
                  "chip ring-1 ring-inset",
                  u.isActive ? "bg-success-50 text-success-600 ring-success-600/25" : "bg-cream-100 text-ink-muted ring-cream-300",
                )}
              >
                {u.isActive ? "Active" : "Disabled"}
              </span>
              <span className="w-40 text-xs text-ink-muted">
                {u.lastLoginAt ? `Last sign-in ${formatDateTime(u.lastLoginAt)}` : "Never signed in"}
              </span>
              <div className="flex">
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`Edit ${u.name}`} onClick={() => setDialog({ kind: "edit", user: u })}>
                  <Pencil className="h-4 w-4" />
                </button>
                {!isMe && (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      aria-label={`Reset password for ${u.name}`}
                      onClick={() => setDialog({ kind: "password", user: u })}
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon text-danger-600"
                      aria-label={`Remove ${u.name}`}
                      disabled={pending}
                      onClick={() => remove(u)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        title={dialog?.kind === "create" ? "Add User" : dialog?.kind === "edit" ? `Edit ${dialog.user.name}` : dialog ? `Reset password` : ""}
      >
        {dialog?.kind === "create" && <UserForm onDone={() => setDialog(null)} />}
        {dialog?.kind === "edit" && <UserForm user={dialog.user} isMe={dialog.user.id === currentUserId} onDone={() => setDialog(null)} />}
        {dialog?.kind === "password" && <ResetPasswordForm user={dialog.user} onDone={() => setDialog(null)} />}
      </Modal>
    </div>
  );
}

function UserForm({ user, isMe = false, onDone }: { user?: User; isMe?: boolean; onDone: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "staff");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [password, setPassword] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result: ActionResult<null> = user
        ? await updateUser({ id: user.id, name, email, role, isActive })
        : await createUser({ name, email, role, password });
      if (result.ok) {
        toast.show(user ? "User updated" : `${name} can now sign in`);
        onDone();
      } else {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 overflow-y-auto px-5 pb-5" noValidate>
      <div>
        <label htmlFor="u-name" className="label">
          Name
        </label>
        <input id="u-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />
        {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
      </div>
      <div>
        <label htmlFor="u-email" className="label">
          Email (used to sign in)
        </label>
        <input id="u-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
      </div>
      <fieldset disabled={isMe}>
        <legend className="label">Role</legend>
        <Segmented name="u-role" value={role} onChange={setRole} options={ROLE_OPTIONS} />
        <p className="hint mt-2">
          {isMe
            ? "You can't change your own role."
            : role === "owner"
              ? "Full access, including reports, settings, products and users."
              : "POS, today's and open orders, payments and receipts. No reports, settings, product editing or users."}
        </p>
      </fieldset>
      {user ? (
        !isMe && <Switch checked={isActive} onChange={setIsActive} label="Account active (can sign in)" />
      ) : (
        <div>
          <label htmlFor="u-password" className="label">
            Temporary password
          </label>
          <input
            id="u-password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          {fieldErrors.password ? (
            <p className="field-error">{fieldErrors.password}</p>
          ) : (
            <p className="hint mt-1">At least 10 characters. They can change it under My account after signing in.</p>
          )}
        </div>
      )}
      {user && (user.role !== role || user.isActive !== isActive) && (
        <p className="rounded-xl bg-warning-50 px-4 py-3 text-sm text-warning-600">Saving will sign {user.name} out of all devices.</p>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button type="submit" className="btn btn-espresso w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} {user ? "Save Changes" : "Create User"}
      </button>
    </form>
  );
}

function ResetPasswordForm({ user, onDone }: { user: User; onDone: () => void }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 px-5 pb-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await resetUserPassword({ id: user.id, password });
          if (result.ok) {
            toast.show(`Password reset for ${user.name}`);
            onDone();
          } else setError(result.error);
        });
      }}
      noValidate
    >
      <p className="text-sm text-ink-soft">
        Set a new password for <strong>{user.name}</strong>. They&apos;ll be signed out of all devices and must use the new password.
      </p>
      <div>
        <label htmlFor="r-password" className="label">
          New password
        </label>
        <input
          id="r-password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
        />
        <p className="hint mt-1">At least 10 characters.</p>
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <button type="submit" className="btn btn-espresso w-full" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Reset Password
      </button>
    </form>
  );
}
