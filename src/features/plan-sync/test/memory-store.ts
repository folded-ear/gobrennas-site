import type { ChangeRecord } from "../state";
import type { ChangeStore } from "../store";

/** I keep records in memory, as IndexedDB would, for tests. */
export function memoryStore(initial: readonly ChangeRecord[] = []) {
  const records = new Map(initial.map((it) => [it.key, it]));
  const store: ChangeStore = {
    async apply(put, remove) {
      put.forEach((it) => records.set(it.key, it));
      remove.forEach((it) => records.delete(it));
    },
    async claimFor(userId) {
      for (const [key, it] of records) {
        if (it.userId !== userId) records.delete(key);
      }
      return [...records.values()];
    },
    async reassign(from, to) {
      const moved = [...records.values()]
        .filter((it) => it.pageLoadId === from)
        .map((it) => ({ ...it, pageLoadId: to }));
      moved.forEach((it) => records.set(it.key, it));
      return moved;
    },
    async keysOf(pageLoadId) {
      return [...records.values()]
        .filter((it) => it.pageLoadId === pageLoadId)
        .map((it) => it.key);
    },
    async count(userId) {
      return [...records.values()].filter((it) => it.userId === userId).length;
    },
    close() {},
    open() {},
  };
  return { store, records };
}
