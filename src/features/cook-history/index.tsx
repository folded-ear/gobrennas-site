"use client";

import type { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Alert, Button, Disclosure } from "@heroui/react";
import { Suspense, useState } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
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
  const [attempt, setAttempt] = useState(0);
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
            <ErrorBoundary
              FallbackComponent={CookHistoryFailed}
              onReset={() => setAttempt((n) => n + 1)}
            >
              <Suspense fallback={<CookHistoryTableSkeleton />}>
                <CookHistoryTable recipeId={data.id} attempt={attempt} />
              </Suspense>
            </ErrorBoundary>
          ) : null}
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}

function CookHistoryFailed({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-start gap-sm">
      <Alert status="danger" role="alert">
        <Alert.Content>
          <Alert.Title>Couldn’t load the cook history</Alert.Title>
        </Alert.Content>
      </Alert>
      <Button variant="secondary" onPress={resetErrorBoundary}>
        Retry
      </Button>
    </div>
  );
}
