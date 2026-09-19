import { Avatar, type AvatarProps } from "@heroui/react";
import clsx from "clsx";
import type { CSSProperties } from "react";

type PlanAvatarProps = AvatarProps & {
  plan: {
    name: string;
    color: string;
  };
  empty?: boolean;
  /** Whether my plan is selected; if false I'm a ring instead of filled. */
  selected?: boolean;
};

export default function PlanAvatar({
  plan,
  empty = false,
  selected = true,
  className,
  ...rest
}: PlanAvatarProps) {
  return (
    <Avatar
      {...rest}
      title={plan.name}
      data-unselected={!selected || undefined}
      style={{ "--plan-color": plan.color } as CSSProperties}
      className={clsx(
        "bg-(--plan-color) text-[contrast-color(var(--plan-color))]",
        "data-unselected:bg-transparent data-unselected:text-foreground",
        "data-unselected:inset-ring-2 data-unselected:inset-ring-(--plan-color)",
        className,
      )}
    >
      <Avatar.Fallback className="bg-transparent text-inherit">
        {plan.name.substring(0, 2)}
      </Avatar.Fallback>
    </Avatar>
  );
}
