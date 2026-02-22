import { ButtonBarButton } from "@/components/ui/button-bar/button-bar-button";
import { RecipeEdit, RecipeView } from "@/components/ui/icons";

type ButtonBarProps = {
  id: string;
};

export function ButtonBar({ id }: ButtonBarProps) {
  return (
    <div className="flex gap-1">
      <ButtonBarButton href={`/recipes/${id}/edit`}>
        <RecipeEdit />
      </ButtonBarButton>
      <ButtonBarButton href={`/recipes/${id}`}>
        <RecipeView />
      </ButtonBarButton>
    </div>
  );
}
