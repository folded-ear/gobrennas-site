import { photoJobParamOf } from "@/lib/routes";
import { RecipeCreate } from "@/screens/recipe-create";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Recipe",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecipeCreatePage({ searchParams }: PageProps) {
  return <RecipeCreate initialJobId={photoJobParamOf(await searchParams)} />;
}
