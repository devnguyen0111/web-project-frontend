"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const baseTransition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
} as const;

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  const transition = shouldReduceMotion
    ? { duration: 0.15, ease: "linear" as const }
    : baseTransition;

  const initial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 };
  const animate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
  const exit = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={pathname}
        initial={initial}
        animate={animate}
        exit={exit}
        transition={transition}
        style={{ willChange: shouldReduceMotion ? "opacity" : "opacity, transform" }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
