import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useEditorState } from "@/hooks/useEditorState";

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
