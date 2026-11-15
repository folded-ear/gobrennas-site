"use client";

import { AddIcon, MenuOpenIcon } from "@/components/icons";
import {
  Alert,
  Autocomplete,
  Button,
  buttonGroupVariants,
  Dropdown,
  Label,
  ListBox,
  Popover,
  SearchField,
  Spinner,
} from "@heroui/react";
import { useEffect, useRef, useState, type Ref } from "react";
import { useSectionSearch, type BorrowableSection } from "./use-section-search";

const BLANK = "blank";
const LIBRARY = "library";

type AddSectionButtonProps = {
  ref?: Ref<HTMLButtonElement>;
  isDisabled: boolean;
  onAddBlank: () => void;
  onBorrow: (section: BorrowableSection) => void;
};

/**
 * I add a section: a blank one from my main part, or, from my menu, one
 * borrowed from the library.
 */
export function AddSectionButton({
  ref,
  isDisabled,
  onAddBlank,
  onBorrow,
}: AddSectionButtonProps) {
  const group = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [hasOpenedPicker, setHasOpenedPicker] = useState(false);
  useEffect(() => {
    // The picker opened from a menu item that's gone, so it can't restore focus.
    if (hasOpenedPicker && !isBorrowing) menuTrigger.current?.focus();
  }, [hasOpenedPicker, isBorrowing]);
  return (
    <>
      <div
        ref={group}
        role="group"
        aria-label="Add a section"
        className={buttonGroupVariants({ orientation: "horizontal" }).base({
          className: "self-start",
        })}
      >
        <Button
          ref={ref}
          type="button"
          variant="secondary"
          isDisabled={isDisabled}
          onPress={onAddBlank}
        >
          <AddIcon aria-hidden size="small" /> Add section
        </Button>
        <Dropdown>
          <Button
            ref={menuTrigger}
            isIconOnly
            type="button"
            variant="secondary"
            isDisabled={isDisabled}
            aria-label="More ways to add a section"
          >
            <MenuOpenIcon aria-hidden size="small" />
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu
              onAction={(key) => {
                if (key === BLANK) onAddBlank();
                if (key !== LIBRARY) return;
                setIsBorrowing(true);
                setHasOpenedPicker(true);
              }}
            >
              <Dropdown.Item id={BLANK} textValue="New Blank Section">
                <Label>New Blank Section</Label>
              </Dropdown.Item>
              <Dropdown.Item id={LIBRARY} textValue="Add From Library">
                <Label>Add From Library</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
      <Popover isOpen={isBorrowing} onOpenChange={setIsBorrowing}>
        <Popover.Content triggerRef={group} placement="bottom start">
          <Popover.Dialog aria-label="Borrow a section">
            <SectionPicker
              onPick={(section) => {
                setIsBorrowing(false);
                onBorrow(section);
              }}
            />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </>
  );
}

function SectionPicker({
  onPick,
}: {
  onPick: (section: BorrowableSection) => void;
}) {
  const [input, setInput] = useState("");
  const search = useSectionSearch(input);
  const empty =
    search.query === undefined
      ? null
      : search.query
        ? `No sections match “${search.query}”.`
        : "You have no sections to borrow yet.";
  return (
    <div className="flex w-80 max-w-full flex-col gap-sm">
      <Autocomplete.Filter
        disableAutoFocusFirst
        inputValue={input}
        onInputChange={setInput}
      >
        <SearchField autoFocus aria-label="Search sections" variant="secondary">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search sections" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <ListBox
          aria-label="Sections"
          items={search.sections}
          onAction={(key) => {
            const section = search.sections.find((it) => it.id === key);
            if (section) onPick(section);
          }}
          renderEmptyState={() =>
            empty && !search.isPending && !search.hasError ? (
              <p className="p-sm text-sm text-muted">{empty}</p>
            ) : null
          }
        >
          {(section) => (
            <ListBox.Item
              id={section.id}
              textValue={`${section.name} (of ${section.sectionOf.name})`}
            >
              {section.name}{" "}
              <span className="text-muted">(of {section.sectionOf.name})</span>
            </ListBox.Item>
          )}
        </ListBox>
      </Autocomplete.Filter>
      <div role="status" className="text-sm text-muted">
        {search.isPending ? (
          <span className="flex items-center gap-sm">
            <Spinner aria-hidden="true" size="sm" />
            Searching…
          </span>
        ) : search.hasMore ? (
          "More sections match. Keep typing to narrow the list."
        ) : null}
      </div>
      {search.hasError ? (
        <>
          <Alert status="danger">
            <Alert.Content>
              <Alert.Title>Couldn’t search sections</Alert.Title>
              <Alert.Description>Try again.</Alert.Description>
            </Alert.Content>
          </Alert>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onPress={search.retry}
          >
            Retry
          </Button>
        </>
      ) : null}
    </div>
  );
}
