import { gql } from "@apollo/client";

export const RECIPE_CARD_FRAGMENT = gql`
  fragment recipeCard on Recipe {
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
`;

export const RECIPE_CORE_FRAGMENT = gql(`
  fragment recipeCore on Recipe {
    id
    name
    directions
    totalTime
    ingredients {
      raw
      quantity {
        quantity
        units { name }
      }
      ingredient {
        id
        name
      }
      preparation
    }
  }`);

export const fragments = [RECIPE_CARD_FRAGMENT, RECIPE_CORE_FRAGMENT];
