"use client";

import { Alert, AlertDialog, Button, Spinner } from "@heroui/react";
import { useRef, useState } from "react";

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
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const deleting = useRef(false);

  async function confirm() {
    if (deleting.current || isDisabled) return;
    deleting.current = true;
    setPending(true);
    setFailed(false);
    try {
      await onDelete();
      onOpenChange(false);
    } catch {
      setFailed(true);
    } finally {
      deleting.current = false;
      setPending(false);
    }
  }

  return (
    <AlertDialog.Backdrop
      isOpen={isOpen}
      isKeyboardDismissDisabled={pending}
      onOpenChange={(next) => {
        if (deleting.current) return;
        onOpenChange(next);
        setFailed(false);
      }}
    >
      <AlertDialog.Container size="sm">
        <AlertDialog.Dialog>
          {({ close }) => (
            <>
              <AlertDialog.Header>
                <AlertDialog.Heading>Delete “{name}”?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  This permanently deletes the recipe. Existing meal-plan
                  entries will remain.
                </p>
                {failed ? (
                  <Alert status="danger" role="alert" className="mt-md">
                    <Alert.Content>
                      <Alert.Title>Couldn’t delete recipe</Alert.Title>
                      <Alert.Description>
                        {failureDescription}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  autoFocus
                  type="button"
                  variant="secondary"
                  isDisabled={pending}
                  onPress={close}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  isDisabled={pending || isDisabled}
                  isPending={pending}
                  onPress={() => {
                    void confirm();
                  }}
                >
                  {pending ? (
                    <>
                      <Spinner
                        size="sm"
                        color="current"
                        aria-label="Deleting recipe"
                      />
                      Deleting…
                    </>
                  ) : (
                    "Delete recipe"
                  )}
                </Button>
              </AlertDialog.Footer>
            </>
          )}
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
