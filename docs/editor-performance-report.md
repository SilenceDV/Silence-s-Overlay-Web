# Editor performance verification

## Root cause

Every drag and resize `pointermove` dispatched `updateLayerLive`. The reducer then
`structuredClone`d the complete project and changed `updatedAt`. The changed slide
array recreated the editor API object, which rerendered the complete editor and
restarted effects, including autosave scheduling and keyboard listener setup. Resize
handle events could also bubble into the layer move handler. The cost accumulated
rapidly under a continuous pointer stream.

## Fix

- Pointer coordinates are kept in the individual stage layer and painted at most once
  per animation frame.
- A drag or resize commits one project mutation and one history entry on pointer release
  or cancellation. Pointer moves do not clone or normalize the project.
- Resize handle events do not bubble into the layer move handler.
- The editor API has stable identity and reads current state through a ref.
- Autosave scheduling is paused for the full interaction and resumes after release.
  `SaveCoordinator` continues to serialize requests, so saves cannot overlap.
- Pending pointer animation frames and both rotation timers (including the legacy
  180 ms swap timer) are cleared on cancellation, stop, and unmount.

## Before and after evidence

The same optimized production build, project, browser session, and editor route were
used for the direct comparison.

| Measurement | Before | After |
| --- | ---: | ---: |
| Time for production editor to reach a stable DOM snapshot | about 590,000 ms | 19,604 ms |
| Project mutations during 3,600 pointer moves | 3,600 | 0 |
| Full-project clones during 3,600 pointer moves | 3,600 | 0 |
| History commits during one interaction | first move plus live mutations | exactly 1, on release |
| Autosave requests during active pointer stress | timer repeatedly rescheduled | 0 |

The before trace showed a full editor render path and complete project clone per
pointer event. The after trace keeps those updates local to `StageLayer`; the project,
sidebars, editor API, history, and autosave inputs remain unchanged until release.

## Stress and soak results

- A real-time pointer test ran for 60.029 seconds with more than 1,800 timed pointer
  updates. It passed with one final `updateLayer` call, zero `updateLayerLive` calls,
  and zero separate checkpoint calls.
- A 3,600-event equivalent stress test completed in 199 ms with the same one-commit
  boundary.
- The production editor remained open and active for more than 10 minutes with slide
  rotation running. It remained responsive at the end of the soak.
- The production Node process was unchanged at 1.90625 CPU seconds and 146,251,776
  bytes private memory from the initial sample to the final sample. Working set moved
  from 133,681,152 to 133,828,608 bytes (+147,456 bytes), and handles remained at 251.
- The shared Chrome session (17 processes and other open tabs included) moved from
  457.53125 to 457.8125 aggregate CPU seconds; private memory moved from 1,762,152,448
  to 1,764,311,040 bytes, and handles fell from 9,861 to 9,851. These browser-wide
  figures are coarse corroboration, not an isolated tab measurement.
- The editor render counter reached 130 during the soak because automatic slide
  rotation was deliberately active; render cadence remained bounded and did not
  accelerate. No save request was emitted during the pointer stress.

## Automated coverage

`tests/pointerPerformance.test.tsx` contains the fast 3,600-event regression test and
the gated real-time 60-second test (`RUN_LONG_PERF=1`). Autosave coverage verifies that
no timer fires while an interaction is active and that exactly one save is scheduled
after it ends. Editor-state coverage verifies stable API identity across mutations.

