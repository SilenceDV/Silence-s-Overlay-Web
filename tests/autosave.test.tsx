import React, { StrictMode, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAutosave } from "@/hooks/useAutosave";
import { AUTOSAVE_DELAY } from "@/lib/editor/constants";
import { defaultProject } from "@/lib/editor/defaults";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("keeps the save request alive when onSaving clears the dirty status", async () => {
  vi.useFakeTimers();
  let resolveFetch!: (response: Response) => void;
  let requestSignal: AbortSignal | undefined;
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
    requestSignal = init?.signal ?? undefined;
    return new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
  });
  const onSaved = vi.fn();
  const project = defaultProject();

  const { rerender } = renderHook(
    ({ dirty }) =>
      useAutosave(project, dirty, "project-1", 1, () => rerender({ dirty: false }), onSaved, vi.fn()),
    { initialProps: { dirty: true } },
  );

  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
  });

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(requestSignal).toBeUndefined(); // serialized saves are never aborted

  await act(async () => {
    resolveFetch(new Response(JSON.stringify({ version: 2 }), { status: 200 }));
  });

  expect(onSaved).toHaveBeenCalledOnce();
});

it("continues autosaving after Strict Mode replays the lifecycle effect", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ version: 2 }), { status: 200 }),
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StrictMode>{children}</StrictMode>
  );

  renderHook(
    () => useAutosave(defaultProject(), true, "project-1", 1, vi.fn(), vi.fn(), vi.fn()),
    { wrapper },
  );

  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
  });

  expect(fetchMock).toHaveBeenCalledOnce();
});

it("uses a new coordinator when the project id changes", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ version: 2 }), { status: 200 }),
  );
  const project = defaultProject();
  const { rerender } = renderHook(
    ({ projectId }) => useAutosave(project, true, projectId, 1, vi.fn(), vi.fn(), vi.fn()),
    { initialProps: { projectId: "project-1" } },
  );

  rerender({ projectId: "project-2" });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY);
  });

  expect(fetchMock).toHaveBeenCalledOnce();
  expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-2", expect.any(Object));
});

it("does not start autosave while a pointer interaction is active", async () => {
  vi.useFakeTimers();
  const fetchMock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({version:2}),{status:200}));
  const project=defaultProject();
  const {rerender}=renderHook(({paused})=>useAutosave(project,true,"project-1",1,vi.fn(),vi.fn(),vi.fn(),paused),{initialProps:{paused:true}});
  await act(async()=>{await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY*2)});
  expect(fetchMock).not.toHaveBeenCalled();
  rerender({paused:false});
  await act(async()=>{await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY)});
  expect(fetchMock).toHaveBeenCalledOnce();
});
