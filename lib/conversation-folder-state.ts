export interface ConversationFolder {
  id: string;
  name: string;
  projectRoot: string;
  collapsed: boolean;
}

export interface ConversationFolderState {
  folders: ConversationFolder[];
  assignments: Record<string, string | null>;
}

interface FolderableSession {
  id: string;
  parentSessionId?: string;
}

const STORAGE_KEY = "pi-web:conversation-folders";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function emptyConversationFolderState(): ConversationFolderState {
  return { folders: [], assignments: {} };
}

function parseConversationFolderState(value: unknown): ConversationFolderState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return emptyConversationFolderState();
  }

  const candidate = value as Partial<ConversationFolderState>;
  const folders = Array.isArray(candidate.folders)
    ? candidate.folders.filter((folder): folder is ConversationFolder => (
        typeof folder === "object"
        && folder !== null
        && typeof folder.id === "string"
        && typeof folder.name === "string"
        && typeof folder.projectRoot === "string"
        && typeof folder.collapsed === "boolean"
      ))
    : [];
  const assignments: Record<string, string | null> = {};
  if (typeof candidate.assignments === "object" && candidate.assignments !== null && !Array.isArray(candidate.assignments)) {
    for (const [sessionId, folderId] of Object.entries(candidate.assignments)) {
      if (typeof folderId === "string" || folderId === null) assignments[sessionId] = folderId;
    }
  }
  return { folders, assignments };
}

export function loadConversationFolderState(
  storage: StorageLike | null = getBrowserStorage(),
): ConversationFolderState {
  if (!storage) return emptyConversationFolderState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? parseConversationFolderState(JSON.parse(raw) as unknown) : emptyConversationFolderState();
  } catch {
    return emptyConversationFolderState();
  }
}

export function saveConversationFolderState(
  state: ConversationFolderState,
  storage: StorageLike | null = getBrowserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Browser storage is best-effort.
  }
}

export function deleteConversationFolder(
  state: ConversationFolderState,
  folderId: string,
): ConversationFolderState {
  const assignments = { ...state.assignments };
  for (const [sessionId, assignedFolderId] of Object.entries(assignments)) {
    if (assignedFolderId === folderId) assignments[sessionId] = null;
  }
  return {
    folders: state.folders.filter((folder) => folder.id !== folderId),
    assignments,
  };
}

export function resolveConversationFolderAssignments(
  sessions: FolderableSession[],
  assignments: Record<string, string | null>,
  validFolderIds: ReadonlySet<string>,
): Map<string, string | null> {
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  const resolved = new Map<string, string | null>();

  const resolve = (sessionId: string, visiting: Set<string>): string | null => {
    const cached = resolved.get(sessionId);
    if (cached !== undefined || resolved.has(sessionId)) return cached ?? null;
    if (visiting.has(sessionId)) return null;
    visiting.add(sessionId);

    let folderId: string | null = null;
    if (Object.hasOwn(assignments, sessionId)) {
      const explicit = assignments[sessionId];
      folderId = explicit !== null && validFolderIds.has(explicit) ? explicit : null;
    } else {
      const parentId = sessionsById.get(sessionId)?.parentSessionId;
      if (parentId && sessionsById.has(parentId)) folderId = resolve(parentId, visiting);
    }

    visiting.delete(sessionId);
    resolved.set(sessionId, folderId);
    return folderId;
  };

  for (const session of sessions) resolve(session.id, new Set());
  return resolved;
}
