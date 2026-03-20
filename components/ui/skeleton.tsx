import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-xs)] bg-[color:color-mix(in_oklab,var(--muted),transparent_6%)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
