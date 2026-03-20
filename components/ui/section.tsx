import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("section-shell py-10 md:py-14", className)} {...props} />;
}

export { Section };
