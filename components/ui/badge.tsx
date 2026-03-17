import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "accent" | "destructive";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "badge-pill badge-default",
  accent: "badge-pill badge-accent",
  destructive: "badge-pill badge-destructive",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <span className={cn(variantClasses[variant], className)} {...props} />;
}

export { Badge };
