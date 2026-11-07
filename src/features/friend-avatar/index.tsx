import { PersonAvatar } from "@/components/person-avatar";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { AvatarRootProps } from "@heroui/react";
import {
  FriendAvatarFragment,
  FriendAvatarFragmentDoc,
} from "./__generated__/friendAvatar.generated";

type FriendAvatarProps = {
  friend: FragmentType<FriendAvatarFragment>;
  size?: AvatarRootProps["size"];
};

export function FriendAvatar({ friend, size }: FriendAvatarProps) {
  const { data, complete } = useFragment({
    fragment: FriendAvatarFragmentDoc,
    from: friend,
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
