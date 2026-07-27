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
