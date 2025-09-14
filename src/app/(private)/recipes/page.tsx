import { Container } from "@/components/ui/layout";
import Recipes from "@/components/views/recipes";
import { searchRecipes } from "@/data/recipes";

export default async function RecipesPage() {
  const result = await searchRecipes();
  const recipes =
    result?.library?.recipes.edges.map((recipe) => recipe.node) ?? [];

  return (
    <Container>
      <h1 className="text-xl">Recipe Library</h1>
      <Recipes recipes={recipes} />
    </Container>
  );
}
