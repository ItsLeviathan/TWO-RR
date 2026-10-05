"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Switch } from "@/components/ui/controls";
import { EmptyState, ErrorMessage } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import type { ActionResult } from "@/server/result";
import { createCategory, deleteCategory, moveCategory, renameCategory, setCategoryActive } from "@/server/actions/categories";

type Category = { id: string; name: string; isActive: boolean; productCount: number };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  function run(action: () => Promise<ActionResult<null>>, success?: string, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (success) toast.show(success);
        after?.();
      } else setError(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <form
        className="card flex flex-col gap-3 p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          run(() => createCategory(newName), "Category added", () => setNewName(""));
        }}
      >
        <label htmlFor="new-category" className="sr-only">
          New category name
        </label>
        <input
          id="new-category"
          className="input flex-1"
          placeholder="New category, e.g. Pastries"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={50}
        />
        <button type="submit" className="btn btn-gold" disabled={pending || !newName.trim()}>
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </form>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <div className="card overflow-hidden">
        {categories.length === 0 ? (
          <EmptyState title="No categories yet." description="Add categories like Coffee, Non-Coffee, Food and Pastries." />
        ) : (
          <ol className="divide-y divide-cream-200">
            {categories.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                <span className="w-6 text-center text-sm font-semibold text-ink-muted tabular-nums">{i + 1}</span>
                {editing?.id === c.id ? (
                  <form
                    className="flex flex-1 items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      run(() => renameCategory({ id: c.id, name: editing.name }), "Category renamed", () => setEditing(null));
                    }}
                  >
                    <label htmlFor={`rename-${c.id}`} className="sr-only">
                      Category name
                    </label>
                    <input
                      id={`rename-${c.id}`}
                      className="input"
                      value={editing.name}
                      onChange={(e) => setEditing({ id: c.id, name: e.target.value })}
                      maxLength={50}
                      autoFocus
                    />
                    <button type="submit" className="btn btn-espresso btn-icon" aria-label="Save name" disabled={pending}>
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn btn-ghost btn-icon" aria-label="Cancel rename" onClick={() => setEditing(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </form>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-sm text-ink-muted">
                      {c.productCount} product{c.productCount === 1 ? "" : "s"}
                      {!c.isActive && " · hidden from menu and POS"}
                    </p>
                  </div>
                )}
                <Switch
                  checked={c.isActive}
                  onChange={(v) => run(() => setCategoryActive({ id: c.id, isActive: v }), v ? `${c.name} enabled` : `${c.name} disabled`)}
                  label={c.isActive ? "Enabled" : "Disabled"}
                  disabled={pending}
                />
                <div className="flex items-center">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label={`Move ${c.name} up`}
                    disabled={pending || i === 0}
                    onClick={() => run(() => moveCategory({ id: c.id, direction: "up" }))}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label={`Move ${c.name} down`}
                    disabled={pending || i === categories.length - 1}
                    onClick={() => run(() => moveCategory({ id: c.id, direction: "down" }))}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label={`Rename ${c.name}`}
                    onClick={() => setEditing({ id: c.id, name: c.name })}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon text-danger-600"
                    aria-label={`Delete ${c.name}`}
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`Delete the “${c.name}” category?`)) run(() => deleteCategory(c.id), "Category deleted");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
