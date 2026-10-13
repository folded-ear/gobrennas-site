"use client";

import { DeleteDialog } from "@/components/delete-dialog";
import { FormTextField } from "@/components/form-text-field";
import { PlanPicker } from "@/features/plan-picker";
import { canonBucketName } from "@/lib/buckets";
import { canAdministerPlan } from "@/lib/plans";
import { useMutation } from "@apollo/client/react";
import { Button, Dropdown, Label, Modal } from "@heroui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ellipsis, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  CreateNamedBucketDocument,
  RemoveNamedBucketDocument,
  UpdateNamedBucketDocument,
} from "./__generated__/buckets.generated";
import type { BucketAction, BucketPlan } from "./model";

export type { BucketAction } from "./model";

export function BucketMenu({
  plans,
  bucketIds,
  label,
  onAction,
}: {
  plans: readonly BucketPlan[];
  bucketIds: readonly string[];
  label: string;
  onAction: (action: BucketAction) => void;
}) {
  const targets = plans
    .filter(canAdministerPlan)
    .flatMap((plan) =>
      plan.buckets
        .filter((bucket) => bucketIds.includes(bucket.id))
        .map((bucket) => ({ plan, bucket })),
    );
  if (!targets.length) return null;
  return (
    <Dropdown>
      <Button
        isIconOnly
        variant="ghost"
        className="text-muted"
        aria-label={`Manage ${label}`}
      >
        <Ellipsis aria-hidden />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu aria-label={`Manage ${label}`}>
          {targets.flatMap(({ plan, bucket }) =>
            (["edit", "remove"] as const).map((kind) => {
              const text = `${kind === "edit" ? "Edit" : "Remove"} Bucket${targets.length > 1 ? ` in ${plan.name}` : ""}`;
              return (
                <Dropdown.Item
                  key={`${kind}:${bucket.id}`}
                  id={`${kind}:${bucket.id}`}
                  textValue={text}
                  className={kind === "remove" ? "text-danger" : undefined}
                  onAction={() =>
                    onAction({
                      kind,
                      planId: plan.id,
                      bucket,
                    })
                  }
                >
                  <Label>{text}</Label>
                </Dropdown.Item>
              );
            }),
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

const schema = z.object({
  name: z.string().trim().min(1, "Enter a bucket name."),
  date: z.union([z.literal(""), z.iso.date()]),
});

export function BucketDialog({
  action,
  plans,
  onClose,
}: {
  action: BucketAction;
  plans: readonly BucketPlan[];
  onClose: () => void;
}) {
  const eligible = plans
    .filter(canAdministerPlan)
    .filter((plan) => action.kind === "create" || plan.id === action.planId);
  const [planId, setPlanId] = useState(eligible[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const [create] = useMutation(CreateNamedBucketDocument);
  const [update] = useMutation(UpdateNamedBucketDocument);
  const [remove] = useMutation(RemoveNamedBucketDocument);
  const plan = eligible.find((plan) => plan.id === planId);
  const form = useForm<z.input<typeof schema>>({
    resolver: zodResolver(
      schema.superRefine((values, context) => {
        const duplicate = plan?.buckets.find(
          (bucket) =>
            bucket.name !== null &&
            (action.kind === "create" || bucket.id !== action.bucket.id) &&
            canonBucketName(bucket.name) === canonBucketName(values.name),
        );
        if (duplicate) {
          context.addIssue({
            code: "custom",
            path: ["name"],
            message: `This plan already has a bucket named ${duplicate.name?.trim()}.`,
          });
        }
      }),
      undefined,
      { raw: true },
    ),
    defaultValues: {
      name: action.kind === "create" ? "" : (action.bucket.name ?? ""),
      date: (action.kind === "create" ? action.date : action.bucket.date) ?? "",
    },
  });
  const date = useWatch({ control: form.control, name: "date" });
  const pending = form.formState.isSubmitting;

  if (action.kind === "remove")
    return (
      <DeleteDialog
        heading={`Remove ${action.bucket.name}?`}
        confirmLabel="Remove Bucket"
        pendingLabel="Removing bucket"
        failureTitle="Bucket could not be removed"
        failureDescription="Your recipes are still there. Try again."
        isOpen
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        isDisabled={!plan}
        onDelete={async () => {
          const result = await remove({
            variables: { planId: action.planId, bucketId: action.bucket.id },
            refetchQueries: ["Planner"],
            awaitRefetchQueries: true,
          });
          if (!result.data?.planner.deleteBucket.id)
            throw new Error("Missing removal result");
        }}
      >
        <p>
          Recipes and items will stay in your plan. They will return to their
          parent’s group, or Unplanned when there is no parent group.
        </p>
      </DeleteDialog>
    );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    void form
      .handleSubmit(async (raw) => {
        setError(null);
        try {
          if (!plan) throw new Error("No eligible plan");
          const values = schema.parse(raw);
          const variables = {
            planId: plan.id,
            name: values.name,
            date: values.date || null,
          };
          const result =
            action.kind === "create"
              ? await create({
                  variables,
                  refetchQueries: ["Planner"],
                  awaitRefetchQueries: true,
                })
              : await update({
                  variables: { ...variables, bucketId: action.bucket.id },
                  refetchQueries: ["Planner"],
                  awaitRefetchQueries: true,
                });
          if (!result.data?.planner.bucket.id)
            throw new Error("Missing bucket result");
          onClose();
        } catch {
          setError(
            "Could not save the bucket. Your changes are still here; try again.",
          );
        }
      })(event)
      .finally(() => {
        busy.current = false;
      });
  }

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
            <Modal.Heading>
              {action.kind === "create" ? "Add Bucket" : "Edit Bucket"}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <form
              aria-label={
                action.kind === "create" ? "Add Bucket" : "Edit Bucket"
              }
              aria-busy={pending}
              className="flex flex-col gap-md"
              onSubmit={submit}
              noValidate
            >
              {error ? (
                <p role="alert" className="text-danger text-sm">
                  {error}
                </p>
              ) : null}
              {eligible.length > 1 && !pending ? (
                <PlanPicker
                  compact
                  label="Bucket plan"
                  plans={eligible}
                  selectionMode="single"
                  selectedIds={[planId]}
                  onChange={(ids) => {
                    if (!pending) {
                      setPlanId(ids[0]);
                      form.clearErrors("name");
                      setError(null);
                    }
                  }}
                />
              ) : null}
              <FormTextField
                control={form.control}
                name="name"
                label="Name"
                isRequired
                onValueChange={() => setError(null)}
              />
              <div className="flex items-start gap-xs">
                <div className="min-w-0 flex-1">
                  <FormTextField
                    control={form.control}
                    name="date"
                    label="Date"
                    type="date"
                    description="Optional. Leave blank for an undated bucket."
                    onValueChange={() => setError(null)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  className="mt-5 text-muted"
                  aria-label="Clear date"
                  isDisabled={pending || !date}
                  onPress={() => {
                    form.setValue("date", "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    setError(null);
                    form.setFocus("date");
                  }}
                >
                  <X size={16} aria-hidden />
                </Button>
              </div>
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
                  isDisabled={pending || !plan}
                >
                  {action.kind === "create" ? "Add Bucket" : "Save"}
                </Button>
              </div>
            </form>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
