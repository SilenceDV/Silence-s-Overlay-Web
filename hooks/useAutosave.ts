"use client";

import { useEffect, useRef } from "react";
import { AUTOSAVE_DELAY } from "@/lib/editor/constants";
import type { Project } from "@/types/editor";

export function useAutosave(
  project: Project,
  dirty: boolean,
  projectId: string,
  initialVersion: number,
  onSaving: () => void,
  onSaved: () => void,
  onError: (message?: string) => void,
) {
  const version = useRef(initialVersion);
  const requestSequence = useRef(0);
  const callbacks = useRef({ onSaving, onSaved, onError });
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    version.current = initialVersion;
  }, [initialVersion]);

  useEffect(() => {
    callbacks.current = { onSaving, onSaved, onError };
  }, [onSaving, onSaved, onError]);

  useEffect(() => {
    if (!dirtyRef.current) return;

    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      callbacks.current.onSaving();
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ project, version: version.current }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message ?? "Save failed.");
        if (sequence !== requestSequence.current) return;
        version.current = data.version;
        callbacks.current.onSaved();
      } catch (error) {
        if (!controller.signal.aborted && sequence === requestSequence.current) {
          callbacks.current.onError(error instanceof Error ? error.message : undefined);
        }
      }
    }, AUTOSAVE_DELAY);

    return () => {
      requestSequence.current += 1;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [project, projectId]);

  return version;
}
