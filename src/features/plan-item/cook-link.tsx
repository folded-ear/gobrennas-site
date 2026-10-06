import { PlanItemStatus } from "@/__generated__/graphql";
import { CookIconLink } from "@/components/cook-icon-link";
import { CancelPendingButton, useItemStatus } from "@/features/plan-status";
import { displayName } from "@/lib/plan-item-name";

type CookLinkProps = {
  planId: string;
  itemId: string;
  /** The item's name, so the link says what it cooks. */
  name: string;
};

/** I give the path to one plan item's cook view. */
export function cookHref(planId: string, itemId: string) {
  return `/plan/${planId}/recipe/${itemId}`;
}

/**
 * I link to a plan item's cook view, boxed like the buttons beside me. Once
 * the item has been cooked, I offer to undo that instead.
 */
export function CookLink({ planId, itemId, name }: CookLinkProps) {
  const item = useItemStatus(itemId);
  if (item?.pendingStatus === PlanItemStatus.COMPLETED) {
    return (
      <CancelPendingButton itemId={itemId} status={PlanItemStatus.COMPLETED} />
    );
  }
  return (
    <CookIconLink href={cookHref(planId, itemId)} label={displayName(name)} />
  );
}
