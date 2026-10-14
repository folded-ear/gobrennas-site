import { Screen } from "@/components/screen";
import { getRecipeMetadata } from "@/data-rsc/get-recipe-metadata";
import { RecipeEdit } from "@/screens/recipe-edit";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ copy?: string }>;
};

export default async function RecipeEditScreen({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const copy = (await searchParams).copy === "1";
  const { name } = await getRecipeMetadata(id);
  return (
    <Screen label={`${copy ? "Copy" : "Edit"} ${name}`}>
      <RecipeEdit id={id} copy={copy} />
    </Screen>
  );
}
