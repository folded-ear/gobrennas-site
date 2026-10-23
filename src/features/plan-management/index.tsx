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
  Dropdown,
  Label,
  parseColor,
} from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ColorManagedPlanDocument,
  DeleteManagedPlanDocument,
  PlanManagementFragmentDoc,
  RenameManagedPlanDocument,
  type PlanManagementFragment,
} from "./__generated__/management.generated";

export function PlanManagementMenu({
  plans,
  onSelect,
}: {
  plans: readonly (PlanAccess & { id: string; name: string; color: string })[];
  onSelect: (id: string) => void;
}) {
  const eligible = orderPlans(plans).filter(canChangePlan);
  if (!eligible.length) return null;
  return (
    <Dropdown>
      <Button isIconOnly variant="ghost" aria-label="Manage plans">
        <Settings aria-hidden />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu aria-label="Manage plans">
          {eligible.map((plan) => (
            <Dropdown.Item
              key={plan.id}
              id={plan.id}
              textValue={plan.name}
              onAction={() => onSelect(plan.id)}
            >
              <PlanAvatar plan={plan} size="sm" aria-hidden />
              <Label>{plan.name}</Label>
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

const nameSchema = z.object({
  name: z.string().trim().min(1, "Enter a plan name."),
});

export function PlanManagement({
  plan: reference,
  onDeleted,
}: {
  plan: { __typename?: "Plan"; id: string };
  onDeleted: () => void;
}) {
  const { data: plan, complete } = useFragment({
    fragment: PlanManagementFragmentDoc,
    from: reference,
  });
  if (!complete || !canChangePlan(plan))
    return <p>This plan is no longer available to manage.</p>;
  return (
    <PlanManagementFields key={plan.id} plan={plan} onDeleted={onDeleted} />
  );
}

function PlanManagementFields({
  plan,
  onDeleted,
}: {
  plan: PlanManagementFragment;
  onDeleted: () => void;
}) {
  const client = useApolloClient();
  const [rename] = useMutation(RenameManagedPlanDocument);
  const [remove] = useMutation(DeleteManagedPlanDocument);
  const [saveColor, { loading: colorPending }] = useMutation(
    ColorManagedPlanDocument,
  );
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const busy = useRef(false);
  const form = useForm<z.input<typeof nameSchema>>({
    resolver: zodResolver(nameSchema, undefined, { raw: true }),
    defaultValues: { name: plan.name },
  });
  const pending = form.formState.isSubmitting || colorPending;

  return (
    <div className="flex max-w-lg flex-col gap-xl py-md">
      <form
        aria-label="Plan name"
        aria-busy={pending}
        noValidate
        className="flex flex-col gap-md"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy.current || pending || deleting) return;
          busy.current = true;
          void form
            .handleSubmit(async (raw) => {
              setError(false);
              setSaved(false);
              try {
                if (!canChangePlan(plan))
                  throw new Error("Plan is not editable");
                const { name } = nameSchema.parse(raw);
                const result = await rename({
                  variables: { id: plan.id, name },
                });
                if (result.data?.planner.rename.id !== plan.id)
                  throw new Error("Missing rename result");
                form.reset({ name });
                setSaved(true);
              } catch {
                setError(true);
              }
            })(event)
            .finally(() => {
              busy.current = false;
            });
        }}
      >
        {error ? (
          <p role="alert" className="text-danger">
            Could not save the name. Your changes are still here; try again.
          </p>
        ) : null}
        <fieldset disabled={pending || deleting}>
          <FormTextField
            control={form.control}
            name="name"
            label="Name"
            isRequired
            onValueChange={() => {
              setError(false);
              setSaved(false);
            }}
          />
        </fieldset>
        <div className="flex items-center gap-md">
          <Button
            type="submit"
            variant="primary"
            isPending={pending}
            isDisabled={pending || deleting}
          >
            Save name
          </Button>
          {saved ? <p role="status">Name saved.</p> : null}
        </div>
      </form>
      <PlanColor
        plan={plan}
        isDisabled={pending || deleting}
        onSave={async (color) => {
          if (!canChangePlan(plan)) throw new Error("Plan is not editable");
          const result = await saveColor({ variables: { id: plan.id, color } });
          if (result.data?.planner.setColor.id !== plan.id)
            throw new Error("Missing color result");
        }}
      />
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

function PlanColor({
  plan,
  isDisabled,
  onSave,
}: {
  plan: PlanManagementFragment;
  isDisabled: boolean;
  onSave: (color: string) => Promise<void>;
}) {
  const [color, setColor] = useState(() => parseColor(plan.color));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const busy = useRef(false);
  return (
    <section aria-label="Plan color" className="flex flex-col gap-md">
      <ColorPicker
        value={color}
        onChange={(value) => {
          setColor(value);
          setError(false);
          setSaved(false);
        }}
      >
        <ColorPicker.Trigger isDisabled={isDisabled || loading}>
          <ColorSwatch size="lg" />
          <Label>Color</Label>
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
      {error ? (
        <p role="alert" className="text-danger">
          Could not save the color. Try again.
        </p>
      ) : null}
      <div className="flex items-center gap-md">
        <Button
          variant="secondary"
          isPending={loading}
          isDisabled={isDisabled || loading}
          onPress={async () => {
            if (busy.current || isDisabled) return;
            busy.current = true;
            setLoading(true);
            setError(false);
            setSaved(false);
            try {
              const hex = color.toString("hex");
              if (!/^#[\da-f]{6}$/i.test(hex))
                throw new Error("Invalid plan color");
              await onSave(hex);
              setSaved(true);
            } catch {
              setError(true);
            } finally {
              busy.current = false;
              setLoading(false);
            }
          }}
        >
          Save color
        </Button>
        {saved ? <p role="status">Color saved.</p> : null}
      </div>
    </section>
  );
}
