import { IngredientsAndDirectionsFragmentDoc } from "@/components/ui/ingredients-and-directions/__generated__/ingredientsAndDirections.generated";
import { RecipeCardFragmentDoc } from "@/components/ui/recipe-card/__generated__/recipeCard.generated";
import { RecipePhotoFragmentDoc } from "@/components/ui/recipe-photo/__generated__/recipePhoto.generated";
import { RecipeSectionsFragmentDoc } from "@/components/ui/recipe-sections/__generated__/recipeSections.generated";
import { UserAvatarFragmentDoc } from "@/components/ui/user-avatar/__generated__/userAvatar.generated";
import { createFragmentRegistry } from "@apollo/client/cache";

export const fragmentRegistry = createFragmentRegistry(
  IngredientsAndDirectionsFragmentDoc,
  RecipeCardFragmentDoc,
  RecipePhotoFragmentDoc,
  RecipeSectionsFragmentDoc,
  UserAvatarFragmentDoc,
);
