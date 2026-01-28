import { Container } from "@/components/ui/layout";
import RecipeDetail from "@/components/views/recipe-detail";
import { GET_RECIPE_BY_ID } from "@/data/get-recipe-by-id";
import { PreloadQuery } from "@/lib/apollo-client";
import { Suspense } from "react";

interface Props {
  params: Promise<{ id: string }>;
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
