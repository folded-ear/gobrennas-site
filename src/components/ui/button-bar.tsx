import { RecipeEdit, RecipeView } from "@/components/ui/icons";
import { Button } from "@heroui/react";

export const ButtonBar = () => {
  return (
    <div className="flex gap-1">
      <Button isIconOnly size="sm" variant="flat">
        <RecipeEdit />
      </Button>
      <Button isIconOnly size="sm" variant="flat">
        <RecipeView />
      </Button>
    </div>
  );
};
