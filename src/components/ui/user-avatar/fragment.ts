import { gql, TypedDocumentNode } from "@apollo/client";
import { UserAvatarFragment } from "./__generated__/fragment.generated";

export const USER_AVATAR_FRAGMENT: TypedDocumentNode<UserAvatarFragment> = gql`
  fragment userAvatar on User {
    name
    imageUrl
    email
  }
`;
