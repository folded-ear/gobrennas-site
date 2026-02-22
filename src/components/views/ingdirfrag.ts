import { gql, TypedDocumentNode } from "@apollo/client";
import { IngredientsAndDirectionsFragment } from "./__generated__/ingdirfrag.generated";

export const INGREDIENTS_AND_DIRECTIONS_FRAGMENT: TypedDocumentNode<IngredientsAndDirectionsFragment> = gql`
  fragment ingredientsAndDirections on Recipe {
    ingredients {
      raw
      quantity {
        quantity
        units {
          id
          name
        }
      }
      ingredient {
        id
        name
      }
      preparation
    }
    directions
  }
`;
