import { INGREDIENTS_AND_DIRECTIONS_FRAGMENT } from "@/components/ui/ingredients-and-directions/fragment";
import { RECIPE_CARD_FRAGMENT } from "@/components/ui/recipe-card/fragment";

import { RECIPE_PHOTO_FRAGMENT } from "@/components/ui/recipe-photo/fragment";
import { USER_AVATAR_FRAGMENT } from "@/components/ui/user-avatar/fragment";
import { createFragmentRegistry } from "@apollo/client/cache";

export const fragmentRegistry = createFragmentRegistry(
  INGREDIENTS_AND_DIRECTIONS_FRAGMENT,
  RECIPE_CARD_FRAGMENT,
  RECIPE_PHOTO_FRAGMENT,
  USER_AVATAR_FRAGMENT,
);
