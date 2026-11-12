import { useCallback, useEffect, useRef, useState } from "react";
import { getResizeCandidate, getResizeRange } from "./timelineResize";

export default function useTimelineResize({
  scrollRef,
  pixelsPerMinute,
  interval,
  onSave,
  currentDate,
}) {
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const gesture = useRef(null);
  const frame = useRef(null);
  const busy = useRef(false);
  const suppressClickUntil = useRef(0);
  const mounted = useRef(true);

  const stopFrame = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  const cancel = useCallback(() => {
    const active = gesture.current;
    gesture.current = null;
    stopFrame();
    if (active?.element.hasPointerCapture?.(active.pointerId))
      active.element.releasePointerCapture(active.pointerId);
    setPreview(null);
    suppressClickUntil.current = Date.now() + 300;
  }, [stopFrame]);
  useEffect(() => {
    mounted.current = true;
    const keydown = (event) => {
      if (event.key === "Escape" && gesture.current) {
        event.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      mounted.current = false;
      if (gesture.current) cancel();
      stopFrame();
      window.removeEventListener("keydown", keydown);
    };
  }, [currentDate, interval, cancel, stopFrame]);

  const save = async (task, range) => {
    if (!range || !onSave || busy.current) {
      setPreview(null);
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(false);
    setPreview({ taskId: task._id || task.id, ...range });
    try {
      await onSave(task._id || task.id, { [range.field]: range.value });
    } catch {
      if (mounted.current) setError(true);
    } finally {
      busy.current = false;
      if (mounted.current) {
        setSaving(false);
        setPreview(null);
      }
    }
  };
  const update = () => {
    const active = gesture.current;
    if (!active || !active.moved) return;
    const scrollDelta = (scrollRef.current?.scrollTop || 0) - active.downScroll;
    active.range = getResizeRange(
      active.task,
      active.edge,
      getResizeCandidate(
        active.originMinute,
        active.clientY - active.downY,
        pixelsPerMinute,
        scrollDelta,
      ),
      interval,
    );
    setPreview(
      active.range
        ? { taskId: active.task._id || active.task.id, ...active.range }
        : null,
    );
  };
  const autoScroll = () => {
    const active = gesture.current,
      container = scrollRef.current;
    if (!active || !container) return;
    if (active.moved) {
      const rect = container.getBoundingClientRect();
      const speed =
        active.clientY > rect.bottom - 32
          ? 10
          : active.clientY < rect.top + 100
            ? -10
            : 0;
      if (speed) {
        container.scrollTop += speed;
        update();
      }
    }
    frame.current = requestAnimationFrame(autoScroll);
  };
  const bind = (task, edge, originMinute) => ({
    onPointerDown: (event) => {
      if (event.button !== 0 || busy.current || !onSave) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus({ preventScroll: true });
      gesture.current = {
        task,
        edge,
        originMinute,
        downY: event.clientY,
        clientY: event.clientY,
        downScroll: scrollRef.current?.scrollTop || 0,
        pointerId: event.pointerId,
        element: event.currentTarget,
        range: null,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setError(false);
      frame.current = requestAnimationFrame(autoScroll);
    },
    onPointerMove: (event) => {
      const active = gesture.current;
      if (!active || active.pointerId !== event.pointerId) return;
      event.stopPropagation();
      active.clientY = event.clientY;
      if (Math.abs(active.clientY - active.downY) >= 3) active.moved = true;
      update();
    },
    onPointerUp: (event) => {
      const active = gesture.current;
      if (!active || active.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      active.clientY = event.clientY;
      update();
      gesture.current = null;
      stopFrame();
      if (active.element.hasPointerCapture(event.pointerId))
        active.element.releasePointerCapture(event.pointerId);
      suppressClickUntil.current = Date.now() + 300;
      if (active.moved) void save(active.task, active.range);
    },
    onPointerCancel: cancel,
    onLostPointerCapture: () => {
      if (gesture.current) cancel();
    },
    onClick: (event) => {
      event.preventDefault();
      event.stopPropagation();
    },
    onKeyDown: (event) => {
      if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      if (busy.current) return;
      void save(
        task,
        getResizeRange(
          task,
          edge,
          originMinute + (event.key === "ArrowUp" ? -interval : interval),
          interval,
        ),
      );
    },
  });
  return {
    preview,
    saving,
    error,
    bind,
    blockClick: () => busy.current || Date.now() < suppressClickUntil.current,
  };
}
