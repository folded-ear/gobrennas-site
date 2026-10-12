"use client";

import { Alert, AlertDialog, Button, Spinner } from "@heroui/react";
import { type ReactNode, useRef, useState } from "react";

type DeleteDialogProps = {
  heading: string;
  /** What deleting does, said before it's done. */
  children: ReactNode;
  /** What my confirming button says. */
  confirmLabel: string;
  /** Names the deletion under way for assistive technology. */
  pendingLabel: string;
  failureTitle: string;
  failureDescription: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isDisabled?: boolean;
  onDelete: () => Promise<void>;
};

/**
 * I ask before something is deleted. I close once it's gone, and stay
 * open to say so and offer another try when deleting fails.
 */
export function DeleteDialog({
  heading,
  children,
  confirmLabel,
  pendingLabel,
  failureTitle,
  failureDescription,
  isOpen,
  onOpenChange,
  isDisabled = false,
  onDelete,
}: DeleteDialogProps) {
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
                <AlertDialog.Heading>{heading}</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                {children}
                {failed ? (
                  <Alert status="danger" role="alert" className="mt-md">
                    <Alert.Content>
                      <Alert.Title>{failureTitle}</Alert.Title>
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
                        aria-label={pendingLabel}
                      />
                      Deleting…
                    </>
                  ) : (
                    confirmLabel
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
