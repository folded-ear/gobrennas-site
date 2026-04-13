"use client";

import { LibrarySearchScope } from "@/__generated__/graphql";
import { Container } from "@/components/container";
import { RecipeFilter } from "@/components/filter";
import { RecipeGrid } from "@/features/recipes/grid";
import { useDeferredValue, useState } from "react";

export function Recipes() {
  const [query, setQuery] = useState("");
  const [includeOthers, setIncludeOthers] = useState(false);
  const deferredQuery = useDeferredValue(query);

  return (
    <Container>
      <h1 className="text-2xl">Recipe Library</h1>
      <div className="flex flex-col gap-lg py-md">
        <RecipeFilter
          query={query}
          onQueryChange={setQuery}
          includeOthers={includeOthers}
          onIncludeOthersChange={setIncludeOthers}
        />
        <RecipeGrid
          query={deferredQuery}
          scope={
            includeOthers
              ? LibrarySearchScope.EVERYONE
              : LibrarySearchScope.MINE
          }
        />
      </div>
    </Container>
  );
}
