"use client";

import { useCallback, useEffect, useRef } from "react";
import { AUTOSAVE_DELAY } from "@/lib/editor/constants";
import { SaveCoordinator } from "@/lib/projects/saveCoordinator";
import type { Project } from "@/types/editor";

export function useAutosave(project: Project, dirty: boolean, projectId: string, initialVersion: number,
  onSaving: () => void, onSaved: () => void, onError: (message?: string) => void) {
  const revision = useRef(0);
  const callbacks = useRef({ onSaving, onSaved, onError });
  const coordinator = useRef<SaveCoordinator | null>(null);
  callbacks.current = { onSaving, onSaved, onError };

  if (!coordinator.current) coordinator.current = new SaveCoordinator(initialVersion, async (snapshot, version) => {
    const response = await fetch(`/api/projects/${projectId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ project: snapshot, version }) });
    const data = await response.json();
    if (!response.ok) { const error = Object.assign(new Error(data.message ?? "Save failed."), { status: response.status, version: data.version }); throw error; }
    return data;
  }, { saving: () => callbacks.current.onSaving(), saved: (savedRevision) => { if (savedRevision === revision.current) callbacks.current.onSaved(); }, error: (message) => callbacks.current.onError(message) });

  useEffect(() => { coordinator.current?.setServerVersion(initialVersion); }, [initialVersion]);
  useEffect(() => { revision.current += 1; if (!dirty) return; const current = revision.current; const timer = window.setTimeout(() => coordinator.current?.enqueue(project, current), AUTOSAVE_DELAY); return () => window.clearTimeout(timer); }, [project, dirty]);
  useEffect(() => () => coordinator.current?.stop(), []);
  const saveNow = useCallback((snapshot: Project) => coordinator.current!.enqueue(snapshot, revision.current), []);
  return { version: coordinator.current, saveNow };
}
