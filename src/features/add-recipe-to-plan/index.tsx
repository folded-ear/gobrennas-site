"use client";

import { SendToPlanIcon } from "@/components/icons";
import { useSendRecipeToPlan } from "@/features/send-to-plan/use-send-recipe-to-plan";
import { canChangePlan, orderPlans } from "@/lib/plans";
import { useQuery } from "@apollo/client/react";
import { Button, Dropdown, Label } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { RecipePlanChoicesDocument } from "./__generated__/recipePlanChoices.generated";

export function AddRecipeToPlan({ recipeId }: { recipeId: string }) {
  const [requested, setRequested] = useState(false);
  const { data, loading, error, refetch } = useQuery(
    RecipePlanChoicesDocument,
    { skip: !requested },
  );
  const { send, sending } = useSendRecipeToPlan();
  const plans = orderPlans(data?.planner.plans ?? []).filter(canChangePlan);

  return (
    <Dropdown
      onOpenChange={(next) => {
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
                  void send(recipeId, plan);
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
