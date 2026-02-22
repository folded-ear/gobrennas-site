import { gql, TypedDocumentNode } from "@apollo/client";
import { RecipeSectionsFragment } from "./__generated__/fragment.generated";

export const RECIPE_SECTIONS_FRAGMENT: TypedDocumentNode<RecipeSectionsFragment> = gql`
  fragment recipeSections on Recipe {
    sections {
      id
      name
      ...ingredientsAndDirections
    }
  }
`;
