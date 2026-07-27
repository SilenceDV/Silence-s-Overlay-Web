import type { Project } from "@/types/editor";

export type SaveResult = { version: number };
export type SaveRequest = (project: Project, version: number) => Promise<SaveResult>;

/** Serializes every manual and automatic save for one mounted editor. */
export class SaveCoordinator {
  private version: number;
  private desired: { project: Project; revision: number } | null = null;
  private running: Promise<void> | null = null;
  private stopped = false;

  constructor(
    version: number,
    private readonly request: SaveRequest,
    private readonly callbacks: {
      saving: () => void;
      saved: (revision: number) => void;
      error: (message: string) => void;
    },
  ) { this.version = version; }

  get serverVersion() { return this.version; }
  setServerVersion(version: number) { this.version = version; }

  enqueue(project: Project, revision: number) {
    if (this.stopped) return Promise.resolve();
    this.desired = { project: structuredClone(project), revision };
    if (!this.running) this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }

  stop() { this.stopped = true; }

  private async drain() {
    while (this.desired && !this.stopped) {
      const item = this.desired;
      this.desired = null;
      this.callbacks.saving();
      try {
        const result = await this.saveWithRetry(item.project);
        this.version = result.version; // Never discard a committed server version.
        if (!this.desired) this.callbacks.saved(item.revision);
      } catch (error) {
        this.callbacks.error(error instanceof Error ? error.message : "Save failed.");
        return;
      }
    }
  }

  private async saveWithRetry(project: Project) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { return await this.request(project, this.version); }
      catch (error) {
        const value = error as Error & { status?: number; version?: number };
        if (value.status === 409 && value.version) { this.version = value.version; continue; }
        if (!value.status || value.status >= 500) {
          if (attempt < 2) { await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt)); continue; }
        }
        throw error;
      }
    }
    throw new Error("Save failed after retries.");
  }
}
