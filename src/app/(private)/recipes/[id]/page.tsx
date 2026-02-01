import { Container } from "@/components/ui/layout";
import RecipeDetail from "@/components/views/recipe-detail";
import { GET_RECIPE_METADATA } from "@/data-rsc/get-recipe-metadata";
import { GET_RECIPE_BY_ID } from "@/data/get-recipe-by-id";
import { PreloadQuery, query } from "@/lib/apollo-rsc";
import type { Metadata } from "next";
import { Suspense } from "react";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await query({
    query: GET_RECIPE_METADATA,
    variables: { id },
  });
  return {
    title: data?.library.getRecipeById.name,
  };
}

export default async function RecipePage({ params }: Props) {
  const { id } = await params;

  return (
    <PreloadQuery query={GET_RECIPE_BY_ID} variables={{ id }}>
      <Suspense fallback={<>...loading</>}>
        <Container>
          <RecipeDetail id={id} />
        </Container>
      </Suspense>
    </PreloadQuery>
  );
}
