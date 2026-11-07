import { AccessLevel } from "@/__generated__/graphql";
import { FriendAvatar } from "@/features/friend-avatar";
import { displayName } from "@/lib/people";
import { useMutation, useQuery } from "@apollo/client/react";
import { Button, ComboBox, Input, Label, ListBox } from "@heroui/react";
import { useDeferredValue, useState } from "react";
import { SetPlanGrantDocument } from "./__generated__/management.generated";
import { SearchFriendsDocument } from "./__generated__/searchFriends.generated";
import { LevelSelect } from "./level-select";

/** How many friends each search asks for. */
const SUGGESTION_COUNT = 10;

/** How much of a name or email must be typed before searching. */
const SHORTEST_SEARCH = 2;

const DEFAULT_LEVEL = AccessLevel.CHANGE;

type Chosen = {
  id: string;
  name: string;
};

/** I share a plan with a friend, found by name or email. */
export function GrantAdd({
  planId,
  excludedIds,
  isDisabled,
}: {
  planId: string;
  /** People not to suggest: the owner, and those who already have access. */
  excludedIds: readonly string[];
  isDisabled: boolean;
}) {
  const [input, setInput] = useState("");
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [level, setLevel] = useState(DEFAULT_LEVEL);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [setGrant] = useMutation(SetPlanGrantDocument);
  const query = useDeferredValue(input.trim());
  const tooShort = query.length < SHORTEST_SEARCH;
  const { data, previousData, error } = useQuery(SearchFriendsDocument, {
    variables: { search: { query, first: SUGGESTION_COUNT } },
    // Choosing a friend fills in their name; that needs no new search.
    skip: tooShort || query === chosen?.name,
  });
  // While a search loads, keep showing the last one's friends.
  const shown = error ? undefined : (data ?? previousData);
  const results = shown?.profile.searchFriends.edges ?? [];
  const friends = tooShort
    ? []
    : results
        .map((edge) => edge.node)
        .filter((friend) => !excludedIds.includes(friend.id));

  // Shown in place of suggestions when there are none.
  const emptyStatus = tooShort
    ? "Type at least two letters of a name or email."
    : error
      ? "Couldn’t search friends. Try again."
      : !data
        ? "Searching…"
        : results.length > 0
          ? "Everyone matching already has access."
          : "No matching friends.";

  async function add() {
    if (!chosen || pending || isDisabled) return;
    setPending(true);
    setFailed(null);
    try {
      const result = await setGrant({
        variables: { planId, userId: chosen.id, level },
      });
      if (result.data?.planner.setGrant.id !== planId)
        throw new Error("Missing grant result");
      setChosen(null);
      setInput("");
      setLevel(DEFAULT_LEVEL);
    } catch {
      setFailed(chosen.name);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-sm">
      <ComboBox
        fullWidth
        allowsEmptyCollection
        menuTrigger="input"
        items={friends}
        inputValue={input}
        selectedKey={chosen?.id ?? null}
        isDisabled={isDisabled || pending}
        onInputChange={(value) => {
          setInput(value);
          setFailed(null);
          if (chosen && value !== chosen.name) setChosen(null);
        }}
        onSelectionChange={(key) => {
          const friend = friends.find((it) => it.id === key);
          setChosen(
            friend ? { id: friend.id, name: displayName(friend) } : null,
          );
        }}
      >
        <Label>Add person</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Search friends…" />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox
            renderEmptyState={() => (
              <p className="p-sm text-sm text-muted">{emptyStatus}</p>
            )}
          >
            {(friend: (typeof friends)[number]) => (
              <ListBox.Item id={friend.id} textValue={displayName(friend)}>
                <span className="flex min-w-0 items-center gap-sm">
                  <FriendAvatar friend={friend} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{displayName(friend)}</span>
                    {friend.name ? (
                      <span className="truncate text-xs text-muted">
                        {friend.email}
                      </span>
                    ) : null}
                  </span>
                </span>
              </ListBox.Item>
            )}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      <div className="flex items-center gap-sm">
        <LevelSelect
          label="Access for new person"
          value={level}
          isDisabled={isDisabled || pending}
          onChange={setLevel}
        />
        <Button
          variant="secondary"
          isDisabled={!chosen || isDisabled}
          isPending={pending}
          onPress={() => {
            void add();
          }}
        >
          Add
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="text-xs text-danger">
          Couldn’t add {failed}. Try again.
        </p>
      ) : null}
    </div>
  );
}
