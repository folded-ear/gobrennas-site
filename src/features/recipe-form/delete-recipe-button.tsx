"use client";

import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@heroui/react";
import { useState } from "react";

type Props = {
  name: string;
  isDisabled: boolean;
  onDelete: () => Promise<void>;
  failureDescription?: string;
};

export function DeleteRecipeButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="danger-soft"
        isDisabled={props.isDisabled}
        onPress={() => setOpen(true)}
      >
        Delete recipe
      </Button>
      <DeleteRecipeDialog {...props} isOpen={open} onOpenChange={setOpen} />
    </>
  );
}

export function DeleteRecipeDialog({
  name,
  isOpen,
  onOpenChange,
  isDisabled,
  onDelete,
  failureDescription = "Your edits are still here. Try again, or cancel to return to the recipe editor.",
}: Props & { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <DeleteDialog
      heading={`Delete “${name}”?`}
      confirmLabel="Delete recipe"
      pendingLabel="Deleting recipe"
      failureTitle="Couldn’t delete recipe"
      failureDescription={failureDescription}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDisabled={isDisabled}
      onDelete={onDelete}
    >
      <p>
        This permanently deletes the recipe. Existing meal-plan entries will
        remain.
      </p>
    </DeleteDialog>
  );
}
