import { Screen } from "@/components/screen";
import { RecipeCreate } from "@/screens/recipe-create";

export default function RecipeCreateScreen() {
  return (
    <Screen label="Add Recipe">
      <RecipeCreate />
    </Screen>
  );
}
