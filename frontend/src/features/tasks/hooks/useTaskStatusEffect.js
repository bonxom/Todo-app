import { useEffect, useRef } from "react";
import { afterTaskUncovered } from "./afterTaskUncovered";

const STATUS_COLORS = {
  "given-up": "#ef4444",
  "in-progress": "#3b82f6",
  completed: "#22c55e",
};

export function useTaskStatusEffect(task) {
  const ref = useRef(null);
  const id = task._id || task.id;
  const previous = useRef({ id, status: task.status });
  const transition = useRef(null);

  useEffect(() => {
    const changed = previous.current.id === id && previous.current.status !== task.status;
    previous.current = { id, status: task.status };
    const color = STATUS_COLORS[task.status];
    if (changed) transition.current = { id, status: task.status, startedAt: null };
    const current = transition.current;
    if (!current || current.id !== id || current.status !== task.status || !color || !ref.current?.animate) return;

    const highlighted = `inset 0 0 0 2px ${color}`;
    const clear = "inset 0 0 0 2px transparent";
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const frames = reducedMotion
      ? [{ boxShadow: highlighted }, { boxShadow: highlighted }]
      : Array.from({ length: 9 }, (_, index) => ({
          boxShadow: index % 2 === 0 ? clear : highlighted,
          offset: index / 8,
        }));
    let animation;
    const stopWaiting = afterTaskUncovered(ref.current, () => {
      current.startedAt ??= performance.now();
      const elapsed = performance.now() - current.startedAt;
      if (elapsed >= 2000) return;
      animation = ref.current?.animate(frames, { duration: 2000, easing: "linear" });
      if (animation) {
        animation.currentTime = elapsed;
        animation.onfinish = () => {
          if (transition.current === current) transition.current = null;
        };
      }
    });
    return () => {
      stopWaiting();
      animation?.cancel();
    };
  }, [id, task.status]);

  return ref;
}
