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

it("records one history boundary for a continuous pointer edit", () => {
  const { result } = renderHook(() => useEditorState());
  const layerId = result.current.state.selectedLayerId!;
  act(() => {
    result.current.api.checkpoint();
    result.current.api.updateLayerLive(layerId, { x: 61 });
    result.current.api.updateLayerLive(layerId, { x: 72 });
  });
  expect(result.current.layer?.x).toBe(72);
  act(() => result.current.api.undo());
  expect(result.current.layer?.x).toBe(50);
});

it("duplicates a slide after its source with fresh IDs and selects the copy", () => {
  const { result } = renderHook(() => useEditorState());
  const source = result.current.slide;
  act(() => result.current.api.duplicateSlide(source.id));
  expect(result.current.state.project.slides).toHaveLength(2);
  const copy = result.current.state.project.slides[1];
  expect(copy.name).toBe("New Gift Duplicate");
  expect(copy.id).not.toBe(source.id);
  expect(copy.layers[0].id).not.toBe(source.layers[0].id);
  expect(result.current.state.currentSlideId).toBe(copy.id);
  expect(result.current.state.selectedLayerId).toBe(copy.layers[0].id);
});

it("keeps the editor API stable across project mutations",()=>{
  const {result}=renderHook(()=>useEditorState());
  const api=result.current.api;
  act(()=>api.updateLayer(result.current.state.selectedLayerId!,{x:63}));
  expect(result.current.api).toBe(api);
});

