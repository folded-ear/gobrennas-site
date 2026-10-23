import { DeleteDialog } from "@/components/delete-dialog";
import { canAdministerPlan } from "@/lib/plans";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { Button } from "@heroui/react";
import {
  DeleteManagedPlanDocument,
  type PlanManagementFragment,
} from "./__generated__/management.generated";

export function DeletePlanButton({
  plan,
  isDisabled,
  isOpen,
  onOpenChange,
  onDeleted,
}: {
  plan: PlanManagementFragment;
  isDisabled: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDeleted: () => void;
}) {
  const client = useApolloClient();
  const [remove] = useMutation(DeleteManagedPlanDocument);
  if (!canAdministerPlan(plan)) return null;
  return (
    <div className="border-t border-separator pt-lg">
      <Button
        variant="danger"
        isDisabled={isDisabled}
        onPress={() => onOpenChange(true)}
      >
        Delete plan
      </Button>
      <DeleteDialog
        heading={`Delete ${plan.name}?`}
        confirmLabel="Delete plan"
        pendingLabel="Deleting plan"
        failureTitle="Plan could not be deleted"
        failureDescription="Your plan is still here. Try again."
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        onDelete={async () => {
          if (!canAdministerPlan(plan))
            throw new Error("Plan is not deletable");
          const result = await remove({ variables: { id: plan.id } });
          if (result.data?.planner.deletePlan.id !== plan.id)
            throw new Error("Missing deletion result");
          // Eviction removes this plan from every cached plan list, including shopping.
          client.cache.evict({ id: client.cache.identify(plan) });
          client.cache.gc();
          onDeleted();
        }}
      >
        <p>
          This permanently deletes the plan and all its planned recipes, items,
          and buckets. Saved library recipes are not deleted.
        </p>
      </DeleteDialog>
    </div>
  );
}
