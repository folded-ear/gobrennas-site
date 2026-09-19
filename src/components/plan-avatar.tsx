import { Avatar, type AvatarProps } from "@heroui/react";

const RING_WIDTH = "2px";

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
  ...rest
}: PlanAvatarProps) {
  return (
    <Avatar {...rest} title={plan.name}>
      <Avatar.Fallback
        style={
          selected
            ? { backgroundColor: plan.color }
            : {
                backgroundColor: "transparent",
                boxShadow: `inset 0 0 0 ${RING_WIDTH} ${plan.color}`,
              }
        }
      >
        {plan.name.substring(0, 2)}
      </Avatar.Fallback>
    </Avatar>
  );
}
