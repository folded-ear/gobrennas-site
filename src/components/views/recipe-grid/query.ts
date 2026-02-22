import { gql, TypedDocumentNode } from "@apollo/client";
import {
  GetRecipeGridQuery,
  GetRecipeGridQueryVariables,
} from "./__generated__/query.generated";

export const GET_RECIPE_GRID_QUERY: TypedDocumentNode<
  GetRecipeGridQuery,
  GetRecipeGridQueryVariables
> = gql`
  query getRecipeGrid(
    $query: String! = ""
    $scope: LibrarySearchScope! = MINE
    $first: NonNegativeInt! = 12
    $after: Cursor = null
  ) {
    library {
      recipes(first: $first, query: $query, scope: $scope, after: $after) {
        edges {
          cursor
          node {
            id
            ...recipeCard
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;
