import { PlanTree } from "./moves";
import { PlanMoves } from "./use-plan-moves";

/** What a view needs to let its items be dragged: the plan, and its moves. */
export type PlanDnd = {
  readonly tree: PlanTree;
  readonly canMove: boolean;
  readonly moves: PlanMoves;
};
