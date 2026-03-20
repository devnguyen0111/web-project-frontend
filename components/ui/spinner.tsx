import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "h-5 w-5 border-2",
  md: "h-7 w-7 border-[3px]",
  lg: "h-9 w-9 border-4",
} as const;

interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: keyof typeof sizeMap;
  label?: string;
}

function Spinner({ className, size = "md", label = "Loading", ...props }: SpinnerProps) {
  return (
    <span className={cn("inline-flex items-center justify-center text-[color:var(--foreground)]", className)} {...props}>
      <span role="status" aria-label={label} className={cn("spinner spin", sizeMap[size])}>
        <span className="sr-only">{label}</span>
      </span>
    </span>
  );
}

export { Spinner };
