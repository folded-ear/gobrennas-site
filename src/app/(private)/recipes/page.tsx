import { Container } from "@/components/ui/layout";
import { RecipeGrid } from "@/components/views/recipe-grid";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Recipe Library",
  };
}
export default async function RecipesPage() {
  return (
    <Container>
      <h1 className="text-xl">Recipe Library</h1>
      <RecipeGrid />
    </Container>
  );
}
