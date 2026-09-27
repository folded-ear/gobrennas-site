import type { IngredientRecognition } from "./ingredient-recognition";

type Job = {
  clientId: string;
  signal: AbortSignal;
  run: () => Promise<IngredientRecognition>;
  resolve: (result: IngredientRecognition) => void;
  reject: (error: unknown) => void;
  onAbort: () => void;
};

/** One editor's queue. Aborted running jobs retain their slot until settled. */
export function createRecognitionQueue() {
  const waiting: Job[] = [];
  const running = new Set<string>();
  let activeId: string | undefined;

  function drain() {
    while (running.size < 3) {
      const eligible = (job: Job) => !running.has(job.clientId);
      const active = waiting.findIndex(
        (job) => eligible(job) && job.clientId === activeId,
      );
      const index = active >= 0 ? active : waiting.findIndex(eligible);
      if (index < 0) return;
      const [job] = waiting.splice(index, 1);
      job.signal.removeEventListener("abort", job.onAbort);
      running.add(job.clientId);
      void Promise.resolve()
        .then(job.run)
        .then(job.resolve, job.reject)
        .finally(() => {
          running.delete(job.clientId);
          drain();
        });
    }
  }

  return {
    focus(clientId: string | undefined) {
      activeId = clientId;
    },
    run(
      clientId: string,
      signal: AbortSignal,
      run: Job["run"],
    ): Promise<IngredientRecognition> {
      return new Promise((resolve, reject) => {
        if (signal.aborted) {
          reject(new DOMException("Recognition canceled", "AbortError"));
          return;
        }
        const job: Job = {
          clientId,
          signal,
          run,
          resolve,
          reject,
          onAbort: () => {
            const index = waiting.indexOf(job);
            if (index >= 0) waiting.splice(index, 1);
            reject(new DOMException("Recognition canceled", "AbortError"));
          },
        };
        signal.addEventListener("abort", job.onAbort, { once: true });
        waiting.push(job);
        drain();
      });
    },
  };
}

export type RecognitionQueue = ReturnType<typeof createRecognitionQueue>;
