"use client";

import { PlanItemStatus } from "@/__generated__/graphql";
import { CookedItIcon, DeleteIcon } from "@/components/icons";
import { UserAvatar } from "@/features/user-avatar";
import { formatRecentDay } from "@/lib/dates";
import type { FragmentType } from "@apollo/client";
import { useFragment, useSuspenseQuery } from "@apollo/client/react";
import { Button, Skeleton, Spinner, Table } from "@heroui/react";
import { useState, useTransition } from "react";
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
};

/** I list a recipe's most recent cooks, offering to list more. */
export function CookHistoryTable({ recipeId }: CookHistoryTableProps) {
  const [last, setLast] = useState(HISTORY_PAGE_SIZE);
  const [isLoadingMore, startLoadingMore] = useTransition();
  const { data } = useSuspenseQuery(GetCookHistoryDocument, {
    variables: { id: recipeId, last },
  });
  const viewerId = data.profile.me.id;
  const { recordCount, plannedHistory } = data.library.getRecipeById;
  return (
    <div className="flex flex-col items-start gap-sm">
      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label={TABLE_LABEL}
            keyboardNavigationBehavior="tab"
          >
            <Table.Header>
              <Table.Column isRowHeader>Cooked</Table.Column>
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
      </Table>
      {plannedHistory.length < recordCount ? (
        <div className="flex items-center gap-sm">
          <Button
            variant="tertiary"
            isDisabled={isLoadingMore}
            onPress={() =>
              startLoadingMore(() => setLast((n) => n + HISTORY_PAGE_SIZE))
            }
          >
            Load more
          </Button>
          {isLoadingMore ? <Spinner size="sm" /> : null}
        </div>
      ) : null}
    </div>
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
        <span className="flex items-center gap-xs">
          <UserAvatar user={data.owner} size="sm" />
          {cooked ? (
            <CookedItIcon size="small" role="img" aria-label="Cooked" />
          ) : (
            <DeleteIcon size="small" role="img" aria-label="Deleted" />
          )}
          {formatRecentDay(data.doneAt)}
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
