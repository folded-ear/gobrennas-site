import { gql, TypedDocumentNode } from "@apollo/client";
import { RecipePhotoFragment } from "./__generated__/fragment.generated";

export const RECIPE_PHOTO_FRAGMENT: TypedDocumentNode<RecipePhotoFragment> = gql`
  fragment recipePhoto on Recipe {
    name
    photo {
      url
      focus
    }
  }
`;
