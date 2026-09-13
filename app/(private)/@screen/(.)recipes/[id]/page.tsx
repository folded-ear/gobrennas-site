import { Screen } from "@/components/screen";
import { getRecipeMetadata } from "@/data-rsc/get-recipe-metadata";
import { RecipeDetail } from "@/features/recipe-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeScreen({ params }: PageProps) {
  const { id } = await params;
  const { name } = await getRecipeMetadata(id);
  return (
    <Screen label={name}>
      <RecipeDetail id={id} />
    </Screen>
  );
}
