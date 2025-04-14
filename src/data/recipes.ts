"use server";

import { graphql } from "@/__graphql";
import { fetchGraphQL } from "@/lib/network";

export async function searchRecipes(qs = "") {
  const query = graphql(`
    query getSearchLibrary(
      $query: String! = ""
      $scope: LibrarySearchScope! = MINE
      $first: NonNegativeInt! = 9
      $after: Cursor = null
    ) {
      library {
        recipes(first: $first, query: $query, scope: $scope, after: $after) {
          ...librarySearchResult
        }
      }
    }
  `);

  return fetchGraphQL(query, { query: qs });
}

export async function getRecipeById(id: string) {
  return fetchGraphQL(
    graphql(`
      query getRecipeWithEverything($id: ID!) {
        library {
          getRecipeById(id: $id) {
            ...recipeCore
            yield
            calories
            externalUrl
            labels
            photo {
              url
              focus
            }
            owner {
              id
              name
              email
              imageUrl
            }
            subrecipes {
              ...recipeCore
            }
            plannedHistory {
              id
              plannedAt
              doneAt
              status
              owner {
                name
                email
                imageUrl
              }
              rating: ratingInt
              notes
            }
          }
        }
      }
    `),
    {
      id,
    },
  );
}
