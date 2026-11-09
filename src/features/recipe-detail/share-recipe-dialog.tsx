"use client";

import { shareRecipeHref } from "@/lib/routes";
import { Button, Input, Label, Modal, TextField, toast } from "@heroui/react";

type SharedRecipe = {
  name: string;
  share: { id: string; slug: string; secret: string };
};

/** The error a share sheet rejects with when its user dismisses it. */
const DISMISSED = "AbortError";

function shareUrlOf(recipe: SharedRecipe) {
  return new URL(shareRecipeHref(recipe.share), window.location.origin).href;
}

/**
 * I hand a recipe's share link to the device's share sheet, resolving
 * whether the sheet took it. A sheet its user dismissed took it; a device
 * without one, or a sheet that fails, didn't.
 */
export async function shareRecipeOnDevice(recipe: SharedRecipe) {
  if (typeof navigator.share !== "function") return false;
  try {
    await navigator.share({ title: recipe.name, url: shareUrlOf(recipe) });
  } catch (error) {
    return error instanceof DOMException && error.name === DISMISSED;
  }
  return true;
}

/**
 * I show the link anyone can read a recipe at without signing in, and
 * offer to copy it.
 */
export function ShareRecipeDialog({
  recipe,
  isOpen,
  onOpenChange,
}: {
  recipe: SharedRecipe;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          {({ close }) => <ShareLink recipe={recipe} onClose={close} />}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function ShareLink({
  recipe,
  onClose,
}: {
  recipe: SharedRecipe;
  onClose: () => void;
}) {
  const url = shareUrlOf(recipe);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
      onClose();
    } catch {
      toast.danger("Couldn’t copy link");
    }
  }

  return (
    <>
      <Modal.Header>
        <Modal.Heading>Share recipe</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-md">
        <p>Anyone with this link can read the recipe without signing in.</p>
        <TextField value={url} isReadOnly>
          <Label className="text-xs sr-only">Share link</Label>
          <Input
            autoFocus
            className="px-sm py-xs"
            onFocus={(event) => event.currentTarget.select()}
          />
        </TextField>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onPress={onClose}>
          Close
        </Button>
        <Button type="button" variant="primary" onPress={() => void copy()}>
          Copy &amp; Close
        </Button>
      </Modal.Footer>
    </>
  );
}
