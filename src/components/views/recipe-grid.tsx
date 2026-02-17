"use client";

import { RecipeCard } from "@/components/views/recipe-card";
import { gql, TypedDocumentNode } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Spinner } from "@heroui/react";
import { useMemo } from "react";
import useInfiniteScroll from "react-infinite-scroll-hook";
import {
  GetRecipeGridQuery,
  GetRecipeGridQueryVariables,
} from "./__generated__/recipe-grid.generated";

const GET_RECIPE_GRID: TypedDocumentNode<
  GetRecipeGridQuery,
  GetRecipeGridQueryVariables
> = gql`
  query getRecipeGrid(
    $query: String! = ""
    $scope: LibrarySearchScope! = MINE
    $first: NonNegativeInt! = 12
    $after: Cursor = null
  ) {
    library {
      recipes(first: $first, query: $query, scope: $scope, after: $after) {
        edges {
          cursor
          node {
            id
            ...recipeCard
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export function RecipeGrid() {
  const { data, error, loading, refetch, fetchMore } = useQuery(
    GET_RECIPE_GRID,
    {
      fetchPolicy: "cache-and-network",
      variables: {},
    },
  );

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
      fetchMore({
        variables: {
          after: endCursor,
        },
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
      {hasNextPage || loading ? (
        <div
          className="col-span-full flex justify-center gap-2 my-3"
          ref={infiniteRef}
        >
          <Spinner />
          Loading more ...
        </div>
      ) : (
        <div className="col-span-full flex justify-center">fin.</div>
      )}
    </div>
  );
}
