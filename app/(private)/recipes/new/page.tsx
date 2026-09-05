import { Container } from "@/components/container";
import { RecipeAddForm } from "@/features/recipe-form/recipe-add-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add a New Recipe",
};

export default function RecipeAddPage() {
  return (
    <Container>
      <h1 className="text-xl mb-md">Add a New Recipe</h1>
      <RecipeAddForm />
    </Container>
  );
}
