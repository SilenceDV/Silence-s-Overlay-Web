"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { AUTOSAVE_DELAY } from "@/lib/editor/constants";
import { SaveCoordinator } from "@/lib/projects/saveCoordinator";
import type { Project } from "@/types/editor";

export function useAutosave(project: Project, dirty: boolean, projectId: string, initialVersion: number,
  onSaving: () => void, onSaved: () => void, onError: (message?: string) => void, paused = false) {
  const revision = useRef(0);
  const callbacks = useRef({ onSaving, onSaved, onError });
  callbacks.current = { onSaving, onSaved, onError };

  const coordinator = useMemo(() => new SaveCoordinator(initialVersion, async (snapshot, version) => {
    const response = await fetch(`/api/projects/${projectId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ project: snapshot, version }) });
    const data = await response.json();
    if (!response.ok) { const error = Object.assign(new Error(data.message ?? "Save failed."), { status: response.status, version: data.version }); throw error; }
    return data;
  }, { saving: () => callbacks.current.onSaving(), saved: (savedRevision) => { if (savedRevision === revision.current) callbacks.current.onSaved(); }, error: (message) => callbacks.current.onError(message) }), [projectId, initialVersion]);

  useEffect(() => { coordinator.setServerVersion(initialVersion); }, [coordinator, initialVersion]);
  useEffect(() => {
    // Clearing `dirty` from the saving callback is only a status update; it does
    // not supersede the snapshot already in flight. Only a new dirty snapshot
    // should advance the revision used to decide whether that save is current.
    if (!dirty || paused) return;

    revision.current += 1;
    const current = revision.current;
    const timer = window.setTimeout(
      () => coordinator.enqueue(project, current),
      AUTOSAVE_DELAY,
    );
    return () => window.clearTimeout(timer);
  }, [coordinator, project, dirty, paused]);
  useEffect(() => {
    // React Strict Mode replays effects in development. Restarting here keeps the
    // replayed setup usable while still preventing work after a real unmount.
    coordinator.start();
    return () => coordinator.stop();
  }, [coordinator]);
  const saveNow = useCallback((snapshot: Project) => coordinator.enqueue(snapshot, revision.current), [coordinator]);
  return { version: coordinator, saveNow };
}
