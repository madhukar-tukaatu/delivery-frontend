"use client";

import { useEffect, useRef } from "react";

// Content remains visible without JavaScript; motion is progressive enhancement.
export default function Reveal({ children, className = "", delay = 0, direction = "up" }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || !window.IntersectionObserver || !element.animate) return;
    let animation;
    const transforms = {
      up: "translateY(16px)", down: "translateY(-16px)",
      left: "translateX(16px)", right: "translateX(-16px)", none: "none",
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (media.matches) return;
      animation = element.animate([
        { opacity: 0.65, transform: transforms[direction] || transforms.up },
        { opacity: 1, transform: "none" },
      ], { duration: 450, delay, easing: "cubic-bezier(.22,1,.36,1)" });
    }, { threshold: 0.08 });
    const cancelMotion = () => { if (media.matches) animation?.cancel(); };
    media.addEventListener?.("change", cancelMotion);
    observer.observe(element);
    return () => {
      observer.disconnect();
      animation?.cancel();
      media.removeEventListener?.("change", cancelMotion);
    };
  }, [delay, direction]);

  return <div ref={ref} className={className}>{children}</div>;
}
