import { rand_chars } from "@/lib/entropy";
import { z } from "zod";

/**
 * `clientId` is React-key/identity only and never sent to the server;
 * `id` is the server id, or null for something not yet saved. Keeping them
 * separate avoids the legacy client's trick of stuffing sentinel values into
 * `id` and having to detect them again at serialization time.
 */
export const ingredientRefSchema = z.object({
  clientId: z.string(),
  raw: z.string(),
});

export const ownedSectionSchema = z.object({
  kind: z.literal("owned"),
  clientId: z.string(),
  id: z.string().nullable(),
  name: z.string().trim().min(1, "A section title is required."),
  ingredients: z.array(ingredientRefSchema),
  directions: z.string(),
});

/**
 * A section that _is_ another recipe. Only its id is ever sent; `name` and
 * `ofRecipeName` exist to render it, and it has no editable fields — which is
 * why the required-title rule above doesn't reach it.
 */
export const referenceSectionSchema = z.object({
  kind: z.literal("reference"),
  clientId: z.string(),
  id: z.string(),
  name: z.string(),
  ofRecipeName: z.string(),
});

export const sectionSchema = z.discriminatedUnion("kind", [
  ownedSectionSchema,
  referenceSectionSchema,
]);

export const recipeFormSchema = z.object({
  name: z.string().trim().min(1, "A recipe title is required."),
  directions: z.string(),
  ingredients: z.array(ingredientRefSchema),
  sections: z.array(sectionSchema),
});

export type IngredientRefValues = z.infer<typeof ingredientRefSchema>;
export type OwnedSectionValues = z.infer<typeof ownedSectionSchema>;
export type ReferenceSectionValues = z.infer<typeof referenceSectionSchema>;
export type SectionValues = z.infer<typeof sectionSchema>;
export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export const newClientId = () => rand_chars(12);

export function buildIngredientRef(raw = ""): IngredientRefValues {
  return { clientId: newClientId(), raw };
}

export function buildOwnedSection(): OwnedSectionValues {
  return {
    kind: "owned",
    clientId: newClientId(),
    id: null,
    name: "",
    ingredients: [buildIngredientRef()],
    directions: "",
  };
}

/**
 * A function, not a constant: every draft needs its own fresh `clientId`s.
 */
export function emptyRecipeFormValues(): RecipeFormValues {
  return {
    name: "",
    directions: "",
    ingredients: [buildIngredientRef()],
    sections: [],
  };
}
