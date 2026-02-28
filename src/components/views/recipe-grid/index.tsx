"use client";

import { LibrarySearchScope } from "@/__generated__/graphql";
import { RecipeCard } from "@/components/ui/recipe-card";
import { useSuspenseQuery } from "@apollo/client/react";
import { Label, Spinner, Switch } from "@heroui/react";
import { useMemo, useState, useTransition } from "react";
import useInfiniteScroll from "react-infinite-scroll-hook";
import { GetRecipeGridDocument } from "./__generated__/getRecipeGrid.generated";

export function RecipeGrid() {
  const [includeOthers, setIncludeOthers] = useState(false);

  const { data, error, fetchMore } = useSuspenseQuery(GetRecipeGridDocument, {
    variables: {
      scope: includeOthers
        ? LibrarySearchScope.EVERYONE
        : LibrarySearchScope.MINE,
    },
  });
  const [loading, doLoadMore] = useTransition();

  const { recipes, endCursor, hasNextPage } = useMemo(() => {
    const conn = data?.library?.recipes;
    const pageInfo = conn?.pageInfo;
    return {
      recipes: conn?.edges.map((it) => it.node) ?? [],
      endCursor: pageInfo?.endCursor ?? "",
      hasNextPage: !!pageInfo?.hasNextPage,
    };
  }, [data?.library]);

  const [infiniteRef] = useInfiniteScroll({
    loading,
    hasNextPage,
    onLoadMore: () =>
      doLoadMore(() => {
        fetchMore({
          variables: {
            after: endCursor,
          },
        });
      }),
    disabled: Boolean(error),
    // `rootMargin` is passed to `IntersectionObserver`.
    rootMargin: "0px 0px 500px 0px",
  });

  return (
    <>
      <Switch isSelected={includeOthers} onChange={setIncludeOthers}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Label className="text-sm">Include Other&apos;s Recipes</Label>
      </Switch>
      <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-lg">
        {recipes.map((recipe) => (
          <div key={recipe.id}>
            <RecipeCard recipe={recipe} />
          </div>
        ))}
        <div
          className="col-span-full flex justify-center gap-2 my-3"
          ref={hasNextPage ? infiniteRef : undefined}
        >
          {hasNextPage || loading ? (
            <>
              <Spinner />
              Loading more ...
            </>
          ) : (
            "fin."
          )}
        </div>
      </div>
    </>
  );
}
