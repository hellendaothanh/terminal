import type { BrowserWindow } from 'electron';

/** Shared context passed to every IPC registration module. */
export interface IpcContext {
  /** Returns the current main window (may be null during shutdown). */
  getWindow: () => BrowserWindow | null;
}
