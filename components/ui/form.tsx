import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function FormField({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5", className)} {...props} />;
}

function FormDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-[color:var(--muted-foreground)]", className)} {...props} />;
}

function FormMessage({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs font-medium text-[color:var(--destructive)]", className)} {...props} />;
}

export { FormDescription, FormField, FormMessage };
