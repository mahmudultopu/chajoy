/** Accessible modal and drawer built on the native <dialog> element. */

"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

/**
 * Native <dialog> (focus trap, Esc, inert background for free).
 * variant "drawer" slides in from the right; "sheet" is a centred modal that
 * becomes a bottom sheet on phones.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  variant = "sheet",
  className,
  hideTitle,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  variant?: "drawer" | "sheet";
  className?: string;
  hideTitle?: boolean;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    }
    if (!open && d.open) d.close();
    return () => {
      if (!open) document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={() => {
        document.documentElement.style.overflow = "";
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={clsx(
        "fixed m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-forest-950/45 backdrop:backdrop-blur-[2px]",
        variant === "drawer"
          ? "inset-y-0 right-0 left-auto h-dvh w-full sm:w-[440px]"
          : clsx("inset-x-0 bottom-0 top-auto w-full sm:inset-0 sm:m-auto sm:h-fit", wide ? "sm:w-[min(94vw,980px)]" : "sm:w-[min(92vw,640px)]"),
      )}
    >
      {open && (
        <div
          className={clsx(
            "flex flex-col bg-cream-50 text-ink shadow-lift",
            variant === "drawer" ? "h-full" : "max-h-[88dvh] rounded-t-4xl sm:rounded-4xl",
            className,
          )}
        >
          <div className={clsx("flex items-center justify-between gap-4 px-5 pt-5 sm:px-6", hideTitle ? "pb-0" : "pb-3")}>
            <h2 className={clsx("font-display text-2xl font-semibold text-forest-900", hideTitle && "sr-only")}>{title}</h2>
            <button type="button" onClick={onClose} className="ml-auto grid size-10 place-items-center rounded-full bg-white text-forest-900 ring-1 ring-forest-900/10 hover:bg-cream-200" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </div>
      )}
    </dialog>
  );
}
