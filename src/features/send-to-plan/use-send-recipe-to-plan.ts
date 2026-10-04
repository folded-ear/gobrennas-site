import { useApolloClient, useMutation } from "@apollo/client/react";
import { toast } from "@heroui/react";
import { useRef } from "react";
import { DoSendToPlanDocument } from "./__generated__/doSendToPlan.generated";

type Destination = { id: string; name: string };

const PLAN_CONTENTS = [
  "children",
  "descendants",
  "childCount",
  "descendantCount",
  "buckets",
  "bucketCount",
];

const RECIPE_PLANNING = ["plannedCount", "plannedHistory"];

/**
 * I send a recipe to a plan, one send at a time, and drop what that makes
 * stale from the cache. A toast reports how each send went; `send` never
 * rejects.
 */
export function useSendRecipeToPlan() {
  const [mutate, { loading: sending }] = useMutation(DoSendToPlanDocument);
  const client = useApolloClient();
  const pending = useRef(false);

  async function send(recipeId: string, plan: Destination) {
    if (pending.current) return;
    pending.current = true;
    try {
      const result = await mutate({ variables: { recipeId, planId: plan.id } });
      if (!result.data?.library.sendRecipeToPlan?.id)
        throw new Error("No plan item returned.");
      client.cache.batch({
        update(cache) {
          const id = cache.identify({ __typename: "Plan", id: plan.id });
          for (const fieldName of PLAN_CONTENTS) cache.evict({ id, fieldName });
          const recipe = cache.identify({ __typename: "Recipe", id: recipeId });
          for (const fieldName of RECIPE_PLANNING)
            cache.evict({ id: recipe, fieldName });
        },
      });
      toast.success(`Added to ${plan.name}`);
    } catch {
      toast.danger("Couldn’t add recipe to plan", {
        description: "Please try again.",
      });
    } finally {
      pending.current = false;
    }
  }

  return { send, sending };
}
