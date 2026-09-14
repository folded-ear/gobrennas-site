import { RecipeCreate } from "@/screens/recipe-create";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Recipe",
};

export default function RecipeCreatePage() {
  return <RecipeCreate />;
}
