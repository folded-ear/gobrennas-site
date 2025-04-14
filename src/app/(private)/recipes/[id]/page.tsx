import RecipeDetail from "@/components/views/recipe-detail";
import { getRecipeById } from "@/data/recipes";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getRecipeById(id);
  const recipe = result?.library.getRecipeById;
  return <RecipeDetail recipe={recipe} />;
}
