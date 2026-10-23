"use client";

import { DeleteDialog } from "@/components/delete-dialog";
import { FormTextField } from "@/components/form-text-field";
import PlanAvatar from "@/components/plan-avatar";
import {
  canAdministerPlan,
  canChangePlan,
  orderPlans,
  type PlanAccess,
} from "@/lib/plans";
import {
  useApolloClient,
  useFragment,
  useMutation,
} from "@apollo/client/react";
import {
  Button,
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  Label,
  parseColor,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ChevronRight, Settings } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import {
  ColorManagedPlanDocument,
  DeleteManagedPlanDocument,
  PlanManagementFragmentDoc,
  RenameManagedPlanDocument,
  type PlanManagementFragment,
} from "./__generated__/management.generated";

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

export function PlanManagement({
  plan: reference,
  onDeleted,
  onBack,
}: {
  plan: { __typename?: "Plan"; id: string };
  onDeleted: () => void;
  onBack?: () => void;
}) {
  const { data: plan, complete } = useFragment({
    fragment: PlanManagementFragmentDoc,
    from: reference,
  });
  if (!complete || !canChangePlan(plan))
    return <p>This plan is no longer available to manage.</p>;
  return (
    <PlanManagementFields
      key={plan.id}
      plan={plan}
      onDeleted={onDeleted}
      onBack={onBack}
    />
  );
}

function PlanManagementFields({
  plan,
  onDeleted,
  onBack,
}: {
  plan: PlanManagementFragment;
  onDeleted: () => void;
  onBack?: () => void;
}) {
  const client = useApolloClient();
  const [rename] = useMutation(RenameManagedPlanDocument);
  const [remove] = useMutation(DeleteManagedPlanDocument);
  const [saveColor] = useMutation(ColorManagedPlanDocument);
  const colorLabelId = useId();
  const colorErrorId = useId();
  const [deleting, setDeleting] = useState(false);
  const busy = useRef(false);
  const form = useForm<z.input<typeof planDetailsSchema>>({
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
        <div className="flex flex-col items-start gap-xs">
          <Label id={colorLabelId} className="text-xs">
            Select a plan color
          </Label>
          <Controller
            name="color"
            control={form.control}
            render={({ field, fieldState }) => (
              <>
                <ColorPicker
                  value={field.value}
                  onChange={(value) => {
                    // Keep hue/saturation while editing, including for black/white.
                    field.onChange(value.toString("hsb"));
                    form.clearErrors("root.save");
                  }}
                >
                  <ColorPicker.Trigger
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-labelledby={colorLabelId}
                    aria-invalid={fieldState.invalid || undefined}
                    aria-describedby={
                      fieldState.error ? colorErrorId : undefined
                    }
                    isDisabled={pending || deleting}
                  >
                    <ColorSwatch size="lg" />
                  </ColorPicker.Trigger>
                  <ColorPicker.Popover>
                    <ColorArea
                      aria-label="Plan color"
                      colorSpace="hsb"
                      xChannel="saturation"
                      yChannel="brightness"
                    >
                      <ColorArea.Thumb />
                    </ColorArea>
                    <ColorSlider channel="hue" colorSpace="hsb">
                      <Label>Hue</Label>
                      <ColorSlider.Track>
                        <ColorSlider.Thumb />
                      </ColorSlider.Track>
                    </ColorSlider>
                  </ColorPicker.Popover>
                </ColorPicker>
                {fieldState.error ? (
                  <p
                    id={colorErrorId}
                    role="alert"
                    className="text-xs text-danger"
                  >
                    {fieldState.error.message}
                  </p>
                ) : null}
              </>
            )}
          />
        </div>
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
      {canAdministerPlan(plan) ? (
        <div className="border-t border-separator pt-lg">
          <Button
            variant="danger"
            isDisabled={pending}
            onPress={() => setDeleting(true)}
          >
            Delete plan
          </Button>
          <DeleteDialog
            heading={`Delete ${plan.name}?`}
            confirmLabel="Delete plan"
            pendingLabel="Deleting plan"
            failureTitle="Plan could not be deleted"
            failureDescription="Your plan is still here. Try again."
            isOpen={deleting}
            onOpenChange={setDeleting}
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
              This permanently deletes the plan and all its planned recipes,
              items, and buckets. Saved library recipes are not deleted.
            </p>
          </DeleteDialog>
        </div>
      ) : null}
    </div>
  );
}
