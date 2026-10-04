import type {
  PlanItemStatus,
  RecognitionChoice,
} from "@/__generated__/graphql";

/** How long a completion or deletion can still be cancelled. */
export const UNDO_WINDOW_MS = 4000;
export const POLL_INTERVAL_MS = 15_000;
/** Covers clock skew and a write that commits just after a poll's read. */
export const POLL_MARGIN_MS = POLL_INTERVAL_MS / 2;
export const RETRY_BASE_MS = 2000;
export const RETRY_MAX_MS = 60_000;
export const REQUEST_TIMEOUT_MS = 20_000;

/** One item's new status. */
export type StatusChange = {
  readonly kind: "status";
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly status: PlanItemStatus;
};

/** One item's new name. */
export type RenameChange = {
  readonly kind: "rename";
  readonly id: string;
  readonly planId: string;
  readonly name: string;
};

/**
 * A new item, created under its parent after another item, or first. My id
 * is a draft id until the server gives the item its own.
 */
export type CreateChange = {
  readonly kind: "create";
  readonly id: string;
  readonly planId: string;
  readonly parentId: string;
  readonly afterId: string | null;
  readonly name: string;
  readonly choice?: RecognitionChoice;
  /** Assigned once created; left out, the item only inherits one. */
  readonly bucketId?: string | null;
};

/** One item's bucket, set or cleared. */
export type AssignBucketChange = {
  readonly kind: "assignBucket";
  readonly id: string;
  readonly planId: string;
  readonly name: string;
  readonly bucketId: string | null;
};

/** Items moved under a parent, in order, after one of its children. */
export type MoveChange = {
  readonly kind: "move";
  readonly ids: readonly string[];
  readonly planId: string;
  readonly parentId: string;
  /** The child they follow, or null when they come first. */
  readonly afterId: string | null;
  /** What to call the move, should it fail. */
  readonly name: string;
};

export type Change =
  StatusChange | RenameChange | CreateChange | AssignBucketChange | MoveChange;

/** A change as it is sent: naming only items the server has. */
export type SentChange =
  Exclude<Change, CreateChange> | Omit<CreateChange, "bucketId">;

/**
 * Where a change is: held for its undo window, ready to send, being sent,
 * or answered and still shown until a later poll has it.
 */
export type Phase = "held" | "ready" | "sending" | "answered";

export type Pending = {
  /** Names my record in the store. */
  readonly key: string;
  /** Where I fall among the user's changes, oldest first. */
  readonly seq: number;
  readonly change: Change;
  readonly phase: Phase;
  /** When a held change becomes ready. */
  readonly holdUntil?: number;
  /** Names the changes made together with me, which fail together. */
  readonly group?: string;
  /**
   * Whether my record is being stored, is stored, or won't be. I'm sent
   * only once I'm not still being stored.
   */
  readonly kept: "storing" | "kept" | "unkept";
};

/** A change kept on the device until the server has answered it. */
export type ChangeRecord = {
  readonly key: string;
  readonly userId: string;
  readonly pageLoadId: string;
  readonly seq: number;
  readonly change: Change;
  readonly holdUntil?: number;
};

export type InFlight = {
  readonly kind: "send" | "poll";
  readonly id: number;
  /** When the request is given up on. */
  readonly deadline: number;
  /**
   * Why it was aborted, if it was. One aborted for a returning connection
   * isn't counted as a failure.
   */
  readonly abort: "timeout" | "reconnect" | null;
  /** A send's changes, by key. */
  readonly keys: readonly string[];
  /** A send's changes, as sent. */
  readonly changes: readonly SentChange[];
  /** A poll's plans. */
  readonly planIds: readonly string[];
  readonly startedAt: number;
  /** Answered changes a poll retires once it lands. */
  readonly retiring: readonly string[];
};

export type Lifecycle = "booting" | "running" | "frozen" | "restoring";

