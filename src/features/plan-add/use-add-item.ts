import { insertCreated } from "@/features/plan-changes/insert";
import { usePlanChanges } from "@/features/plan-changes/use-plan-changes";
import { DoAssignBucketDocument } from "@/features/plan-dnd/__generated__/doAssignBucket.generated";
import { DoCreateBucketDocument } from "@/features/plan-dnd/__generated__/doCreateBucket.generated";
import type { TimelineSection } from "@/features/plan-timeline/model";
import type { IngredientDraft } from "@/features/recipe-form/ingredient-draft";
import { recognizedParts } from "@/features/recipe-form/ingredient-recognition";
import { useRecognizeIngredient } from "@/features/recipe-form/use-recognize-ingredient";
import type { Reference } from "@apollo/client";
import { useApolloClient } from "@apollo/client/react";
import { useRef, useState } from "react";
import { AddPlannerRecipeDocument } from "./__generated__/addPlannerRecipe.generated";
import {
  canAddToSection,
  destinationBucket,
  type AddPlan,
} from "./destination";

/** Retain a created item's identity if only its bucket assignment needs retrying. */
export function useAddItem(section: TimelineSection) {
  const client = useApolloClient();
  const changes = usePlanChanges();
  const recognize = useRecognizeIngredient();
  const busy = useRef(false);
  const placed = useRef<{ itemId: string; bucketId: string } | undefined>(
    undefined,
  );
  const madeBucket = useRef<{ planId: string; id: string } | undefined>(
    undefined,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState(false);

  async function addRecipe(plan: AddPlan, recipeId: string, scale: number) {
    const result = await client.mutate({
      mutation: AddPlannerRecipeDocument,
      variables: { recipeId, planId: plan.id, scale },
      update(cache, { data }) {
        const item = data?.library.sendRecipeToPlan;
        if (!item) return;
        // The returned tree already contains every parent/child relationship.
        // Only the plan's root and flat descendants lists need extending.
        insertCreated(cache, {
          id: item.id,
          parentId: plan.id,
          afterId: plan.children.at(-1)?.id ?? null,
          planId: plan.id,
        });
        cache.modify<{ descendants: readonly Reference[] }>({
          id: cache.identify({ __typename: "Plan", id: plan.id }),
          fields: {
            descendants: (existing, { toReference }) => [
              ...existing,
              ...item.descendants.flatMap((child) => {
                const ref = toReference(child);
                return ref ? [ref] : [];
              }),
            ],
          },
        });
        const recipe = cache.identify({ __typename: "Recipe", id: recipeId });
        for (const fieldName of ["plannedCount", "plannedHistory"])
          cache.evict({ id: recipe, fieldName });
      },
    });
    return result.data?.library.sendRecipeToPlan.id;
  }

  async function add(
    plan: AddPlan | undefined,
    row: IngredientDraft,
  ): Promise<boolean> {
    if (
      busy.current ||
      !plan ||
      !row.raw.trim() ||
      !canAddToSection(plan, section)
    )
      return false;
    busy.current = true;
    setPending(true);
    setError(undefined);
    try {
      let placement = placed.current;
      if (!placement) {
        const choice = !row.raw.startsWith("!") ? row.choice : undefined;
        let scale = 1;
        if (choice?.food.kind === "Recipe") {
          // Add can beat the editor's debounce after a quantity edit. Resolve
          // the current text before saving instead of silently using scale 1.
          const recognition =
            row.recognition?.raw === row.raw
              ? row.recognition
              : await recognize(
                  row.raw,
                  row.raw.length,
                  new AbortController().signal,
                  {
                    choice,
                    suggest: false,
                  },
                );
          scale = recognizedParts(recognition).quantity?.quantity ?? 1;
          if (!Number.isFinite(scale) || scale <= 0) {
            setError("Use a recipe quantity greater than zero.");
            return false;
          }
        }
        let bucketId =
          destinationBucket(plan, section) ??
          (madeBucket.current?.planId === plan.id
            ? madeBucket.current.id
            : undefined);
        if (section.kind !== "unplanned" && !bucketId) {
          const result = await client.mutate({
            mutation: DoCreateBucketDocument,
            variables: {
              planId: plan.id,
              date: section.date,
              name: section.kind === "bucket" ? section.name : null,
            },
            update(cache, { data }) {
              const bucket = data?.planner.createBucket;
              if (!bucket) return;
              cache.modify<{ buckets: readonly Reference[] }>({
                id: cache.identify({ __typename: "Plan", id: plan.id }),
                fields: {
                  buckets: (existing = [], { toReference, readField }) => {
                    const ref = toReference(bucket);
                    return !ref ||
                      existing.some((it) => readField("id", it) === bucket.id)
                      ? existing
                      : [...existing, ref];
                  },
                },
              });
            },
          });
          bucketId = result.data?.planner.createBucket.id;
          if (!bucketId) throw new Error("No bucket returned");
          madeBucket.current = { planId: plan.id, id: bucketId };
        }
        const afterId = plan.children.at(-1)?.id;
        const itemId =
          choice?.food.kind === "Recipe"
            ? await addRecipe(plan, choice.food.id, scale)
            : await changes.create({
                kind: "create",
                draftId: row.clientId,
                planId: plan.id,
                parentId: plan.id,
                afterId: afterId ? { id: afterId } : null,
                name: row.raw,
                ...(choice
                  ? { choice: { id: choice.food.id, ...choice.range } }
                  : {}),
              });
        if (!itemId) throw new Error("No item returned");
        if (!bucketId) return true;
        placement = { itemId, bucketId };
        placed.current = placement;
        setCreated(true);
      }
      const result = await client.mutate({
        mutation: DoAssignBucketDocument,
        variables: { id: placement.itemId, bucketId: placement.bucketId },
      });
      if (result.data?.planner.assignBucket.bucket?.id !== placement.bucketId)
        throw new Error("Bucket assignment failed");
      return true;
    } catch {
      setError(
        placed.current
          ? "The item was added to Unplanned, but couldn’t be moved here. Retry to move the same item."
          : "Couldn’t add this item. Your text is still here; please try again.",
      );
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return { add, pending, error, created };
}
