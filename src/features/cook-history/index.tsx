"use client";

import type { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Button, Disclosure } from "@heroui/react";
import { Suspense, useState } from "react";
import {
  type CookHistorySummaryFragment,
  CookHistorySummaryFragmentDoc,
} from "./__generated__/cookHistorySummary.generated";
import { formatCookSummary } from "./summary";
import { CookHistoryTable, CookHistoryTableSkeleton } from "./table";

type CookHistoryProps = {
  recipe: FragmentType<CookHistorySummaryFragment>;
};

/**
 * I summarize how often a recipe has been cooked, and list its cooks when
 * opened. A recipe never cooked shows nothing.
 */
export function CookHistory({ recipe }: CookHistoryProps) {
  const { data, complete } = useFragment({
    fragment: CookHistorySummaryFragmentDoc,
    fragmentName: "cookHistorySummary",
    from: recipe,
  });
  const [opened, setOpened] = useState(false);
  if (!complete) return null;
  const last = data.lastCook[0];
  if (data.cookCount === 0 || last === undefined) return null;
  return (
    <Disclosure onExpandedChange={(expanded) => expanded && setOpened(true)}>
      <Disclosure.Heading>
        <Button slot="trigger" variant="tertiary" className="px-sm">
          {formatCookSummary(data.cookCount, last.doneAt)}
          <Disclosure.Indicator />
        </Button>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body className="pt-sm">
          {opened ? (
            <Suspense fallback={<CookHistoryTableSkeleton />}>
              <CookHistoryTable recipeId={data.id} />
            </Suspense>
          ) : null}
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
