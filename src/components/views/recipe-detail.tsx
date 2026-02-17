"use client";

import { RecipePhoto } from "@/components/ui/recipe-photo";
import { UserAvatar } from "@/components/ui/user-avatar";
import { gql, TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Spinner } from "@heroui/react";
import {
  GetRecipeDetailQuery,
  GetRecipeDetailQueryVariables,
} from "./__generated__/recipe-detail.generated";

const GET_RECIPE_DETAIL: TypedDocumentNode<
  GetRecipeDetailQuery,
  GetRecipeDetailQueryVariables
> = gql`
  query getRecipeDetail($id: ID!) {
    library {
      getRecipeById(id: $id) {
        id
        name
        owner {
          id
          ...userAvatar
        }
        photo {
          url
        }
        ...recipePhoto
      }
    }
  }
`;

type RecipeDetailProps = {
  id: string;
};

export function RecipeDetail({ id }: RecipeDetailProps) {
  const { data, loading } = useQuery(GET_RECIPE_DETAIL, {
    variables: { id },
  });

  if (loading)
    return (
      <div className="flex justify-center mt-10">
        <Spinner size="xl" />
      </div>
    );
  if (!data) return "oops";

  const recipe = data.library.getRecipeById;

  return (
    <div className="flex flex-col gap-1">
      <div className="w-full flex gap-1">
        <UserAvatar user={recipe.owner} />
        <h1 className="text-xl">{recipe.name}</h1>
      </div>
      {recipe.photo && (
        <div className="relative min-h-80">
          <RecipePhoto recipe={recipe} loading="eager" />
        </div>
      )}
      <div className="flex flex-col gap-sm">
        {recipe.ingredients.map((ingredient) => (
          <p key={ingredient.raw}>{ingredient.raw}</p>
        ))}
      </div>
    </div>
  );
}
