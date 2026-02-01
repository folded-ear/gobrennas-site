import BarePage from "@/components/ui/layout/bare-page";
import { getRecipeMetadata } from "@/data-rsc/get-recipe-metadata";
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
  const { name: title } = await getRecipeMetadata(id);
  return {
    title,
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
