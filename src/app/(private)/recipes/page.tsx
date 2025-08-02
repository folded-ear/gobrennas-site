import Recipes from "@/components/views/recipes";
import { searchRecipes } from "@/data/recipes";

export default async function RecipesPage() {
  const result = await searchRecipes();
  const recipes =
    result?.library?.recipes.edges.map((recipe) => recipe.node) ?? [];

  return (
    <div className="my-xl">
      <h1 className="text-xl">Recipe Library</h1>
      <Recipes recipes={recipes} />
    </div>
  );
}
