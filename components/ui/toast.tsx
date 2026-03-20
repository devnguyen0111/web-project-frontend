import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant;
}

const variantClass: Record<ToastVariant, string> = {
  default: "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--card-foreground)]",
  success: "border-[color:color-mix(in_oklab,var(--accent),transparent_45%)] bg-[color:color-mix(in_oklab,var(--accent),transparent_86%)] text-[color:var(--foreground)]",
  error: "border-[color:color-mix(in_oklab,var(--destructive),transparent_42%)] bg-[color:color-mix(in_oklab,var(--destructive),transparent_88%)] text-[color:var(--foreground)]",
};

function Toast({ className, variant = "default", ...props }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-[var(--radius-sm)] border px-4 py-3 text-sm shadow-[var(--shadow-sm)]",
        variantClass[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Toast };
