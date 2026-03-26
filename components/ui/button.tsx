"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] border border-transparent text-sm font-semibold transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-200 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)] focus-visible:ring-[var(--focus-ring)]",
        secondary:
          "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--focus-ring)]",
        ghost:
          "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-[var(--focus-ring)]",
        danger:
          "bg-[var(--danger)] text-white hover:brightness-95 focus-visible:ring-[var(--danger-soft)]",
        // Backward-compatible aliases.
        default:
          "bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)] focus-visible:ring-[var(--focus-ring)]",
        outline:
          "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--focus-ring)]",
        destructive:
          "bg-[var(--danger)] text-white hover:brightness-95 focus-visible:ring-[var(--danger-soft)]",
        link: "text-[var(--primary)] underline-offset-4 hover:underline focus-visible:ring-[var(--focus-ring)]",
      },
      size: {
        sm: "min-h-11 px-3 text-sm",
        md: "min-h-11 px-4 text-sm",
        lg: "min-h-11 px-5 text-base",
        icon: "h-11 w-11 min-h-11 px-0",
        // Backward-compatible aliases.
        default: "min-h-11 px-4 text-sm",
        xs: "min-h-11 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  children,
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        <span className="spinner spin inline-block h-4 w-4 border-2" aria-hidden="true" />
      ) : null}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
