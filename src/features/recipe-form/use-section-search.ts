"use client";

import { useQuery } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { SearchSectionsDocument } from "./__generated__/searchSections.generated";

/** How long typing must pause before a section search runs. */
export const SECTION_SEARCH_DEBOUNCE_MS = 300;

/** I am a section that can be borrowed: one owned by a recipe. */
export type BorrowableSection = {
  id: string;
  name: string;
  sectionOf: { id: string; name: string };
};

export type SectionSearch = {
  sections: BorrowableSection[];
  /** The text my sections were found by, once any have arrived. */
  query?: string;
  hasMore: boolean;
  isPending: boolean;
  hasError: boolean;
  retry: () => void;
};

/**
 * I search my sections for `input` once typing pauses, starting with it as
 * given. I'm pending from the first keystroke my results don't reflect until
 * they do.
 */
export function useSectionSearch(input: string): SectionSearch {
  const [query, setQuery] = useState(input);
  useEffect(() => {
    if (query === input) return;
    const timer = setTimeout(() => setQuery(input), SECTION_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, query]);
  const result = useQuery(SearchSectionsDocument, {
    variables: { query },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });
  // While a search loads, keep showing the last one's sections.
  const shown = result.error ? undefined : (result.data ?? result.previousData);
  const connection = shown?.library.sections;
  const isPending = input !== query || result.loading;
  return {
    sections: (connection?.edges ?? []).flatMap(({ node }) =>
      node.sectionOf
        ? [
            {
              id: node.id,
              name: node.name,
              sectionOf: { id: node.sectionOf.id, name: node.sectionOf.name },
            },
          ]
        : [],
    ),
    query: result.data ? query : undefined,
    hasMore: connection?.pageInfo.hasNextPage ?? false,
    isPending,
    hasError: !!result.error && !isPending,
    retry: () => {
      void result.refetch().catch(() => {
        /* The search renders the retryable error state. */
      });
    },
  };
}
