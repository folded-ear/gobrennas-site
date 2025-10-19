import { Container } from "@/components/ui/layout";
import RecipeGrid from "@/components/views/recipe-grid";
import { SEARCH_RECIPES } from "@/data/search-recipes";
import { PreloadQuery } from "@/lib/apollo-client";
import { Suspense } from "react";

export default async function RecipesPage() {
  return (
    <PreloadQuery query={SEARCH_RECIPES}>
      <Suspense fallback={<>loading</>}>
        <Container>
          <h1 className="text-xl">Recipe Library</h1>
          <RecipeGrid />
        </Container>
      </Suspense>
    </PreloadQuery>
  );
}
