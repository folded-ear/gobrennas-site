export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const onBeforeInstallPrompt = (event: Event) => {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  notify();
};

/** I start holding the browser's install prompt; my result stops it. */
export function captureInstallPrompt() {
  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  return () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    deferred = null;
    notify();
  };
}

export const subscribeToInstallPrompt = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const hasInstallPrompt = () => deferred !== null;

/** I show the held browser prompt. It can be shown only once. */
export async function showInstallPrompt() {
  const event = deferred;
  deferred = null;
  notify();
  await event?.prompt();
}
