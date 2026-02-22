import { RECIPE_PHOTO_FRAGMENT } from "@/components/ui/recipe-photo";
import { USER_AVATAR_FRAGMENT } from "@/components/ui/user-avatar";
import { RECIPE_CARD_FRAGMENT } from "@/components/views/cardfrag";
import { INGREDIENTS_AND_DIRECTIONS_FRAGMENT } from "@/components/views/ingdirfrag";
import { createFragmentRegistry } from "@apollo/client/cache";

export const fragmentRegistry = createFragmentRegistry(
  INGREDIENTS_AND_DIRECTIONS_FRAGMENT,
  RECIPE_CARD_FRAGMENT,
  RECIPE_PHOTO_FRAGMENT,
  USER_AVATAR_FRAGMENT,
);
