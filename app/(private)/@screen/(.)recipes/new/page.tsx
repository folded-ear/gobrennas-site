import { Screen } from "@/components/screen";
import { photoJobParamOf } from "@/lib/routes";
import { RecipeCreate } from "@/screens/recipe-create";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RecipeCreateScreen({ searchParams }: PageProps) {
  return (
    <Screen label="Add Recipe">
      <RecipeCreate initialJobId={photoJobParamOf(await searchParams)} />
    </Screen>
  );
}
