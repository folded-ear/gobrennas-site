"use client";

import { LibrarySearchScope } from "@/__generated__/graphql";
import { RecipeCard } from "@/features/recipes/card";
import { usePreference } from "@/hooks/use-preference";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { useSuspenseQuery } from "@apollo/client/react";
import { Spinner } from "@heroui/react";
import { useMemo, useTransition } from "react";
import useInfiniteScroll from "react-infinite-scroll-hook";
import { GetRecipeGridDocument } from "./__generated__/getRecipeGrid.generated";

interface RecipeGridProps {
  query: string;
  scope: LibrarySearchScope;
}

export function RecipeGrid({ query, scope }: RecipeGridProps) {
  const activePlanId = usePreference(PREF_ACTIVE_PLAN)!;
  const { data, error, fetchMore } = useSuspenseQuery(GetRecipeGridDocument, {
    variables: { query, scope, activePlanId },
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
  );
}
