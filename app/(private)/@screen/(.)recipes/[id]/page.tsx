import { RecipeDetail } from "@/features/recipe-detail";

type PageProps = { params: Promise<{ id: string }> };

export default async function RecipeScreen({ params }: PageProps) {
  const { id } = await params;
  return <RecipeDetail id={id} inScreen />;
}
