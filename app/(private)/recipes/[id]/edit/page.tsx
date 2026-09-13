import { RecipeEdit } from "@/screens/recipe-edit";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeEditPage({ params }: PageProps) {
  const { id } = await params;
  return <RecipeEdit id={id} />;
}
