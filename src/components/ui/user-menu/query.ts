import { gql, TypedDocumentNode } from "@apollo/client";
import { GetProfileQuery } from "./__generated__/query.generated";

export const GET_PROFILE_QUERY: TypedDocumentNode<GetProfileQuery> = gql`
  query getProfile {
    profile {
      me {
        id
        roles
        ...userAvatar
      }
    }
  }
`;
