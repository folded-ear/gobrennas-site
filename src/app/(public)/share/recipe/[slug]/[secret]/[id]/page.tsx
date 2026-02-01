import BarePage from "@/components/ui/layout/bare-page";
import { GET_RECIPE_METADATA } from "@/data-rsc/get-recipe-metadata";
import { query } from "@/lib/apollo-rsc";
import type { Metadata } from "next";

interface Params {
  slug: string;
  secret: string;
  id: string;
}

interface Props {
  params: Promise<Params>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, secret } = await params;
  const { data } = await query({
    query: GET_RECIPE_METADATA,
    variables: { id, secret },
  });
  return {
    title: data?.library.getRecipeById.name,
  };
}

export default async function SharedRecipe({ params }: Props) {
  const ps = await params;
  return (
    <BarePage>
      <h1>oh hai!</h1>
      <pre>{JSON.stringify(ps, null, 3)}</pre>
    </BarePage>
  );
}
