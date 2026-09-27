import { isBlankName, UNNAMED } from "@/lib/plan-item-name";
import { useFragment } from "@apollo/client/react";
import { PlanItemNameFragmentDoc } from "./__generated__/planItemName.generated";

type NameTextProps = {
  readonly name: string;
};

type ItemNameProps = {
  readonly itemId: string;
};

/** I show a name, or a blank one as a lighter, italic Unnamed. */
export function NameText({ name }: NameTextProps) {
  if (isBlankName(name)) {
    return <span className="font-light text-muted italic">{UNNAMED}</span>;
  }
  return <>{name}</>;
}

/**
 * I show a plan item's name, or the name it's being given while that
 * saves, marked as saving.
 */
export function ItemName({ itemId }: ItemNameProps) {
  const { data, complete } = useFragment({
    fragment: PlanItemNameFragmentDoc,
    from: { __typename: "PlanItem", id: itemId },
  });
  if (!complete) return null;
  if (data.pendingName === null) return <NameText name={data.name} />;
  return (
    <span aria-busy="true" className="opacity-60">
      <NameText name={data.pendingName} />
    </span>
  );
}
