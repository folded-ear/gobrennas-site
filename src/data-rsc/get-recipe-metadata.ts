import { query } from "@/lib/apollo-rsc";
import { gql, TypedDocumentNode } from "@apollo/client";
import { cache } from "react";
import {
  GetRecipeMetaRscQuery,
  GetRecipeMetaRscQueryVariables,
} from "./__generated__/get-recipe-metadata.generated";

const GET_RECIPE_METADATA_RSC: TypedDocumentNode<
  GetRecipeMetaRscQuery,
  GetRecipeMetaRscQueryVariables
> = gql`
  query getRecipeMetaRsc($id: ID!, $secret: String) {
    library {
      getRecipeById(id: $id, secret: $secret) {
        id
        name
      }
    }
  }
`;

export const getRecipeMetadata = cache(async (id: string, secret?: string) => {
  const { data } = await query({
    query: GET_RECIPE_METADATA_RSC,
    variables: { id, secret },
  });
  if (!data) throw new TypeError(`Failed to get metadata for recipe '${id}'`);
  return data.library.getRecipeById;
});
