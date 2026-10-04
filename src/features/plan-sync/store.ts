import { DBSchema, IDBPDatabase, openDB } from "idb";
import type { ChangeRecord } from "./state";

/** I keep changes across page loads, for the page loads of one browser. */
export type ChangeStore = {
  /** I put and remove records in one transaction. */
  apply(put: readonly ChangeRecord[], remove: readonly string[]): Promise<void>;
  /** I delete every other user's records, giving the given user's. */
  claimFor(userId: string): Promise<readonly ChangeRecord[]>;
  /**
   * I move one page load's records to another in one transaction, giving
   * them as moved.
   */
  reassign(from: string, to: string): Promise<readonly ChangeRecord[]>;
  /** I give the keys of a page load's records. */
  keysOf(pageLoadId: string): Promise<readonly string[]>;
  /** I count a user's records, whichever page load holds them. */
  count(userId: string): Promise<number>;
  close(): void;
  open(): void;
};

interface ChangesDb extends DBSchema {
  changes: { key: string; value: ChangeRecord };
}

const DB_NAME = "plan-sync";
const DB_VERSION = 1;
const STORE = "changes";

/**
 * I keep changes in IndexedDB. When a newer build needs to upgrade the
 * database, I tell onBlocking, and should be closed.
 */
export function createIdbChangeStore(onBlocking: () => void): ChangeStore {
  let db: Promise<IDBPDatabase<ChangesDb>> | null = null;
  const open = () =>
    (db ??= openDB<ChangesDb>(DB_NAME, DB_VERSION, {
      upgrade: (upgrading) =>
        void upgrading.createObjectStore(STORE, { keyPath: "key" }),
      blocking: onBlocking,
    }));
  const all = async () => (await open()).getAll(STORE);
  return {
    async apply(put, remove) {
      const tx = (await open()).transaction(STORE, "readwrite");
      await Promise.all([
        ...put.map((it) => tx.store.put(it)),
        ...remove.map((it) => tx.store.delete(it)),
        tx.done,
      ]);
    },
    async claimFor(userId) {
      const records = await all();
      const others = records.filter((it) => it.userId !== userId);
      if (others.length > 0) {
        await this.apply(
          [],
          others.map((it) => it.key),
        );
      }
      return records.filter((it) => it.userId === userId);
    },
    async reassign(from, to) {
      const tx = (await open()).transaction(STORE, "readwrite");
      const moved = (await tx.store.getAll())
        .filter((it) => it.pageLoadId === from)
        .map((it) => ({ ...it, pageLoadId: to }));
      await Promise.all([...moved.map((it) => tx.store.put(it)), tx.done]);
      return moved;
    },
    async keysOf(pageLoadId) {
      return (await all())
        .filter((it) => it.pageLoadId === pageLoadId)
        .map((it) => it.key);
    },
    async count(userId) {
      return (await all()).filter((it) => it.userId === userId).length;
    },
    close() {
      const closing = db;
      db = null;
      void closing?.then((it) => it.close());
    },
    open() {
      void open();
    },
  };
}
