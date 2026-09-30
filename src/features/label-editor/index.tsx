"use client";

import {
  Autocomplete,
  Button,
  Description,
  Label,
  ListBox,
  SearchField,
  Tag,
  TagGroup,
} from "@heroui/react";
import { useRef, useState } from "react";
import { labelKey, normalizeLabel, normalizeLabels } from "./labels";

export type LabelSuggestions = {
  labels: readonly string[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
};

type LabelEditorProps = {
  value: string[];
  onChange: (labels: string[]) => void;
  onEdit?: () => void;
  isDisabled?: boolean;
  suggestions?: LabelSuggestions;
};

export function LabelEditor({
  value,
  onChange,
  onEdit,
  isDisabled = false,
  suggestions,
}: LabelEditorProps) {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const candidate = normalizeLabel(input);
  const candidateKey = labelKey(candidate);
  const available = normalizeLabels([...(suggestions?.labels ?? []), ...value]);
  const selectedKeys = value.map((label) => `label:${labelKey(label)}`);
  const isDuplicate = value.some((label) => labelKey(label) === candidateKey);
  const existing = available.find((label) => labelKey(label) === candidateKey);
  const hasMatches = available.some((label) =>
    labelKey(label).includes(candidateKey),
  );
  const options = available.map((name) => ({
    id: `label:${labelKey(name)}`,
    name,
    isNew: false,
  }));
  if (candidate && !existing) {
    options.push({
      id: `create:${candidateKey}`,
      name: candidate,
      isNew: true,
    });
  }

  function changeLabels(labels: string[]): void {
    if (isDisabled) return;
    onChange(labels);
    onEdit?.();
  }

  const status = isDuplicate
    ? `“${candidate}” is already added.`
    : suggestions?.isLoading
      ? "Loading label suggestions… You can still add a label."
      : suggestions?.hasError
        ? "Couldn’t load label suggestions. You can still add a label."
        : candidate && !hasMatches
          ? "No matching labels. Create this label below."
          : available.length === 0
            ? "No labels yet. Type a name to create one."
            : "Choose existing labels or type a new one.";

  return (
    <Autocomplete
      allowsEmptyCollection
      fullWidth
      placeholder="Select labels"
      selectionMode="multiple"
      value={selectedKeys}
      isDisabled={isDisabled}
      isOpen={isOpen && !isDisabled}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setInput("");
      }}
      onChange={(keys) => {
        changeLabels(
          keys.flatMap((key) => {
            const option = options.find((option) => option.id === key);
            return option ? [option.name] : [];
          }),
        );
        setInput("");
      }}
    >
      <Label>Recipe labels</Label>
      <Autocomplete.Trigger ref={triggerRef} tabIndex={-1}>
        <Autocomplete.Value>
          {({ defaultChildren }) =>
            value.length === 0 ? (
              defaultChildren
            ) : (
              <TagGroup
                aria-label="Added recipe labels"
                onClick={(event) => event.stopPropagation()}
                size="sm"
                disabledKeys={isDisabled ? value.map(labelKey) : []}
                onRemove={(keys) => {
                  changeLabels(
                    value.filter((label) => !keys.has(labelKey(label))),
                  );
                  if (value.length === keys.size) triggerRef.current?.focus();
                }}
              >
                <TagGroup.List>
                  {value.map((label) => (
                    <Tag
                      key={labelKey(label)}
                      id={labelKey(label)}
                      textValue={label}
                    >
                      {label}
                    </Tag>
                  ))}
                </TagGroup.List>
              </TagGroup>
            )
          }
        </Autocomplete.Value>
        <Autocomplete.ClearButton
          aria-label="Clear recipe labels"
          tabIndex={value.length > 0 ? 0 : -1}
          onClick={() => triggerRef.current?.focus()}
        />
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Description>
        Select labels or create your own. Slashes become hyphens.
      </Description>
      {!isOpen ? (
        <p role="status" className="text-sm text-muted">
          {status}
        </p>
      ) : null}
      {!isOpen && suggestions?.hasError && !suggestions.isLoading ? (
        <Button
          slot={null}
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          isDisabled={isDisabled}
          onPress={suggestions.onRetry}
        >
          Retry label suggestions
        </Button>
      ) : null}
      <Autocomplete.Popover>
        <Autocomplete.Filter
          disableAutoFocusFirst
          inputValue={input}
          onInputChange={(text) => {
            setInput(text);
            onEdit?.();
          }}
          filter={(text, query) => labelKey(text).includes(labelKey(query))}
        >
          <SearchField
            autoFocus
            aria-label="Search recipe labels"
            variant="secondary"
            isDisabled={isDisabled}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder="Find or create a label"
                onKeyDownCapture={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "Enter") event.preventDefault();
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsOpen(false);
                    setInput("");
                  }
                }}
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            items={options}
            renderEmptyState={() => (
              <p className="p-sm text-sm text-muted">
                No suggestions to select.
              </p>
            )}
          >
            {(option) => (
              <ListBox.Item id={option.id} textValue={option.name}>
                {option.isNew ? `Create “${option.name}”` : option.name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Autocomplete.Filter>
        <div className="flex flex-col gap-sm p-sm">
          <p role="status" className="text-sm text-muted">
            {status}
          </p>
          {suggestions?.hasError && !suggestions.isLoading ? (
            <Button
              slot={null}
              type="button"
              variant="secondary"
              size="sm"
              isDisabled={isDisabled}
              onPress={suggestions.onRetry}
            >
              Retry label suggestions
            </Button>
          ) : null}
        </div>
      </Autocomplete.Popover>
    </Autocomplete>
  );
}
