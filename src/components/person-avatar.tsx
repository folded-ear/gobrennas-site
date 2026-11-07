import { Avatar, type AvatarRootProps } from "@heroui/react";
import { getImageProps } from "next/image";
import { useMemo } from "react";

type PersonAvatarProps = {
  name: string | null;
  email: string;
  imageUrl: string | null;
  size?: AvatarRootProps["size"];
};

/**
 * I show a person's picture, or their initials when they have none, titled
 * with their name (or email, when they have no name).
 */
export function PersonAvatar({
  name,
  email,
  imageUrl,
  size = "sm",
}: PersonAvatarProps) {
  const label = name ?? email;
  const imgProps = useMemo(() => {
    if (!imageUrl || process.env.NEXT_PUBLIC_CACHE_USER_AVATARS !== "true") {
      return {
        src: imageUrl ?? undefined,
        alt: label,
      };
    }
    const { props } = getImageProps({
      src: imageUrl,
      alt: label,
      fill: true,
      sizes: "48px",
    });
    return props;
  }, [label, imageUrl]);
  return (
    <Avatar size={size} title={label}>
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
