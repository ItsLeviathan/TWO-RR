"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible modal built on the native <dialog> element (focus trapping, Escape to close and an
 * inert background come from the browser). `variant="sheet"` slides in from the right on wide
 * screens and up from the bottom on phones.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  variant = "center",
  className,
  hideTitle = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant?: "center" | "sheet";
  className?: string;
  hideTitle?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
    if (!open) document.documentElement.style.overflow = "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself, outside the panel) closes.
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-espresso-950/60 backdrop:backdrop-blur-[2px]",
        "fixed inset-0 h-full w-full",
      )}
    >
      {open && (
        <div
          className={cn(
            "pointer-events-none fixed inset-0 flex",
            variant === "center" && "items-end justify-center p-0 sm:items-center sm:p-6",
            variant === "sheet" && "items-end justify-end sm:items-stretch",
          )}
        >
          <div
            className={cn(
              "pointer-events-auto relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-cream-50 shadow-2xl",
              variant === "center" &&
                "animate-[fade-up_0.35s_var(--ease-soft)_both] rounded-t-3xl sm:max-w-lg sm:rounded-3xl",
              variant === "sheet" &&
                "animate-[sheet-in_0.35s_var(--ease-soft)_both] rounded-t-3xl sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-3xl",
              className,
            )}
          >
            <div className={cn("flex items-center justify-between gap-4 px-5 pt-5 pb-3", hideTitle && "absolute right-0 top-0 z-10 p-3")}>
              {!hideTitle && <h2 className="display text-2xl text-ink">{title}</h2>}
              <button type="button" onClick={onClose} className="btn btn-ghost btn-icon shrink-0 bg-cream-50/80" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </dialog>
  );
}
