import PlanAvatar from "@/components/plan-avatar";
import { groupPlans, type PlanGroup } from "@/components/plan-option";
import { canChangePlan, type PlanAccess } from "@/lib/plans";
import { Button, Header, Separator } from "@heroui/react";
import { ChevronRight, Plus } from "lucide-react";
import { Fragment, useId } from "react";

type ManagedPlan = PlanAccess & { id: string; name: string; color: string };

type ManagedPlanGroupProps = {
  group: PlanGroup<ManagedPlan>;
  selectedIds: readonly string[];
  onSelect: (id: string) => void;
};

function ManagedPlanGroup({
  group,
  selectedIds,
  onSelect,
}: ManagedPlanGroupProps) {
  const headerId = useId();
  return (
    <>
      <Header id={headerId}>{group.title}</Header>
      <ul aria-labelledby={headerId} className="flex flex-col gap-sm">
        {group.plans.map((plan) => (
          <li key={plan.id}>
            <Button
              fullWidth
              variant="ghost"
              className="justify-start"
              isDisabled={!canChangePlan(plan)}
              onPress={() => onSelect(plan.id)}
            >
              <PlanAvatar
                plan={plan}
                selected={selectedIds.includes(plan.id)}
                size="sm"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-left">
                {plan.name}
              </span>
              {canChangePlan(plan) ? (
                <ChevronRight aria-hidden />
              ) : (
                <span>Read only</span>
              )}
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PlanManagementList({
  plans,
  selectedIds,
  onSelect,
  onCreate,
}: {
  plans: readonly ManagedPlan[];
  selectedIds: readonly string[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex max-w-lg flex-col gap-sm py-md">
      <div className="flex items-center justify-between gap-sm">
        <p>
          {plans.length
            ? "Choose a plan to edit"
            : "There are no plans to manage."}
        </p>
        <Button variant="secondary" className="shrink-0" onPress={onCreate}>
          <Plus aria-hidden />
          New plan
        </Button>
      </div>
      {plans.length ? (
        <div
          role="group"
          aria-label="Plans to manage"
          className="flex flex-col gap-sm"
        >
          {groupPlans(plans).map((group, i) => (
            <Fragment key={group.title}>
              {i > 0 ? <Separator /> : null}
              <ManagedPlanGroup
                group={group}
                selectedIds={selectedIds}
                onSelect={onSelect}
              />
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
