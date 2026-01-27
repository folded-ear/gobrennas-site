import { User } from "@/__generated__/graphql";
import { Avatar, AvatarRootProps } from "@heroui/react";

interface Props {
  user: Pick<User, "name" | "email" | "imageUrl">;
  size?: AvatarRootProps["size"];
}

export default function UserAvatar({ user, size = "sm" }: Props) {
  const name = user.name || user.email;
  return (
    <Avatar size={size} title={name}>
      <Avatar.Image src={user.imageUrl || undefined} alt={name} />
      <Avatar.Fallback>
        {name
          .split(/\s+/)
          .filter((s) => s)
          .map((s) => s.charAt(0))
          .join("")}
      </Avatar.Fallback>
    </Avatar>
  );
}
