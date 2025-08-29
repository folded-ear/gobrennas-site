import { GetSearchLibraryQuery } from "@/__graphql/graphql";
import RecipeGrid from "@/components/views/recipe-grid";

export default function Recipes({
  recipes,
}: {
  recipes: GetSearchLibraryQuery["library"]["recipes"]["edges"][0]["node"][];
}) {
  return (
    <div>
      <RecipeGrid recipes={recipes} />
    </div>
  );
}