export type State = {
  readonly pageLoadId: string;
  /** Null when signed out; nothing is stored then. */
  readonly userId: string | null;
  readonly lifecycle: Lifecycle;
  /** Whether changes are stored; false without a user or once blocked. */
  readonly storing: boolean;
  readonly online: boolean;
  readonly visible: boolean;
  readonly authorized: boolean;
  readonly pending: readonly Pending[];
  readonly lastKey: number;
  readonly lastSeq: number;
  /** Each created draft's real id. */
  readonly aliases: Readonly<Record<string, string>>;
  readonly inFlight: InFlight | null;
  readonly lastRequestId: number;
  readonly failures: number;
  /** No request starts before this. */
  readonly retryAt: number;
  /** Whether the next send must outlive the page. */
  readonly keepalive: boolean;
  /** How many mounted screens watch each plan. */
  readonly watched: Readonly<Record<string, number>>;
  /** Each polled plan's next cutoff. */
  readonly cutoffs: Readonly<Record<string, number>>;
  /** When the server rendered the page; data it holds is no older. */
  readonly renderedAt: number;
  /** When the next poll is due. */
  readonly pollDueAt: number;
  /** Whether the browser's install prompt is held, ready to show. */
  readonly installable: boolean;
  /** Whether a new version of the app is installed and waiting. */
  readonly updateWaiting: boolean;
};

export type SendOutcome =
  | { readonly kind: "saved"; readonly data: unknown }
  /** The fields that errored, by position; empty when none can be told. */
  | { readonly kind: "refused"; readonly fields: readonly number[] }
  | { readonly kind: "unreachable" }
  | { readonly kind: "unauthorized" };

export type PollOutcome =
  | { readonly kind: "saved"; readonly data: unknown }
  | { readonly kind: "refused" }
  | { readonly kind: "unreachable" }
  | { readonly kind: "unauthorized" };

type At = { readonly at: number };

export type Event = At &
  (
    | { readonly type: "boot"; readonly adopted: readonly ChangeRecord[] }
    | {
        readonly type: "change";
        readonly change: Change;
        /** Hold a COMPLETED or DELETED status for its undo window. */
        readonly hold?: boolean;
      }
    /** Several changes at once, which are sent together. */
    | { readonly type: "changes"; readonly changes: readonly Change[] }
    | { readonly type: "cancel"; readonly id: string }
    | { readonly type: "flush" }
    | { readonly type: "watch"; readonly planIds: readonly string[] }
    | { readonly type: "unwatch"; readonly planIds: readonly string[] }
    | { readonly type: "online" }
    | { readonly type: "offline" }
    | { readonly type: "visible" }
    | { readonly type: "hidden" }
    | { readonly type: "tick" }
    | { readonly type: "pagehide"; readonly persisted: boolean }
    | { readonly type: "pageshow"; readonly persisted: boolean }
    | { readonly type: "restored"; readonly keys: readonly string[] }
    | { readonly type: "storageBlocked" }
    | { readonly type: "installPrompt" }
    | { readonly type: "install" }
    | { readonly type: "workerWaiting" }
    | { readonly type: "update" }
    | { readonly type: "stored"; readonly keys: readonly string[] }
    | { readonly type: "storeFailed"; readonly keys: readonly string[] }
    | {
        readonly type: "sent";
        readonly requestId: number;
        readonly outcome: SendOutcome;
      }
    | {
        readonly type: "polled";
        readonly requestId: number;
        readonly outcome: PollOutcome;
      }
  );

/** An event as it is posted, before the engine stamps when it came. */
export type Posted = Event extends infer E
  ? E extends Event
    ? Omit<E, "at">
    : never
  : never;

export type PollRequest = {
  readonly planId: string;
  readonly cutoff: number;
};

export type Effect =
  | {
      readonly kind: "store";
      readonly put: readonly ChangeRecord[];
      readonly remove: readonly string[];
    }
  | {
      readonly kind: "send";
      readonly requestId: number;
      readonly changes: readonly SentChange[];
      readonly keepalive: boolean;
    }
  | {
      readonly kind: "poll";
      readonly requestId: number;
      readonly requests: readonly PollRequest[];
    }
  | { readonly kind: "abort" }
  | { readonly kind: "writeDraft"; readonly change: CreateChange }
  | { readonly kind: "evictDraft"; readonly id: string }
  | {
      readonly kind: "writeSaved";
      readonly changes: readonly SentChange[];
      readonly data: unknown;
    }
  | {
      readonly kind: "mergePoll";
      readonly planIds: readonly string[];
      readonly data: unknown;
    }
  | { readonly kind: "toast"; readonly failed: readonly Change[] }
  | {
      readonly kind: "created";
      readonly draftId: string;
      readonly id: string | null;
    }
  | { readonly kind: "freeze" }
  | { readonly kind: "thaw" }
  | { readonly kind: "closeStorage" }
  | { readonly kind: "showInstallPrompt" }
  | { readonly kind: "activateWorker" };
