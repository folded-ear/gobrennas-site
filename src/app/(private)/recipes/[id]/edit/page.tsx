import { Container } from "@/components/ui/layout";
import BarePage from "@/components/ui/layout/bare-page";
import RecipeDetail from "@/components/views/recipe-detail";
import { GET_RECIPE_BY_ID } from "@/data/get-recipe-by-id";
import { PreloadQuery } from "@/lib/apollo-client";
import { Suspense } from "react";

export default async function RecipeEdit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ps = await params;

  return (
    <>
      <h1>oh hai!</h1>
      <pre>{JSON.stringify(ps, null, 3)}</pre>
    </>
  );
}
