import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Separator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-px w-full bg-[color:var(--border)]", className)} {...props} />;
}

export { Separator };
