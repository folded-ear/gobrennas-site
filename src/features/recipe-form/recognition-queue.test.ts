import { describe, expect, it, vi } from "vitest";
import type { IngredientRecognition } from "./ingredient-recognition";
import { createRecognitionQueue } from "./recognition-queue";

function deferred() {
  let resolve!: (value: IngredientRecognition) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<IngredientRecognition>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const result: IngredientRecognition = { raw: "flour", cursor: 5, ranges: [] };

describe("recognition queue", () => {
  it("limits concurrency to three and prioritizes the active row over waiting background work", async () => {
    const queue = createRecognitionQueue();
    const jobs = Array.from({ length: 5 }, deferred);
    const started: number[] = [];
    const requests = jobs.map((job, index) =>
      queue.run(String(index), new AbortController().signal, () => {
        started.push(index);
        return job.promise;
      }),
    );
    await Promise.resolve();
    expect(started).toEqual([0, 1, 2]);
    queue.focus("4");
    jobs[0].resolve(result);
    await requests[0];
    await vi.waitFor(() => expect(started).toEqual([0, 1, 2, 4]));
    jobs.forEach((job) => job.resolve(result));
    await Promise.all(requests);
    expect(started).toEqual([0, 1, 2, 4, 3]);
  });

  it("removes canceled waiting work and holds a running row's slot until settlement", async () => {
    const queue = createRecognitionQueue();
    const first = deferred();
    const firstController = new AbortController();
    const old = queue.run("row", firstController.signal, () => first.promise);
    const canceledController = new AbortController();
    const neverRun = vi.fn(async () => result);
    const canceled = queue.run("row", canceledController.signal, neverRun);
    const rejected = expect(canceled).rejects.toMatchObject({
      name: "AbortError",
    });
    canceledController.abort();
    await rejected;
    const runNext = vi.fn(async () => result);
    const next = queue.run("row", new AbortController().signal, runNext);
    firstController.abort();
    await Promise.resolve();
    expect(runNext).not.toHaveBeenCalled();
    first.resolve(result);
    await old;
    await next;
    expect(runNext).toHaveBeenCalledOnce();
    expect(neverRun).not.toHaveBeenCalled();
  });

  it("continues after a failed row without discarding another row's result", async () => {
    const queue = createRecognitionQueue();
    const failed = queue.run(
      "flour",
      new AbortController().signal,
      async () => {
        throw new Error("offline");
      },
    );
    const succeeded = queue.run(
      "salt",
      new AbortController().signal,
      async () => result,
    );
    await expect(failed).rejects.toThrow("offline");
    await expect(succeeded).resolves.toEqual(result);
  });
});
