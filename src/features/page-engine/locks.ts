const LOCK_PREFIX = "page-load:";

/** The Web Lock that says a page load is still open. */
export type PageLocks = {
  /** I hold this page load's lock until released. */
  hold(): void;
  release(): void;
  /** I take this page load's lock back, once it's free. */
  reacquire(): Promise<void>;
  /**
   * I run work holding a gone page load's lock, if it's free, giving its
   * result, or null when that page load is open or being adopted.
   */
  adopt<T>(pageLoadId: string, work: () => Promise<T>): Promise<T | null>;
};

/**
 * I give a page load's locks. Without Web Locks, every other page load
 * counts as gone.
 */
export function createPageLocks(
  locks: LockManager | undefined,
  pageLoadId: string,
): PageLocks {
  const name = `${LOCK_PREFIX}${pageLoadId}`;
  let release: (() => void) | null = null;
  const take = () =>
    new Promise<void>((granted) => {
      void locks?.request(name, () => {
        granted();
        return new Promise<void>((done) => {
          release = done;
        });
      });
      if (locks === undefined) granted();
    });
  return {
    hold() {
      void take();
    },
    release() {
      release?.();
      release = null;
    },
    reacquire: take,
    async adopt(other, work) {
      if (locks === undefined) return work();
      return locks.request(
        `${LOCK_PREFIX}${other}`,
        { ifAvailable: true },
        async (lock) => (lock === null ? null : work()),
      );
    },
  };
}
