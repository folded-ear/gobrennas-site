"use client";

import { useBlockScreenEscape } from "@/components/screen";
import { AddRecipeToPlan } from "@/features/add-recipe-to-plan";
import { DeleteRecipeDialog } from "@/features/recipe-form/delete-recipe-button";
import { Button, Dropdown, Label, Separator } from "@heroui/react";
import { Ellipsis, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";

export function RecipeActionBar({
  title,
  children,
  onClose,
}: {
  title: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-md border-b border-separator py-md">
      <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">{title}</div>
      <div
        role="group"
        aria-label="Recipe actions"
        className="flex w-full items-center gap-sm sm:w-auto"
      >
        {children}
        <Button
          isIconOnly
          variant="tertiary"
          aria-label="Close recipe"
          onPress={onClose}
          className="ml-auto"
        >
          <X size={20} aria-hidden />
        </Button>
      </div>
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const more = useRef<HTMLButtonElement>(null);
  useBlockScreenEscape(menuOpen || deleteOpen);
  return (
    <>
      <AddRecipeToPlan recipeId={recipe.id} />
      {recipe.mine ? (
        <>
          <Dropdown isOpen={menuOpen} onOpenChange={setMenuOpen}>
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
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
          <DeleteRecipeDialog
            name={recipe.name}
            isDisabled={false}
            isOpen={deleteOpen}
            onOpenChange={setDeleteOpen}
            onDelete={onDelete}
            failureDescription="The recipe hasn’t been deleted. Try again, or cancel to return to the recipe."
          />
        </>
      ) : null}
    </>
  );
}
