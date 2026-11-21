import { useEffect, useRef } from "react";

export default function Reveal({ children, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;

    const targets = [...root.querySelectorAll("[data-reveal]")];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );
    root.classList.add("reveal-ready");
    targets.forEach((target) => observer.observe(target));

    // Keyboard navigation must never land on an invisible control.
    const revealFocused = (event) => {
      const target = event.target.closest("[data-reveal]");
      if (target) {
        target.classList.add("is-revealed");
        observer.unobserve(target);
      }
    };
    root.addEventListener("focusin", revealFocused);
    return () => {
      observer.disconnect();
      root.removeEventListener("focusin", revealFocused);
      root.classList.remove("reveal-ready");
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`landing-reveal [&_[data-reveal]]:[--reveal-offset:clamp(28px,5vw,76px)] [&_[data-reveal]]:[--reveal-from:calc(-1_*_var(--reveal-offset))] [&_[data-reveal=right]]:[--reveal-from:var(--reveal-offset)] [@media(prefers-reduced-motion:reduce)]:opacity-[1]! [@media(prefers-reduced-motion:reduce)]:[transform:none]! ${className}`}
    >
      {children}
    </div>
  );
}
