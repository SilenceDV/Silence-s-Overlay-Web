import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useEditorState } from "@/hooks/useEditorState";
import { defaultProject } from "@/lib/editor/defaults";

it("ignores undo and redo when their history stacks are empty", () => {
  const { result } = renderHook(() => useEditorState());
  const initialState = result.current.state;

  act(() => result.current.api.undo());
  expect(result.current.state).toBe(initialState);
  expect(result.current.state.saveStatus).toBe("saved");

  act(() => result.current.api.redo());
  expect(result.current.state).toBe(initialState);
  expect(result.current.state.saveStatus).toBe("saved");
});

it("marks an imported replacement as dirty so it will be autosaved", () => {
  const { result } = renderHook(() => useEditorState());
  const imported = defaultProject();
  imported.name = "Imported project";

  act(() => result.current.api.replaceProject(imported, true));

  expect(result.current.state.project.name).toBe("Imported project");
  expect(result.current.state.saveStatus).toBe("dirty");
});
