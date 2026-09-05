import {
  IngredientInfo,
  IngredientRefInfo,
  SectionInfo,
} from "@/__generated__/graphql";
import { IngredientRefValues, RecipeFormValues } from "./schema";

function toRefs(list: IngredientRefValues[]): IngredientRefInfo[] {
  return list
    .map((ref) => ref.raw.trim())
    .filter((raw) => raw.length > 0)
    .map((raw) => ({ raw }));
}

function toSection(section: RecipeFormValues["sections"][number]): SectionInfo {
  // `SectionInfo.id` documents that by-reference sections carry no other
  // fields. The legacy client ignores this and ships a fully hydrated body.
  if (section.kind === "reference") return { id: section.id };
  return {
    id: section.id,
    name: section.name.trim(),
    directions: section.directions,
    ingredients: toRefs(section.ingredients),
  };
}

export function toIngredientInfo(values: RecipeFormValues): IngredientInfo {
  return {
    type: "Recipe",
    name: values.name,
    directions: values.directions,
    ingredients: toRefs(values.ingredients),
    sections: values.sections.map(toSection),
  };
}
