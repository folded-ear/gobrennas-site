import { gql, TypedDocumentNode } from "@apollo/client";
import { RecipeCardFragment } from "./__generated__/cardfrag.generated";

export const RECIPE_CARD_FRAGMENT: TypedDocumentNode<RecipeCardFragment> = gql`
  fragment recipeCard on Recipe {
    id
    name
    ownedBy {
      id
      ...userAvatar
    }
    photo {
      url
    }
    ...recipePhoto
  }
`;
