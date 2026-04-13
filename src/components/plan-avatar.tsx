import { Avatar, type AvatarProps } from "@heroui/react";

type PlanAvatarProps = AvatarProps & {
  plan: {
    name: string;
    color: string;
  };
  empty?: boolean;
};

export default function PlanAvatar({
  plan,
  empty = false,
  ...rest
}: PlanAvatarProps) {
  return (
    <Avatar {...rest} title={plan.name}>
      <Avatar.Fallback style={{ backgroundColor: plan.color }}>
        {plan.name.substring(0, 2)}
      </Avatar.Fallback>
    </Avatar>
  );
}
