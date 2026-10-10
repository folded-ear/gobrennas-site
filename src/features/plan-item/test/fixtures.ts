import { PlanItemStatus } from "@/__generated__/graphql";
import { PlanItemFragment } from "../__generated__/planItem.generated";

type Spec = { readonly id: string; readonly name: string };

/** I give a needed item of plan 7 its fragment data, with nothing else set. */
export function planItemFragment(
  { id, name }: Spec,
  notes: string | null = null,
): PlanItemFragment {
  return {
    __typename: "PlanItem",
    id,
    name,
    status: PlanItemStatus.NEEDED,
    notes,
    preparation: null,
    parent: { __typename: "Plan", id: "7" },
    aggregate: null,
    ingredient: null,
    quantity: null,
    components: [],
    bucket: null,
  };
}
