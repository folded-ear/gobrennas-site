import { graphql } from "@/__graphql";

export const LIBRARY_SEARCH_RESULT_FRAGMENT = graphql(`
  fragment librarySearchResult on RecipeConnection {
    edges {
      cursor
      node {
        id
        owner {
          id
          imageUrl
          email
          name
        }
        photo {
          url
          focus
        }
        name
        labels
        externalUrl
        calories
        yield
        totalTime
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
`);

export const RECIPE_CORE_FRAGMENT = graphql(`
  fragment recipeCore on Recipe {
    id
    name
    directions
    totalTime
    ingredients {
      raw
      quantity {
        quantity
        units {
          name
        }
      }
      ingredient {
        id
        name
      }
      preparation
    }
  }
`);
