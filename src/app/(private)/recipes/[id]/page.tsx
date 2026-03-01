import { Container } from "@/components/container";
import { getRecipeMetadata } from "@/data-rsc/get-recipe-metadata";
import { RecipeDetail } from "@/features/recipes/detail";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { name: title } = await getRecipeMetadata(id);
  return {
    title,
  };
}

export default async function RecipePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Container>
      <RecipeDetail id={id} />
    </Container>
  );
}
