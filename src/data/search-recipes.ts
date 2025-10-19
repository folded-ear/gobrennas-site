import {
  GetSearchLibraryQuery,
  GetSearchLibraryQueryVariables,
} from "@/data/__generated__/search-recipes.generated";
import { gql, TypedDocumentNode } from "@apollo/client";

export const SEARCH_RECIPES: TypedDocumentNode<
  GetSearchLibraryQuery,
  GetSearchLibraryQueryVariables
> = gql(`
  query getSearchLibrary(
    $query: String! = ""
    $scope: LibrarySearchScope! = MINE
    $first: NonNegativeInt! = 9
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
`);
