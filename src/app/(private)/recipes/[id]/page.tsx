import { Container } from "@/components/ui/layout";
import { RecipeDetail } from "@/components/views/recipe-detail";
import { getRecipeMetadata } from "@/data-rsc/get-recipe-metadata";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { name: title } = await getRecipeMetadata(id);
  return {
    title,
  };
}

export default async function RecipePage({ params }: Props) {
  const { id } = await params;

  return (
    <Container>
      <RecipeDetail id={id} />
    </Container>
  );
}
