import {
  GetRecipeMetaQuery,
  GetRecipeMetaQueryVariables,
} from "@/data-rsc/__generated__/get-recipe-metadata.generated";
import { query } from "@/lib/apollo-rsc";
import { gql, TypedDocumentNode } from "@apollo/client";
import { cache } from "react";

const GET_RECIPE_METADATA: TypedDocumentNode<
  GetRecipeMetaQuery,
  GetRecipeMetaQueryVariables
> = gql(`
  query getRecipeMeta($id: ID!, $secret: String) {
    library {
      getRecipeById(id: $id, secret: $secret) {
        name
      }
    }
  }
`);

export const getRecipeMetadata = cache(async (id: string) => {
  const { data } = await query({
    query: GET_RECIPE_METADATA,
    variables: { id },
  });
  if (!data) throw new TypeError(`Failed to get metadata for recipe '${id}'`);
  return data.library.getRecipeById;
});
