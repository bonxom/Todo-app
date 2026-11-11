export const layoutDayTasks = (tasks, day, pixelsPerMinute = 1) => {
  if (!Array.isArray(tasks) || tasks.length === 0 || !day) return [];

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const parsed = [];

  for (const task of tasks) {
    if (!task || !task.dueDate) continue;
    const dueDate = new Date(task.dueDate);
    if (Number.isNaN(dueDate.getTime())) continue;

    const dueDayStart = new Date(dueDate);
    dueDayStart.setHours(0, 0, 0, 0);
    if (dueDayStart.getTime() !== dayStart.getTime()) {
      continue;
    }

    const endMinute = dueDate.getHours() * 60 + dueDate.getMinutes();

    let startMinute;
    let isStartClipped = false;
    if (!task.startDate) {
      startMinute = 1;
    } else {
      const startDate = new Date(task.startDate);
      if (Number.isNaN(startDate.getTime())) {
        startMinute = 1;
      } else if (startDate.getTime() < dayStart.getTime()) {
        startMinute = 0;
        isStartClipped = true;
      } else {
        startMinute = startDate.getHours() * 60 + startDate.getMinutes();
      }
    }

    const isReversedOrZero =
      startMinute >= endMinute ||
      (task.startDate && new Date(task.startDate) > dueDate);
    let top;
    let height;

    if (isReversedOrZero) {
      height = 28;
      const rawTop = endMinute * pixelsPerMinute;
      top = Math.max(0, Math.min(rawTop, 1440 * pixelsPerMinute - height));
    } else {
      const rawHeight = (endMinute - startMinute) * pixelsPerMinute;
      height = Math.max(28, rawHeight);
      const rawTop = startMinute * pixelsPerMinute;
      top = Math.max(0, Math.min(rawTop, 1440 * pixelsPerMinute - height));
    }

    parsed.push({
      task,
      startMinute,
      endMinute,
      top,
      height,
      isReversedOrZero,
      isStartClipped,
    });
  }

  if (parsed.length === 0) return [];

  parsed.sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top;
    return b.top + b.height - (a.top + a.height);
  });

  const clusters = [];
  let currentCluster = [];
  let currentClusterMaxEnd = -Infinity;

  for (const item of parsed) {
    const itemEnd = item.top + item.height;
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      currentClusterMaxEnd = itemEnd;
    } else if (item.top < currentClusterMaxEnd) {
      currentCluster.push(item);
      currentClusterMaxEnd = Math.max(currentClusterMaxEnd, itemEnd);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      currentClusterMaxEnd = itemEnd;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const results = [];

  for (const cluster of clusters) {
    const laneEnds = [];

    for (const item of cluster) {
      let assignedLane = -1;
      for (let l = 0; l < laneEnds.length; l++) {
        if (laneEnds[l] <= item.top) {
          assignedLane = l;
          laneEnds[l] = item.top + item.height;
          break;
        }
      }
      if (assignedLane === -1) {
        assignedLane = laneEnds.length;
        laneEnds.push(item.top + item.height);
      }
      item.lane = assignedLane;
    }

    const laneCount = laneEnds.length;
    for (const item of cluster) {
      item.laneCount = laneCount;
      results.push(item);
    }
  }

  return results;
};
