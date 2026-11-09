"use client";

import { PersonAvatar } from "@/components/person-avatar";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Avatar, AvatarRootProps } from "@heroui/react";
import { CurrentUserAvatarFragmentDoc } from "./__generated__/currentUserAvatar.generated";
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

type CurrentUserAvatarProps = Pick<UserAvatarProps, "size">;

/** I show the signed-in user's avatar, or a blank one before they're known. */
export function CurrentUserAvatar({
  size = DEFAULT_SIZE,
}: CurrentUserAvatarProps) {
  const { data, complete } = useFragment({
    fragment: CurrentUserAvatarFragmentDoc,
    fragmentName: "currentUserAvatar",
    from: "ROOT_QUERY",
  });
  return (
    <UserAvatarWithFallback
      user={complete ? data.profile.me : null}
      size={size}
    />
  );
}
