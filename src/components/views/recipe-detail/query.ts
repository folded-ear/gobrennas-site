import { gql, TypedDocumentNode } from "@apollo/client";
import {
  GetRecipeDetailQuery,
  GetRecipeDetailQueryVariables,
} from "./__generated__/query.generated";

export const GET_RECIPE_DETAIL_QUERY: TypedDocumentNode<
  GetRecipeDetailQuery,
  GetRecipeDetailQueryVariables
> = gql`
  query getRecipeDetail($id: ID!) {
    library {
      getRecipeById(id: $id) {
        id
        name
        owner {
          id
          ...userAvatar
        }
        photo {
          url
        }
        ...recipePhoto
        ...ingredientsAndDirections
      }
    }
  }
`;
