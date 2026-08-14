export const getNextCompletionStatus = (task) => (
  task?.status === 'completed' ? 'in-progress' : 'completed'
);

export const getNextGiveUpStatus = (task) => (
  task?.status === 'given-up' ? 'in-progress' : 'given-up'
);
