"use client";

import { useEffect } from "react";
import { AUTOSAVE_DELAY } from "@/lib/editor/constants";
import { serializeProject } from "@/lib/editor/serialization";
import type { Project } from "@/types/editor";

export const LOCAL_PROJECT_KEY = "silence-overlay-project";

export function useAutosave(
  project: Project,
  dirty: boolean,
  onSaved: () => void,
  onError: () => void,
) {
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_PROJECT_KEY, serializeProject(project));
        onSaved();
      } catch {
        onError();
      }
    }, AUTOSAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [project, dirty, onSaved, onError]);
}
