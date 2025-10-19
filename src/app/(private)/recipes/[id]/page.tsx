import { Container } from "@/components/ui/layout";
import RecipeDetail from "@/components/views/recipe-detail";
import { GET_RECIPE_BY_ID } from "@/data/get-recipe-by-id";
import { PreloadQuery } from "@/lib/apollo-client";
import { Suspense } from "react";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PreloadQuery query={GET_RECIPE_BY_ID} variables={{ id }}>
      <Suspense fallback={<>...loading</>}>
        <Container>
          <h1 className="text-xl">Recipe Detail</h1>
          <RecipeDetail id={id} />
        </Container>
      </Suspense>
    </PreloadQuery>
  );
}
