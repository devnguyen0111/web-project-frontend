"use client";

import { m, type HTMLMotionProps } from "framer-motion";

export type MotionDivProps = HTMLMotionProps<"div">;
export type MotionMainProps = HTMLMotionProps<"main">;
export type MotionSectionProps = HTMLMotionProps<"section">;
export type MotionSpanProps = HTMLMotionProps<"span">;
export type MotionButtonProps = HTMLMotionProps<"button">;

export function MotionDiv(props: MotionDivProps) {
  return <m.div {...props} />;
}

export function MotionMain(props: MotionMainProps) {
  return <m.main {...props} />;
}

export function MotionSection(props: MotionSectionProps) {
  return <m.section {...props} />;
}

export function MotionSpan(props: MotionSpanProps) {
  return <m.span {...props} />;
}

export function MotionButton(props: MotionButtonProps) {
  return <m.button {...props} />;
}
