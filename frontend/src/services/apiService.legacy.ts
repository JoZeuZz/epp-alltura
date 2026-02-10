import { del, get, patch, post, put } from './apiService';

const warnedFunctions = new Set<string>();

const warnLegacy = (functionName: string, endpoint: string) => {
  if (warnedFunctions.has(functionName)) return;
  warnedFunctions.add(functionName);
  if (typeof console !== 'undefined') {
    console.warn(
      `[DEPRECATED] ${functionName} usa superficie legacy (${endpoint}). Migra a endpoints EPP canónicos.`
    );
  }
};

// ============ SCAFFOLD ENDPOINTS (LEGACY) ============

export const getScaffolds = () => {
  warnLegacy('getScaffolds', '/scaffolds');
  return get('/scaffolds');
};

export const getScaffoldById = (id: number) => {
  warnLegacy('getScaffoldById', '/scaffolds/:id');
  return get(`/scaffolds/${id}`);
};

export const getMyScaffolds = () => {
  warnLegacy('getMyScaffolds', '/scaffolds/my-scaffolds');
  return get('/scaffolds/my-scaffolds');
};

export const createScaffold = (formData: FormData) => {
  warnLegacy('createScaffold', '/scaffolds');
  return post('/scaffolds', formData);
};

export const updateScaffold = (id: number, formData: FormData) => {
  warnLegacy('updateScaffold', '/scaffolds/:id');
  return put(`/scaffolds/${id}`, formData);
};

export const updateCardStatus = (id: number, cardStatus: 'green' | 'red') => {
  warnLegacy('updateCardStatus', '/scaffolds/:id/card-status');
  return patch(`/scaffolds/${id}/card-status`, { card_status: cardStatus });
};

export const updateAssemblyStatus = (
  id: number,
  assemblyStatus: 'assembled' | 'disassembled',
  disassemblyImage?: File
) => {
  warnLegacy('updateAssemblyStatus', '/scaffolds/:id/assembly-status');
  const formData = new FormData();
  formData.append('assembly_status', assemblyStatus);
  if (disassemblyImage) {
    formData.append('disassembly_image', disassemblyImage);
  }
  return patch(`/scaffolds/${id}/assembly-status`, formData);
};

export const getScaffoldHistory = (id: number) => {
  warnLegacy('getScaffoldHistory', '/scaffolds/:id/history');
  return get(`/scaffolds/${id}/history`);
};

export const deleteScaffold = (id: number) => {
  warnLegacy('deleteScaffold', '/scaffolds/:id');
  return del(`/scaffolds/${id}`);
};

// ============ PROJECT ASSIGNMENT ENDPOINTS (LEGACY) ============

export const assignClientToProject = (projectId: number, userId: number | null) => {
  warnLegacy('assignClientToProject', '/projects/:id/assign-client');
  return patch(`/projects/${projectId}/assign-client`, { user_id: userId });
};

export const assignSupervisorToProject = (projectId: number, userId: number | null) => {
  warnLegacy('assignSupervisorToProject', '/projects/:id/assign-supervisor');
  return patch(`/projects/${projectId}/assign-supervisor`, { user_id: userId });
};

// ============ DASHBOARD LEGACY ENDPOINT ============

export const getCubicMetersStats = () => {
  warnLegacy('getCubicMetersStats', '/dashboard/cubic-meters');
  return get('/dashboard/cubic-meters');
};

// ============ CLIENT NOTES ENDPOINTS (LEGACY) ============

export const createClientNote = (data: {
  target_type: 'scaffold' | 'project';
  scaffold_id?: number;
  project_id?: number;
  note_text: string;
}) => {
  warnLegacy('createClientNote', '/client-notes');
  return post('/client-notes', data);
};

export const getMyClientNotes = (params?: { unresolved_only?: boolean }) => {
  warnLegacy('getMyClientNotes', '/client-notes/my-notes');
  return get('/client-notes/my-notes', params);
};

export const getScaffoldNotes = (scaffoldId: number) => {
  warnLegacy('getScaffoldNotes', '/scaffolds/:id/notes');
  return get(`/scaffolds/${scaffoldId}/notes`);
};

export const getProjectNotes = (projectId: number) => {
  warnLegacy('getProjectNotes', '/projects/:id/notes');
  return get(`/projects/${projectId}/notes`);
};

export const getUnresolvedProjectNotes = (projectId: number) => {
  warnLegacy('getUnresolvedProjectNotes', '/projects/:id/notes/unresolved');
  return get(`/projects/${projectId}/notes/unresolved`);
};

export const getProjectNoteStats = (projectId: number) => {
  warnLegacy('getProjectNoteStats', '/projects/:id/notes/stats');
  return get(`/projects/${projectId}/notes/stats`);
};

export const updateClientNote = (noteId: number, data: { note_text: string }) => {
  warnLegacy('updateClientNote', '/client-notes/:id');
  return put(`/client-notes/${noteId}`, data);
};

export const resolveClientNote = (noteId: number, data?: { resolution_notes?: string }) => {
  warnLegacy('resolveClientNote', '/client-notes/:id/resolve');
  return put(`/client-notes/${noteId}/resolve`, data);
};

export const reopenClientNote = (noteId: number) => {
  warnLegacy('reopenClientNote', '/client-notes/:id/reopen');
  return put(`/client-notes/${noteId}/reopen`, {});
};

export const deleteClientNote = (noteId: number) => {
  warnLegacy('deleteClientNote', '/client-notes/:id');
  return del(`/client-notes/${noteId}`);
};

// ============ SCAFFOLD MODIFICATIONS ENDPOINTS (LEGACY) ============

export const createScaffoldModification = (
  scaffoldId: number,
  data: { height: number; width: number; length: number; reason?: string }
) => {
  warnLegacy('createScaffoldModification', '/scaffolds/:id/modifications');
  return post(`/scaffolds/${scaffoldId}/modifications`, data);
};

export const getScaffoldModifications = (
  scaffoldId: number,
  status?: 'pending' | 'approved' | 'rejected'
) => {
  warnLegacy('getScaffoldModifications', '/scaffolds/:id/modifications');
  const params = status ? { status } : {};
  return get(`/scaffolds/${scaffoldId}/modifications`, params);
};

export const getPendingModifications = () => {
  warnLegacy('getPendingModifications', '/scaffold-modifications/pending');
  return get('/scaffold-modifications/pending');
};

export const approveModification = (modificationId: number) => {
  warnLegacy('approveModification', '/scaffold-modifications/:id/approve');
  return patch(`/scaffold-modifications/${modificationId}/approve`, {});
};

export const rejectModification = (modificationId: number, rejection_reason: string) => {
  warnLegacy('rejectModification', '/scaffold-modifications/:id/reject');
  return patch(`/scaffold-modifications/${modificationId}/reject`, { rejection_reason });
};

export const deleteModification = (modificationId: number) => {
  warnLegacy('deleteModification', '/scaffold-modifications/:id');
  return del(`/scaffold-modifications/${modificationId}`);
};
