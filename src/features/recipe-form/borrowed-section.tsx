"use client";

import { IngredientsAndDirections } from "@/features/recipe-ingredients-and-directions";
import { IngredientsAndDirectionsFragmentDoc } from "@/features/recipe-ingredients-and-directions/__generated__/ingredientsAndDirections.generated";
import { useFragment, useQuery } from "@apollo/client/react";
import { Alert, Button, Spinner } from "@heroui/react";
import { BorrowedSectionFragmentDoc } from "./__generated__/borrowedSection.generated";
import { GetBorrowedSectionDocument } from "./__generated__/getBorrowedSection.generated";

type BorrowedSectionProps = {
  sectionId: string;
  /** The recipe being edited, if any. */
  recipeId?: string;
};

/** I show a borrowed section, read-only, fetching it if it isn't cached. */
export function BorrowedSection({ sectionId, recipeId }: BorrowedSectionProps) {
  const from = { __typename: "Section", id: sectionId };
  const cached = useFragment({
    fragment: BorrowedSectionFragmentDoc,
    fragmentName: "borrowedSection",
    from,
  });
  // Masking hides the spread content from my completeness, so check it too.
  const content = useFragment({
    fragment: IngredientsAndDirectionsFragmentDoc,
    from,
  });
  const isComplete = cached.complete && content.complete;
  const fetched = useQuery(GetBorrowedSectionDocument, {
    variables: { id: sectionId },
    skip: isComplete,
    notifyOnNetworkStatusChange: true,
  });

  if (isComplete) {
    const owner = cached.data.sectionOf;
    return (
      <div className="flex flex-col gap-md">
        <p className="font-medium">
          {cached.data.name}
          {owner ? (
            <span className="ms-xs font-normal text-muted">
              of {owner.id === recipeId ? "this recipe" : owner.name}
            </span>
          ) : null}
        </p>
        <IngredientsAndDirections parent={cached.data} headingLevel={3} />
      </div>
    );
  }
  if (fetched.error && !fetched.loading) {
    return (
      <div className="flex flex-col gap-sm">
        <Alert status="danger">
          <Alert.Content>
            <Alert.Title>Couldn’t load this section</Alert.Title>
            <Alert.Description>
              Try again, or remove it from this recipe.
            </Alert.Description>
          </Alert.Content>
        </Alert>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onPress={() => {
            void fetched.refetch().catch(() => {
              /* The query renders the retryable error state. */
            });
          }}
        >
          Retry
        </Button>
      </div>
    );
  }
  if (fetched.data && !fetched.loading) {
    return (
      <p role="status" className="text-sm text-muted">
        This section is no longer available.
      </p>
    );
  }
  return (
    <p role="status" className="flex items-center gap-sm text-sm text-muted">
      <Spinner aria-hidden="true" size="sm" />
      Loading section…
    </p>
  );
}
