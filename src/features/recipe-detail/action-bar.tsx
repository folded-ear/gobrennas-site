"use client";

import { DeleteRecipeDialog } from "@/features/recipe-form/delete-recipe-button";
import { SendToPlan } from "@/features/send-to-plan";
import { Button, Dropdown, Label, Separator } from "@heroui/react";
import { Copy, Ellipsis, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";

export function RecipeActionBar({
  title,
  children,
  onClose,
}: {
  title: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-sm border-b border-separator py-sm">
      <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">{title}</div>
      {children || onClose ? (
        <div
          role="group"
          aria-label="Recipe actions"
          className="flex w-full items-center gap-sm sm:w-auto"
        >
          {children}
          {onClose ? (
            <Button
              isIconOnly
              variant="tertiary"
              aria-label="Close recipe"
              onPress={onClose}
              className="ml-auto"
            >
              <X size={20} aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

export function LibraryRecipeActions({
  recipe,
  onDelete,
}: {
  recipe: { id: string; name: string; mine: boolean };
  onDelete: () => Promise<void>;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const more = useRef<HTMLButtonElement>(null);
  return (
    <>
      <SendToPlan recipeId={recipe.id} variant="primary" choosable />
      <Dropdown>
        <Button
          ref={more}
          isIconOnly
          variant="secondary"
          aria-label="More recipe actions"
        >
          <Ellipsis size={20} aria-hidden />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label="More recipe actions">
            <Dropdown.Item
              id="copy"
              textValue={recipe.mine ? "Duplicate" : "Copy to my library"}
              onAction={() =>
                router.push(
                  `/recipes/${encodeURIComponent(recipe.id)}/edit?copy=1`,
                )
              }
            >
              <Copy size={16} aria-hidden />
              <Label>{recipe.mine ? "Duplicate" : "Copy to my library"}</Label>
            </Dropdown.Item>
            {recipe.mine ? (
              <>
                <Dropdown.Item
                  id="edit"
                  onAction={() =>
                    router.push(
                      `/recipes/${encodeURIComponent(recipe.id)}/edit`,
                    )
                  }
                  textValue="Edit recipe"
                >
                  <Pencil size={16} aria-hidden />
                  <Label>Edit recipe</Label>
                </Dropdown.Item>
                <Separator />
                <Dropdown.Item
                  id="delete"
                  variant="danger"
                  textValue="Delete recipe"
                  onAction={() => {
                    more.current?.focus();
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 size={16} aria-hidden />
                  <Label>Delete recipe</Label>
                </Dropdown.Item>
              </>
            ) : null}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      {recipe.mine ? (
        <DeleteRecipeDialog
          name={recipe.name}
          isDisabled={false}
          isOpen={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDelete={onDelete}
          failureDescription="The recipe hasn’t been deleted. Try again, or cancel to return to the recipe."
        />
      ) : null}
    </>
  );
}
