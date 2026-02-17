import { fragmentRegistry } from "@/lib/apollo/fragment-registry";
import { FragmentType, gql, TypedDocumentNode } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Avatar, AvatarRootProps } from "@heroui/react";
import { getImageProps } from "next/image";
import { useMemo } from "react";
import { UserAvatarFragment } from "./__generated__/user-avatar.generated";

export const USER_AVATAR_FRAGMENT: TypedDocumentNode<UserAvatarFragment> = gql`
  fragment userAvatar on User {
    name
    imageUrl
    email
  }
`;

fragmentRegistry.register(USER_AVATAR_FRAGMENT);

type UserAvatarProps = {
  user: FragmentType<UserAvatarFragment>;
  size?: AvatarRootProps["size"];
};

const DEFAULT_SIZE: AvatarRootProps["size"] = "sm";

export function UserAvatar({ user, size = DEFAULT_SIZE }: UserAvatarProps) {
  const { data, complete } = useFragment({
    fragment: USER_AVATAR_FRAGMENT,
    from: user,
  });
  const name = data.name ?? data.email ?? "";
  const imgProps = useMemo(() => {
    if (
      !data.imageUrl ||
      process.env.NEXT_PUBLIC_CACHE_USER_AVATARS !== "true"
    ) {
      return {
        src: data.imageUrl ?? undefined,
        alt: name,
      };
    }
    const { props } = getImageProps({
      src: data.imageUrl,
      alt: name,
      fill: true,
      sizes: "48px",
    });
    return props;
  }, [name, data.imageUrl]);
  if (!complete) return null;
  return (
    <Avatar size={size} title={name}>
      <Avatar.Image {...imgProps} />
      <Avatar.Fallback>
        {imgProps.alt
          .split(/\s+/)
          .filter((s) => s)
          .map((s) => s.charAt(0))
          .join("")}
      </Avatar.Fallback>
    </Avatar>
  );
}
