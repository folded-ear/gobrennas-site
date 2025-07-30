import Recipes from "@/components/views/recipes";
import { searchRecipes } from "@/data/recipes";

export default async function RecipesPage() {
  const result = await searchRecipes();
  const recipes =
    result?.library?.recipes.edges.map((recipe) => recipe.node) ?? [];

  return <Recipes recipes={recipes} />;
}
