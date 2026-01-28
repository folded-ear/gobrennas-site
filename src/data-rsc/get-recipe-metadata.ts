import {
  GetRecipeMetaQuery,
  GetRecipeMetaQueryVariables,
} from "@/data-rsc/__generated__/get-recipe-metadata.generated";
import { gql, TypedDocumentNode } from "@apollo/client";

export const GET_RECIPE_METADATA: TypedDocumentNode<
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
