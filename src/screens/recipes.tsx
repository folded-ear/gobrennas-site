"use client";

import { LibrarySearchScope } from "@/__generated__/graphql";
import { RecipeFilter } from "@/components/filter";
import { SectionHeader } from "@/components/section-header";
import { PlanPicker } from "@/features/plan-picker";
import { usePlanSelection } from "@/features/plan-picker/use-plan-selection";
import { RecipeGrid } from "@/features/recipe-grid";
import { PREF_ACTIVE_PLAN } from "@/lib/preferences";
import { RecipesDocument } from "@/screens/__generated__/recipes.generated";
import { useSuspenseQuery } from "@apollo/client/react";
import { useDeferredValue, useState } from "react";

export function Recipes() {
  const { data } = useSuspenseQuery(RecipesDocument);
  const plans = data.planner.plans;
  const [planIds, setPlanIds] = usePlanSelection(
    PREF_ACTIVE_PLAN,
    plans,
    "single",
  );
  const [query, setQuery] = useState("");
  const [includeOthers, setIncludeOthers] = useState(false);
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <SectionHeader title="Recipe Library">
        <PlanPicker
          label="Plan"
          plans={plans}
          selectionMode="single"
          selectedIds={planIds}
          onChange={setPlanIds}
        />
      </SectionHeader>
      <div className="flex flex-col gap-lg p-md">
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
    </>
  );
}
