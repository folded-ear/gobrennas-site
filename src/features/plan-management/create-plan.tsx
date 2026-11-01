"use client";

import { FormTextField } from "@/components/form-text-field";
import { useMutation } from "@apollo/client/react";
import { Button, Modal } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  CreateManagedPlanDocument,
  ManagedPlanMembershipDocument,
} from "./__generated__/management.generated";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a plan name."),
});

export function CreatePlanDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [create] = useMutation(CreateManagedPlanDocument);
  const busy = useRef(false);
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(schema, undefined, { raw: true }),
    defaultValues: { name: "" },
  });
  const pending = form.formState.isSubmitting;
  return (
    <Modal.Backdrop
      isOpen
      isDismissable={!pending}
      isKeyboardDismissDisabled={pending}
      onOpenChange={(open) => {
        if (!open && !busy.current) onClose();
      }}
    >
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>New plan</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <form
              aria-label="New plan"
              aria-busy={pending}
              noValidate
              className="flex flex-col gap-md"
              onSubmit={(event) => {
                event.preventDefault();
                if (busy.current) return;
                busy.current = true;
                void form
                  .handleSubmit(async (raw) => {
                    try {
                      const result = await create({
                        variables: schema.parse(raw),
                        update(cache, result) {
                          const plan = result.data?.planner.createPlan;
                          if (!plan?.id)
                            throw new Error("Missing created plan");
                          cache.updateQuery(
                            { query: ManagedPlanMembershipDocument },
                            (previous) =>
                              previous
                                ? {
                                    ...previous,
                                    planner: {
                                      ...previous.planner,
                                      plans: previous.planner.plans.some(
                                        (item) => item.id === plan.id,
                                      )
                                        ? previous.planner.plans
                                        : [
                                            ...previous.planner.plans,
                                            {
                                              __typename: "Plan" as const,
                                              id: plan.id,
                                            },
                                          ],
                                    },
                                  }
                                : previous,
                          );
                        },
                      });
                      if (!result.data?.planner.createPlan.id)
                        throw new Error("Missing created plan");
                      onCreated(result.data.planner.createPlan.id);
                    } catch {
                      form.setError("root.save", {
                        message:
                          "Could not create your plan. Your name is still here; try again.",
                      });
                    }
                  })(event)
                  .finally(() => {
                    busy.current = false;
                  });
              }}
            >
              {form.formState.errors.root?.save ? (
                <p role="alert" className="text-danger">
                  {form.formState.errors.root.save.message}
                </p>
              ) : null}
              <FormTextField
                control={form.control}
                name="name"
                label="Name"
                isRequired
                onValueChange={() => form.clearErrors("root.save")}
              />
              <div className="flex justify-end gap-sm">
                <Button
                  variant="secondary"
                  isDisabled={pending}
                  onPress={onClose}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isPending={pending}
                  isDisabled={pending}
                >
                  Create plan
                </Button>
              </div>
            </form>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

export function PlannerWelcome({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-lg p-xl sm:py-xxl">
      <h2>Make room for something delicious</h2>
      <p>Create your first plan to start organizing meals and recipes.</p>
      <Button variant="primary" onPress={onCreate}>
        Create a plan
      </Button>
    </div>
  );
}
