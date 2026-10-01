import { isReference, type NormalizedCacheObject } from "@apollo/client";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { DeleteRecipeDocument } from "./__generated__/deleteRecipe.generated";

type DeletableRecipe = {
  __typename?: "Recipe";
  id: string;
  mine: boolean;
  sections: readonly {
    __typename?: "Section";
    id: string;
    sectionOf: { id: string } | null;
  }[];
};

/** Shared deletion and cache cleanup for the recipe view and its editor. */
export function useDeleteRecipe(
  recipe: DeletableRecipe,
  onDeleted: () => void,
) {
  const client = useApolloClient();
  const [deleteRecipe] = useMutation(DeleteRecipeDocument);
  return async function remove() {
    if (!recipe.mine) throw new Error("Recipe is not deletable.");
    const result = await deleteRecipe({ variables: { id: recipe.id } });
    if (result.data?.library.deleteRecipe.id !== recipe.id)
      throw new Error("Delete returned no matching recipe.");
    client.cache.batch({
      update(cache) {
        const deletedIds = new Set(
          [
            recipe,
            ...recipe.sections.filter(
              (section) => section.sectionOf?.id === recipe.id,
            ),
          ]
            .map((item) => cache.identify(item))
            .filter((id) => id !== undefined),
        );
        // Plan entries remain, but the API severs their recipe links and may
        // fill empty notes. Preserve local editing state while refreshing them.
        const store = cache.extract() as NormalizedCacheObject;
        for (const [id, item] of Object.entries(store)) {
          if (
            item?.__typename === "PlanItem" &&
            isReference(item.ingredient) &&
            deletedIds.has(item.ingredient.__ref)
          ) {
            cache.evict({ id, fieldName: "ingredient" });
            cache.evict({ id, fieldName: "notes" });
          }
        }
        for (const id of deletedIds) cache.evict({ id });
        for (const fieldName of ["library", "labels", "planner"]) {
          cache.evict({ id: "ROOT_QUERY", fieldName });
        }
      },
    });
    onDeleted();
  };
}
