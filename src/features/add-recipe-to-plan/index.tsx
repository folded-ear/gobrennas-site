"use client";

import { SendToPlanIcon } from "@/components/icons";
import { useBlockScreenEscape } from "@/components/screen";
import { DoSendToPlanDocument } from "@/features/send-to-plan/__generated__/doSendToPlan.generated";
import { canChangePlan, orderPlans } from "@/lib/plans";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { Button, Dropdown, Label, toast } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { RecipePlanChoicesDocument } from "./__generated__/recipePlanChoices.generated";

export function AddRecipeToPlan({ recipeId }: { recipeId: string }) {
  const [requested, setRequested] = useState(false);
  const [open, setOpen] = useState(false);
  const { data, loading, error, refetch } = useQuery(
    RecipePlanChoicesDocument,
    { skip: !requested },
  );
  const [send, { loading: sending }] = useMutation(DoSendToPlanDocument, {
    context: { failureToast: false },
  });
  const client = useApolloClient();
  const pending = useRef(false);
  useBlockScreenEscape(open);
  const plans = orderPlans(data?.planner.plans ?? []).filter(canChangePlan);

  async function add(plan: { id: string; name: string }) {
    if (pending.current) return;
    pending.current = true;
    try {
      const result = await send({ variables: { recipeId, planId: plan.id } });
      if (!result.data?.library.sendRecipeToPlan.id)
        throw new Error("No plan item returned.");
      client.cache.batch({
        update(cache) {
          const id = cache.identify({ __typename: "Plan", id: plan.id });
          for (const fieldName of [
            "children",
            "descendants",
            "childCount",
            "descendantCount",
            "buckets",
            "bucketCount",
          ]) {
            cache.evict({ id, fieldName });
          }
          const recipe = cache.identify({ __typename: "Recipe", id: recipeId });
          for (const fieldName of ["plannedCount", "plannedHistory"])
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

  return (
    <Dropdown
      isOpen={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setRequested(true);
      }}
    >
      <Button variant="primary" isPending={sending} isDisabled={sending}>
        <SendToPlanIcon />
        {sending ? "Adding…" : "Add to plan"}
        <ChevronDown size={16} aria-hidden />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu aria-label="Choose a plan">
          {loading ? (
            <Dropdown.Item
              key="loading"
              id="loading"
              isDisabled
              textValue="Loading plans"
            >
              <Label>Loading plans…</Label>
            </Dropdown.Item>
          ) : error ? (
            <Dropdown.Item
              key="retry"
              id="retry"
              onAction={() => {
                void refetch().catch(() => {});
              }}
              textValue="Couldn’t load plans. Try again"
            >
              <Label>Couldn’t load plans. Try again</Label>
            </Dropdown.Item>
          ) : plans.length === 0 ? (
            <Dropdown.Item
              key="empty"
              id="empty"
              isDisabled
              textValue="No editable plans"
            >
              <Label>No editable plans</Label>
            </Dropdown.Item>
          ) : (
            plans.map((plan) => (
              <Dropdown.Item
                key={plan.id}
                id={plan.id}
                textValue={plan.name}
                onAction={() => {
                  void add(plan);
                }}
              >
                <Label>{plan.name}</Label>
              </Dropdown.Item>
            ))
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
