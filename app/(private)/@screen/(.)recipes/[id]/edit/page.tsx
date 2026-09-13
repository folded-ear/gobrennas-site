import { Screen } from "@/components/screen";
import { getRecipeMetadata } from "@/data-rsc/get-recipe-metadata";
import { RecipeEdit } from "@/screens/recipe-edit";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeEditScreen({ params }: PageProps) {
  const { id } = await params;
  const { name } = await getRecipeMetadata(id);
  return (
    <Screen label={`Edit ${name}`}>
      <RecipeEdit id={id} />
    </Screen>
  );
}
