import { PersonAvatar } from "@/components/person-avatar";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Avatar, AvatarRootProps } from "@heroui/react";
import {
  UserAvatarFragment,
  UserAvatarFragmentDoc,
} from "./__generated__/userAvatar.generated";

type UserAvatarProps = {
  user: FragmentType<UserAvatarFragment>;
  size?: AvatarRootProps["size"];
};

const DEFAULT_SIZE: AvatarRootProps["size"] = "sm";

export function UserAvatar({ user, size = DEFAULT_SIZE }: UserAvatarProps) {
  const { data, complete } = useFragment({
    fragment: UserAvatarFragmentDoc,
    from: user,
  });
  if (!complete) return null;
  return (
    <PersonAvatar
      name={data.name}
      email={data.email}
      imageUrl={data.imageUrl}
      size={size}
    />
  );
}

type OptionalUserAvatarProps = Omit<UserAvatarProps, "user"> & {
  user: UserAvatarProps["user"] | null;
};

export function UserAvatarWithFallback({
  user,
  size = DEFAULT_SIZE,
}: OptionalUserAvatarProps) {
  return user ? <UserAvatar user={user} size={size} /> : <Avatar size={size} />;
}

export function OtherUserAvatar({
  user,
  size = DEFAULT_SIZE,
}: OptionalUserAvatarProps) {
  return user ? <UserAvatar user={user} size={size} /> : null;
}
