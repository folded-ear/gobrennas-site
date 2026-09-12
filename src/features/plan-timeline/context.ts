import { TimelineBucket, TimelineItem } from "./model";

/** How an item's date sits against its parent's. */
export type Separation = "early" | "late";

/** An item named as context for another: who it is, and when it happens. */
export type ItemRef = {
  readonly id: string;
  readonly name: string;
  readonly date: string;
};

/** Where one item sits, and what it sits under. */
export type ItemContext = {
  readonly date: string;
  /** My parent, or nothing when the plan itself holds me. */
  readonly parent: ItemRef | null;
  /** How my date sits against my parent's, or nothing when they agree. */
  readonly separation: Separation | null;
};

/** Every item in a plan, by id. */
export type PlanContext = ReadonlyMap<string, ItemContext>;

export type BuildPlanContextInput = {
  /** The plan's own children, in display order. */
  readonly rootIds: readonly string[];
  readonly items: readonly TimelineItem[];
  readonly buckets: readonly TimelineBucket[];
  readonly today: string;
};

export function buildPlanContext(input: BuildPlanContextInput): PlanContext {
  throw new Error(`Not built yet: ${input.items.length} items.`);
}

export function ancestorsOf(
  context: PlanContext,
  id: string,
): readonly ItemRef[] {
  throw new Error(`Not built yet: ${context.size} items, asked for ${id}.`);
}
