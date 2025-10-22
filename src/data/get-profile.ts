import { GetProfileQuery } from "@/data/__generated__/get-profile.generated";
import { gql, TypedDocumentNode } from "@apollo/client";

export const GET_PROFILE: TypedDocumentNode<GetProfileQuery> = gql(`
query getProfile {
  profile {
    me {
      id
      name
      email
      imageUrl
    }
  }
}`);
