import { User } from "@/__generated__/graphql";
import { Avatar, AvatarRootProps } from "@heroui/react";
import { getImageProps } from "next/image";
import { useMemo } from "react";

interface Props {
  user: Pick<User, "name" | "email" | "imageUrl">;
  size?: AvatarRootProps["size"];
}

export default function UserAvatar({ user, size = "sm" }: Props) {
  const name = user.name || user.email;
  const imgProps = useMemo(() => {
    if (
      !user.imageUrl ||
      process.env.NEXT_PUBLIC_CACHE_USER_AVATARS !== "true"
    ) {
      return {
        src: user.imageUrl ?? undefined,
        alt: name,
      };
    }
    const { props } = getImageProps({
      src: user.imageUrl,
      alt: name,
      fill: true,
      sizes: "48px",
    });
    return props;
  }, [name, user.imageUrl]);
  return (
    <Avatar size={size} title={name}>
      <Avatar.Image {...imgProps} />
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
