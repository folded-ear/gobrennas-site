import { RecipeEdit } from "@/screens/recipe-edit";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ copy?: string }>;
};

export default async function RecipeEditPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const copy = (await searchParams).copy === "1";
  return <RecipeEdit id={id} copy={copy} />;
}
