"use client";

import { Alert, AlertDialog, Button, Spinner } from "@heroui/react";
import { useRef, useState } from "react";

type Props = {
  name: string;
  isDisabled: boolean;
  onDelete: () => Promise<void>;
};

export function DeleteRecipeButton({ name, isDisabled, onDelete }: Props) {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      deleting.current = false;
      setPending(false);
    }
  }

  return (
    <AlertDialog
      isOpen={open}
      onOpenChange={(next) => {
        if (deleting.current) return;
        setOpen(next);
        setFailed(false);
      }}
    >
      <Button type="button" variant="danger-soft" isDisabled={isDisabled}>
        Delete recipe
      </Button>
      <AlertDialog.Backdrop isKeyboardDismissDisabled={pending}>
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
                          Your edits are still here. Try again, or cancel to
                          return to the recipe editor.
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
    </AlertDialog>
  );
}
