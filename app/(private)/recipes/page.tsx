import { Recipes } from "@/screens/recipes";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Recipe Library",
  };
}

export default async function RecipesPage() {
  return <Recipes />;
}
