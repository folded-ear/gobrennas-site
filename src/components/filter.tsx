"use client";

import { SearchField, Switch } from "@heroui/react";

interface RecipeFilterProps {
  query: string;
  onQueryChange: (query: string) => void;
  includeOthers: boolean;
  onIncludeOthersChange: (includeOthers: boolean) => void;
}

export function RecipeFilter({
  query,
  onQueryChange,
  includeOthers,
  onIncludeOthersChange,
}: RecipeFilterProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex-1">
        <SearchField
          value={query}
          onChange={onQueryChange}
          aria-label="Search recipes"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Search recipes..." />
            <SearchField.ClearButton aria-label="Clear search" />
          </SearchField.Group>
        </SearchField>
      </div>
      <Switch isSelected={includeOthers} onChange={onIncludeOthersChange}>
        <Switch.Content className="text-sm">
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Everyone&apos;s Recipes
        </Switch.Content>
      </Switch>
    </div>
  );
}
