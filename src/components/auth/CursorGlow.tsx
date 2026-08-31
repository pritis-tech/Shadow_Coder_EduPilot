import { useEffect, useRef, useState } from "react";

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Check for touch/mobile devices or reduced-motion preference
    const isTouch =
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches ||
        window.matchMedia("(hover: none)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0);

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isTouch || prefersReducedMotion) {
      return;
    }

    setEnabled(true);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let currentX = mouseX;
    let currentY = mouseY;
    let isVisible = false;
    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible && glowRef.current) {
        isVisible = true;
        glowRef.current.style.opacity = "1";
      }
    };

    const handleMouseLeave = () => {
      isVisible = false;
      if (glowRef.current) {
        glowRef.current.style.opacity = "0";
      }
    };

    const handleMouseEnter = () => {
      isVisible = true;
      if (glowRef.current) {
        glowRef.current.style.opacity = "1";
      }
    };

    const animate = () => {
      // Fluid lerp (linear interpolation with trailing lag)
      currentX += (mouseX - currentX) * 0.09;
      currentY += (mouseY - currentY) * 0.09;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${currentX - 275}px, ${currentY - 275}px, 0)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    document.addEventListener("mouseenter", handleMouseEnter, { passive: true });
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none transition-opacity duration-300"
    >
      <div
        ref={glowRef}
        className="absolute top-0 left-0 h-[550px] w-[550px] rounded-full opacity-0 transition-opacity duration-300 will-change-transform pointer-events-none blur-3xl
          bg-[radial-gradient(circle,rgba(99,102,241,0.09)_0%,rgba(139,92,246,0.06)_30%,rgba(6,182,212,0.04)_55%,transparent_70%)]
          dark:bg-[radial-gradient(circle,rgba(99,102,241,0.18)_0%,rgba(139,92,246,0.13)_30%,rgba(6,182,212,0.08)_55%,transparent_70%)]"
        style={{ transform: "translate3d(-600px, -600px, 0)" }}
      />
    </div>
  );
}

