import { gql } from "@apollo/client";

export const GET_RECIPE_BY_ID = gql(`
  query getRecipeById($id: ID!, $secret: String) {
    library {
      getRecipeById(id: $id, secret: $secret) {
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
`);
