"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { CookedItIcon, DeleteIcon } from "@/components/icons";
import { UserAvatar } from "@/features/user-avatar";
import { formatRecentDay } from "@/lib/dates";
import type { FragmentType } from "@apollo/client";
import { useFragment, useSuspenseQuery } from "@apollo/client/react";
import { Alert, Button, Skeleton, Spinner, Table } from "@heroui/react";
import { startTransition, useActionState } from "react";
import {
  type CookHistoryRecordFragment,
  CookHistoryRecordFragmentDoc,
} from "./__generated__/cookHistoryRecord.generated";
import { GetCookHistoryDocument } from "./__generated__/getCookHistory.generated";
import { CookNotes } from "./notes";
import { CookRating } from "./rating";

export const HISTORY_PAGE_SIZE = 10;

const TABLE_LABEL = "Cook history";
const SKELETON_ROWS = 3;

type CookHistoryTableProps = {
  recipeId: string;
  /** Which try at loading the cooks this is; each new one asks afresh. */
  attempt?: number;
};

/** I list a recipe's most recent cooks, offering to list more. */
export function CookHistoryTable({
  recipeId,
  attempt = 0,
}: CookHistoryTableProps) {
  const { data, fetchMore } = useSuspenseQuery(GetCookHistoryDocument, {
    variables: { id: recipeId, last: HISTORY_PAGE_SIZE },
    queryKey: [attempt],
  });
  const viewerId = data.profile.me.id;
  const { recordCount, plannedHistory } = data.library.getRecipeById;

  const [loadMoreFailed, loadMore, isLoadingMore] = useActionState(async () => {
    try {
      const { error } = await fetchMore({
        variables: { last: plannedHistory.length + HISTORY_PAGE_SIZE },
        updateQuery: (_, { fetchMoreResult }) => fetchMoreResult,
        // So a failure comes back here, rather than failing the table.
        errorPolicy: "all",
      });
      return Boolean(error);
    } catch {
      return true;
    }
  }, false);

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content
          aria-label={TABLE_LABEL}
          keyboardNavigationBehavior="tab"
        >
          <Table.Header>
            <Table.Column isRowHeader>Whom/When</Table.Column>
            <Table.Column>Rating</Table.Column>
            <Table.Column>Notes</Table.Column>
          </Table.Header>
          <Table.Body>
            {plannedHistory.map((record) => (
              <CookHistoryRow
                key={record.id}
                record={record}
                recipeId={recipeId}
                viewerId={viewerId}
              />
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      {plannedHistory.length < recordCount ? (
        <Table.Footer className="flex flex-col items-start gap-sm">
          {loadMoreFailed && !isLoadingMore ? (
            <Alert status="danger" role="alert">
              <Alert.Content>
                <Alert.Title>Couldn’t load more cooks</Alert.Title>
              </Alert.Content>
            </Alert>
          ) : null}
          <div className="flex items-center gap-sm">
            <Button
              variant="tertiary"
              isDisabled={isLoadingMore}
              onPress={() => startTransition(loadMore)}
            >
              Load more
            </Button>
            {isLoadingMore ? <Spinner size="sm" /> : null}
          </div>
        </Table.Footer>
      ) : null}
    </Table>
  );
}

type CookHistoryRowProps = {
  record: FragmentType<CookHistoryRecordFragment>;
  recipeId: string;
  viewerId: string;
};

function CookHistoryRow({ record, recipeId, viewerId }: CookHistoryRowProps) {
  const { data, complete } = useFragment({
    fragment: CookHistoryRecordFragmentDoc,
    fragmentName: "cookHistoryRecord",
    from: record,
  });
  if (!complete) return null;
  const editable = data.owner.id === viewerId;
  const cooked = data.status === PlanItemStatus.COMPLETED;
  return (
    <Table.Row id={data.id}>
      <Table.Cell>
        <span className="flex items-center gap-sm">
          <UserAvatar user={data.owner} size="sm" />
          {formatRecentDay(data.doneAt)}
          {cooked ? (
            <CookedItIcon
              size="small"
              role="img"
              aria-label="Cooked"
              className="text-status-completed"
            />
          ) : (
            <DeleteIcon
              size="small"
              role="img"
              aria-label="Deleted"
              className="text-accent-soft"
            />
          )}
        </span>
      </Table.Cell>
      <Table.Cell>
        <CookRating record={data} recipeId={recipeId} editable={editable} />
      </Table.Cell>
      <Table.Cell>
        <CookNotes record={data} recipeId={recipeId} editable={editable} />
      </Table.Cell>
    </Table.Row>
  );
}

/** I hold the cook history table's place while it loads. */
export function CookHistoryTableSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading cook history"
      className="flex flex-col gap-sm"
    >
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded-sm" />
      ))}
    </div>
  );
}
