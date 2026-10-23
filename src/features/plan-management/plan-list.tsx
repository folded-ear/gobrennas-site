import PlanAvatar from "@/components/plan-avatar";
import { canChangePlan, orderPlans, type PlanAccess } from "@/lib/plans";
import { Button } from "@heroui/react";
import { ChevronRight, Settings } from "lucide-react";

type ManagedPlan = PlanAccess & { id: string; name: string; color: string };

export function PlanManagementButton({
  plans,
  onPress,
}: {
  plans: readonly ManagedPlan[];
  onPress: () => void;
}) {
  if (!plans.some(canChangePlan)) return null;
  return (
    <Button
      isIconOnly
      variant="ghost"
      aria-label="Manage plans"
      onPress={onPress}
    >
      <Settings aria-hidden />
    </Button>
  );
}

export function PlanManagementList({
  plans,
  onSelect,
}: {
  plans: readonly ManagedPlan[];
  onSelect: (id: string) => void;
}) {
  if (!plans.length) return <p>There are no plans to manage.</p>;
  return (
    <div className="flex max-w-lg flex-col gap-sm py-md">
      <p>Choose a plan to edit</p>
      <ul aria-label="Plans to manage" className="flex flex-col gap-sm">
        {orderPlans(plans).map((plan) => (
          <li key={plan.id}>
            <Button
              fullWidth
              variant="ghost"
              className="justify-start"
              isDisabled={!canChangePlan(plan)}
              onPress={() => onSelect(plan.id)}
            >
              <PlanAvatar plan={plan} size="sm" aria-hidden />
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
    </div>
  );
}
