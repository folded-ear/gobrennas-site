"use client";

import { FormTextField } from "@/components/form-text-field";
import { canChangePlan } from "@/lib/plans";
import { useMutation } from "@apollo/client/react";
import { Button, parseColor } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ColorManagedPlanDocument,
  RenameManagedPlanDocument,
  type PlanManagementFragment,
} from "./__generated__/management.generated";
import { PlanColorField } from "./color-field";
import { DeletePlanButton } from "./delete-plan-button";

const planDetailsSchema = z.object({
  name: z.string().trim().min(1, "Enter a plan name."),
  color: z
    .string()
    .transform((value, context) => {
      try {
        return parseColor(value).toString("hex").toLowerCase();
      } catch {
        context.addIssue({
          code: "custom",
          message: "Select a valid plan color.",
        });
        return z.NEVER;
      }
    })
    .pipe(z.string().regex(/^#[\da-f]{6}$/i, "Select a valid plan color.")),
});

export type PlanDetailsValues = z.input<typeof planDetailsSchema>;

export function PlanSettingsForm({
  plan,
  onDeleted,
  onBack,
}: {
  plan: PlanManagementFragment;
  onDeleted: () => void;
  onBack?: () => void;
}) {
  const [rename] = useMutation(RenameManagedPlanDocument);
  const [saveColor] = useMutation(ColorManagedPlanDocument);
  const [deleting, setDeleting] = useState(false);
  const busy = useRef(false);
  const form = useForm<PlanDetailsValues>({
    resolver: zodResolver(planDetailsSchema, undefined, { raw: true }),
    defaultValues: { name: plan.name, color: plan.color },
  });
  const {
    defaultValues,
    errors,
    isSubmitting: pending,
    isSubmitSuccessful,
    isDirty,
  } = form.formState;
  const saved = isSubmitSuccessful && !isDirty;

  return (
    <div className="flex max-w-lg flex-col gap-xl py-md">
      {onBack ? (
        <Button
          variant="ghost"
          className="self-start"
          isDisabled={pending || deleting}
          onPress={onBack}
        >
          <ArrowLeft aria-hidden /> Back to all plans
        </Button>
      ) : null}
      <form
        aria-label="Plan details"
        aria-busy={pending}
        noValidate
        className="flex flex-col gap-md"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy.current || pending || deleting) return;
          busy.current = true;
          void form
            .handleSubmit(async (raw) => {
              let nameSaved = false;
              try {
                if (!canChangePlan(plan))
                  throw new Error("Plan is not editable");
                const { name, color } = planDetailsSchema.parse(raw);
                // Compare with this form's defaults, not other devices' updates.
                const baseline = planDetailsSchema.parse(defaultValues);
                if (name !== baseline.name) {
                  const result = await rename({
                    variables: { id: plan.id, name },
                  });
                  if (result.data?.planner.rename.id !== plan.id)
                    throw new Error("Missing rename result");
                  // Mark only the acknowledged field saved, even if color fails.
                  form.resetField("name", { defaultValue: name });
                  nameSaved = true;
                }
                if (color !== baseline.color) {
                  const result = await saveColor({
                    variables: { id: plan.id, color },
                  });
                  if (result.data?.planner.setColor.id !== plan.id)
                    throw new Error("Missing color result");
                  form.resetField("color", { defaultValue: raw.color });
                }
                form.reset({ name, color: raw.color });
              } catch {
                form.setError("root.save", {
                  type: "server",
                  message: nameSaved
                    ? "The name was saved, but the color could not be saved. Your changes are still here; try again."
                    : "Could not save changes. Your changes are still here; try again.",
                });
              }
            })(event)
            .finally(() => {
              busy.current = false;
            });
        }}
      >
        {errors.root?.save ? (
          <p role="alert" className="text-danger">
            {errors.root.save.message}
          </p>
        ) : null}
        <fieldset disabled={pending || deleting}>
          <FormTextField
            control={form.control}
            name="name"
            label="Name"
            isRequired
            onValueChange={() => {
              form.clearErrors("root.save");
            }}
          />
        </fieldset>
        <PlanColorField
          control={form.control}
          isDisabled={pending || deleting}
          onEdit={() => form.clearErrors("root.save")}
        />
        <div className="flex items-center gap-md">
          <Button
            type="submit"
            variant="primary"
            isPending={pending}
            isDisabled={pending || deleting}
          >
            Save changes
          </Button>
          {saved ? <p role="status">Changes saved.</p> : null}
        </div>
      </form>
      <DeletePlanButton
        plan={plan}
        isDisabled={pending}
        isOpen={deleting}
        onOpenChange={setDeleting}
        onDeleted={onDeleted}
      />
    </div>
  );
}
