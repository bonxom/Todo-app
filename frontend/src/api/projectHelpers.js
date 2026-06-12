export const normalizeEntityResponse = (payload, entityKey) => {
  if (payload && typeof payload === 'object' && payload[entityKey]) {
    return payload[entityKey];
  }

  return payload;
};

export const normalizeCollectionResponse = (payload, collectionKey) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object' && Array.isArray(payload[collectionKey])) {
    return payload[collectionKey];
  }

  return [];
};

export const buildTaskMutationPayload = (taskData = {}) => {
  const payload = { ...taskData };

  if (payload.projectId === '') {
    payload.projectId = null;
  }

  if (payload.projectId === undefined) {
    delete payload.projectId;
  }

  return payload;
};

export const normalizeProject = (payload) => normalizeEntityResponse(payload, 'project');

export const normalizeProjects = (payload) => normalizeCollectionResponse(payload, 'projects');

export const normalizeProjectTasks = (payload) => {
  const normalizedPayload = payload && typeof payload === 'object' ? payload : {};

  return {
    ...normalizedPayload,
    project: normalizedPayload.project ? normalizeProject(normalizedPayload.project) : null,
    tasks: normalizeCollectionResponse(normalizedPayload.tasks, 'tasks'),
  };
};
