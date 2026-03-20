import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function GlowDivider({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glow-divider", className)} aria-hidden="true" {...props} />;
}

export { GlowDivider };
