import { BarePage } from "@/components/layout/bare-page";
import { getRecipeMetadata } from "@/data-rsc/get-recipe-metadata";
import type { Metadata } from "next";

type Params = {
  slug: string;
  secret: string;
  id: string;
};

type PageProps = {
  params: Promise<Params>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id, secret } = await params;
  const { name: title } = await getRecipeMetadata(id, secret);
  return {
    title,
  };
}

export default async function SharedRecipe({ params }: PageProps) {
  const ps = await params;
  return (
    <BarePage>
      <h1>oh hai!</h1>
      <pre>{JSON.stringify(ps, null, 3)}</pre>
    </BarePage>
  );
}
