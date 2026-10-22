import type { EntityId, TaskStatus } from "@/shared/types/domain";

type Transition = { id: EntityId; status: TaskStatus };
const listeners = new Set<(transition: Transition) => void>();

export function notifyTaskStatus(id: EntityId, status: TaskStatus) {
  listeners.forEach((listener) => listener({ id, status }));
}

export function subscribeTaskStatus(listener: (transition: Transition) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
