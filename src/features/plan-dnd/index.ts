import { PlanTree } from "./moves";
import { PlanMoves } from "./use-plan-moves";

/** What a view needs to let its items be dragged: the plans, and moves. */
export type PlanDnd = {
  readonly tree: PlanTree;
  canMove(itemId: string): boolean;
  readonly moves: PlanMoves;
};
