import { useEffect, useRef, useState } from "react";
import { subscribeTaskStatus } from "./taskStatusTransitions";
import { afterTaskUncovered } from "./afterTaskUncovered";

// Keep a successfully updated card visible until its status feedback finishes,
// even when the refetched server-side filter no longer includes it.
export function useTransitionTasks(tasks = []) {
  const [transitions, setTransitions] = useState({});
  const timers = useRef(new Map());
  useEffect(() => subscribeTaskStatus(({ id, status }) => {
    const task = tasks.find((item) => (item._id || item.id) === id);
    if (!task) return;
    timers.current.get(id)?.();
    setTransitions((current) => ({ ...current, [id]: { ...task, status } }));
    let timer;
    const card = [...document.querySelectorAll("[data-task-id]")].find((element) => element.dataset.taskId === String(id));
    const stopWaiting = afterTaskUncovered(card, () => {
      timer = setTimeout(() => {
      setTransitions((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      timers.current.delete(id);
      }, 2000);
    });
    timers.current.set(id, () => { stopWaiting(); clearTimeout(timer); });
  }), [tasks]);
  useEffect(() => {
    const pendingTimers = timers.current;
    return () => pendingTimers.forEach((cancel) => cancel());
  }, []);

  const visibleIds = new Set(tasks.map((task) => task._id || task.id));
  return [
    ...tasks.map((task) => transitions[task._id || task.id] || task),
    ...Object.values(transitions).filter((task) => !visibleIds.has(task._id || task.id)),
  ];
}
