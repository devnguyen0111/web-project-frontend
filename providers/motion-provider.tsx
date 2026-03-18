"use client";

import {
  LazyMotion,
  MotionConfig,
  domAnimation,
} from "framer-motion";
import type { ReactNode } from "react";

const loadMotionFeatures = async () => domAnimation;

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
