import { fragmentRegistry } from "@/lib/apollo/fragment-registry";
import { FragmentType, gql, TypedDocumentNode } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import Image, { ImageProps } from "next/image";
import { useMemo } from "react";
import { RecipePhotoFragment } from "./__generated__/recipe-photo.generated";

const RECIPE_PHOTO_FRAGMENT: TypedDocumentNode<RecipePhotoFragment> = gql`
  fragment recipePhoto on Recipe {
    name
    photo {
      url
      focus
    }
  }
`;

fragmentRegistry.register(RECIPE_PHOTO_FRAGMENT);

type RecipePhotoProps = Omit<ImageProps, "alt" | "src"> & {
  recipe: FragmentType<RecipePhotoFragment>;
};

// todo: figure out what those sizes/breakpoints should be. Next rounds up, so
//  they don't have to be perfect, but should eventually be reasonable.

export function RecipePhoto({
  recipe,
  className,
  style = {},
  ...passthrough
}: RecipePhotoProps) {
  const {
    data: { name: alt, photo: data },
    complete,
  } = useFragment({
    fragment: RECIPE_PHOTO_FRAGMENT,
    from: recipe,
  });

  const focus = useMemo(() => {
    let focus = data?.focus;
    if (!focus) return [0.5, 0.5];
    // This cast is safe, as GraphQL ensures the array has well-defined
    // elements. I believe Apollo's DeepPartialObject is incorrectly relaxing
    // the type to BOTH the array may be missing (legit) or that any element of
    // the array may be missing (not legit).
    return [...focus, 0.5, 0.5] as number[];
  }, [data?.focus]);

  if (!complete) return null;

  return (
    <Image
      src={data?.url ?? "/recipe-box.jpg"}
      alt={alt ?? ""}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
      className={"object-cover " + className}
      style={{
        objectPosition: `${100 * focus[0]}% ${100 * focus[1]}%`,
        ...style,
      }}
      {...passthrough}
    />
  );
}
