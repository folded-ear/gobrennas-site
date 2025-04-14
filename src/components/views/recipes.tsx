import { Recipe } from "@/__graphql/graphql";
import RecipeGrid from "@/components/views/recipe-grid";

export default function Recipes({ recipes }: { recipes: Recipe[] }) {
  return (
    <div>
      <RecipeGrid recipes={recipes} />
    </div>
  );
}
