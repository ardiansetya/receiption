"use client";

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

/**
 * Smooth scrolling global via Lenis (root = window/<html>).
 * anchors: true agar link #fitur/#gratis tetap jalan.
 * Hormati prefers-reduced-motion: lewati Lenis, pakai scroll native.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{ lerp: 0.1, duration: 1.1, smoothWheel: true, anchors: true }}
    >
      {children}
    </ReactLenis>
  );
}
