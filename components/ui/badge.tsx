import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "default"
  | "accent"
  | "destructive";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "badge-pill badge-neutral",
  success: "badge-pill badge-success",
  warning: "badge-pill badge-warning",
  danger: "badge-pill badge-danger",
  info: "badge-pill badge-info",
  // Backward-compatible aliases.
  default: "badge-pill badge-neutral",
  accent: "badge-pill badge-warning",
  destructive: "badge-pill badge-danger",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <span className={cn(variantClasses[variant], className)} {...props} />;
}

export { Badge };
