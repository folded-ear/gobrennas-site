"use client";

import { AddIcon, MenuOpenIcon } from "@/components/icons";
import { ADD_RECIPE_PATH } from "@/lib/routes";
import {
  Button,
  buttonGroupVariants,
  buttonVariants,
  Dropdown,
  Label,
} from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AddRecipeButtonProps = {
  onAddFromPhoto: () => void;
};

/**
 * I add a recipe: a blank one from my main part, or by a choice from my
 * menu, which also offers starting from a photo.
 */
export function AddRecipeButton({ onAddFromPhoto }: AddRecipeButtonProps) {
  const router = useRouter();
  return (
    // HeroUI's ButtonGroup marks its children with a prop a link can't take.
    <div
      role="group"
      aria-label="Add a recipe"
      className={buttonGroupVariants({ orientation: "horizontal" }).base()}
    >
      <Link
        href={ADD_RECIPE_PATH}
        aria-label="Add Recipe"
        className={buttonVariants({ variant: "primary", isIconOnly: true })}
      >
        <AddIcon aria-hidden size="small" />
      </Link>
      <Dropdown>
        <Button
          isIconOnly
          variant="primary"
          aria-label="More ways to add a recipe"
        >
          <MenuOpenIcon aria-hidden size="small" />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu>
            <Dropdown.Item
              id="blank"
              textValue="Add Recipe"
              onAction={() => router.push(ADD_RECIPE_PATH)}
            >
              <Label>Add Recipe</Label>
            </Dropdown.Item>
            <Dropdown.Item
              id="photo"
              textValue="Add From Photo"
              onAction={onAddFromPhoto}
            >
              <Label>Add From Photo</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
