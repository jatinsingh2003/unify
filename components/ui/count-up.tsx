// components/ui/count-up.tsx
"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useInView, animate } from "framer-motion";

interface CountUpProps {
  value: number;
  direction?: "up" | "down";
  duration?: number;
  delay?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function CountUp({
  value,
  direction = "up",
  duration = 2,
  delay = 0,
  className,
  formatter = (v) => v.toLocaleString(),
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : 0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionValue, value, {
        duration,
        delay,
        ease: "easeOut",
      });
      return () => controls.stop();
    }
  }, [isInView, value, duration, delay, motionValue]);

  useEffect(() => {
    springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatter(latest);
      }
    });
  }, [springValue, formatter]);

  return <span ref={ref} className={className} />;
}
